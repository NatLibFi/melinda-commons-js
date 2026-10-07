# Shared modules for Melinda's software
[![NPM Version](https://img.shields.io/npm/v/@natlibfi/melinda-commons.svg)](https://npmjs.org/package/@natlibfi/melinda-commons)

Shared modules for Melinda's software. Written in TypeScript, built with `tsc` (declarations and source maps are published), and tested with `node:test` on Node.js >= 24.

Since v16 this package is the canonical home for the shared modules formerly split between `@natlibfi/melinda-commons` (MARC helpers, SRU subrecord picker) and `@natlibfi/melinda-backend-commons` (env, logging, crypto, webhook). The latter is deprecated: all of its exports moved here with identical signatures.

## Install

```
npm i @natlibfi/melinda-commons
```

See [`example.env`](example.env) for the environment variables used by this package: `DEBUG` and `LOG_LEVEL` (read by `createLogger` / the `debug` package) and `JWT_KEY` (read only by the `gen-jwt-token` CLI).

## MARC record helpers

| Function | Description |
|----------|-------------|
| `isDeletedRecord(record)` | LDR/05 d/s/x or DEL/STA `a` subfield values |
| `isTestRecord(record, checkNotesInf500?)` | STA `a` = TEST or f500 "test record"/"testitietue" |
| `isComponentRecord(record, ignoreCollections?, additionalHostTags?)` | Bibliographic level a/b/d in LDR/07 and/or host link fields (773 + custom, e.g. 973) |
| `getRecordTitle(record)` | Trimmed 245$a |
| `getRecordStandardIdentifiers(record)` | 020/022/024 a/z values |

## Melinda helpers

| Function | Description |
|----------|-------------|
| `toAlephId(id)` / `fromAlephId(id)` | Aleph 9-digit id padding |

## General utility helpers

| Function | Description |
|----------|-------------|
| `generateAuthorizationHeader(username, password?)` | Basic auth header |
| `parseBoolean(value?)` | Lenient env-style boolean parsing |
| `clone(o)` | Deep clone via JSON |
| `joinObjects(obj, objectToBeJoined, arrayOfKeysWanted?)` | Merge non-undefined keys |
| `millisecondsToString(t)` | Human-readable duration |

## Environment, logging, crypto

| Function | Description |
|----------|-------------|
| `readEnvironmentVariable(name, {defaultValue, hideDefault, format}?)` | Mandatory/default env access with optional formatting |
| `createLogger(options?)` | winston logger honoring `LOG_LEVEL` (quiet in `NODE_ENV=test` unless debug) |
| `createExpressLogger(options?)` | express-winston logger for Express; options are spread over the defaults, so `msg` (custom log format / user-id injection) can be overridden |
| `logWait(logger, waitTime)` | Verbose/debug/silly progress logging by wait duration |
| `handleInterrupt(arg)` | Log uncaught exceptions / shutdown signals and exit |
| `generateEncryptionKey(mockBytes?)` | 32 random bytes as hex (or hex of given bytes) |
| `encryptString({key, value}, mockIv?)` | AES-256-GCM, base64 output (iv + ciphertext + auth tag) |
| `decryptString({key, value}, {legacyCtrFallback}?)` | Reverse of `encryptString`; also reads legacy AES-256-CTR values (see below) |
| `decryptLegacyCtrString({key, value})` | Standalone legacy AES-256-CTR decoder (old `@natlibfi/melinda-backend-commons` layout: base64 of iv + ciphertext) |
| `encryptedValueFormat(value)` | Length-based classifier of a stored value: `'invalid-base64'` / `'too-short'` / `'legacy-ctr'` / `'gcm-or-legacy-ambiguous'` (inventory helper; never claims GCM) |

### Legacy AES-256-CTR fallback (temporary)

Since v16, `encryptString`/`decryptString` use **AES-256-GCM** (base64 layout `iv(16) ‖ ciphertext ‖ authTag(16)`). Values persisted by `@natlibfi/melinda-backend-commons` ≤ 3.0.6 were **AES-256-CTR** (base64 layout `iv(16) ‖ ciphertext`). To let consumers bump the dependency before migrating stored values, `decryptString` reads legacy CTR values automatically:

- Values with **17–32** decoded bytes are provably legacy CTR (GCM needs ≥ 33) → decoded as CTR.
- Values with **≥ 33** decoded bytes are ambiguous → GCM is tried first; only if the auth tag fails is CTR tried. This fallback path emits a **one-time `console.warn`** per process with the stable prefix `decryptString: legacy AES-256-CTR` (usable for log alerting / cleanup tracking).
- The fallback is **enabled by default** and can be disabled with `{legacyCtrFallback: false}` (legacy CTR values then throw, with a hint).

> **Warning:** this fallback is **temporary** — it will be removed in **17.0.0** after stored values have been re-encrypted. While enabled, it also means a genuinely corrupted/tampered GCM value on the ambiguous path is returned as CTR garbage instead of throwing.

**Migration (re-encrypt stored values):**

```js
import {decryptLegacyCtrString, encryptString, encryptedValueFormat} from '@natlibfi/melinda-commons';
// dry run:  values.forEach(v => console.log(encryptedValueFormat(v), v.slice(0, 8) + '…'));
// migrate:  const old = decryptLegacyCtrString({key, value: stored});
//           writeBack(encryptString({key, value: old}));   // idempotent: run after a full pass
```

No need to pin the old package anywhere. The one-time warn in prod logs doubles as the "any legacy values left?" indicator.

## Webhook notifications

`createWebhookOperator(WEBHOOK_URL)` returns `{sendNotification(bodyData, options)}`, which posts a JSON payload to an https Slack-style webhook.

- `WEBHOOK_URL` is passed as an argument (not read from the environment) and must use `https` — a non-`https` URL throws when the operator is created.
- `options.template` selects the payload shape: `'basic'` (default; body `{text: …}` — `bodyData` may be a plain string or an object with a `text` property) or `'blob'` (a record-import summary with `profile`, `numberOfRecords`, `created`, `updated`, `skipped`, `error`, … plus optional `options.environment` and `options.linkUrl`).
- Passing `'test'` as the URL returns a mock that logs and resolves without any network call (handy for tests).

> **Note:** `sendNotification` **does not throw on send failure** — it catches network/HTTP errors and returns `false` (a successful send returns `true`). Check the return value; a `try/catch` around it will not see a failed request.

## CLI binaries

- `gen-jwt-token <id>` — prints an HS256 JWT signed with the `JWT_KEY` env variable
- `gen-encryption-key` — prints a fresh AES-256 key (hex)

Both are available via `npx` after installing the package.

## Error

`Error` (default export of `src/error.ts`, re-exported as `Error`) carries `status` (number), `payload` (arbitrary value, typed `unknown` — it is data, not necessarily a message), and `params` (`unknown[]` of any extra constructor arguments). `message` is intentionally empty; read `status`/`payload` for details.

## SRU subrecord picker

In Melinda, a record can have **linked component records** — for example, the songs on a CD (monograph host → components) or the articles in a journal (non-monograph host → components) — stored as separate records and connected via host/part index fields. This picker fetches those components over SRU, so you never have to parse the host/part link fields (e.g. `773`) and issue follow-up lookups yourself.

```js
import {createSubrecordPicker} from '@natlibfi/melinda-commons';

const picker = createSubrecordPicker('https://sru.example.com/sru');

// How many components does this record have?
const {amount} = await picker.readSubrecordAmount('000012345');

// All of them, as MARC records
const {records, amount} = await picker.readAllSubrecords('000012345');

// A page of them (for UI paging / lazy loading)
const {records, amount, nextRecordOffset} = await picker.readSomeSubrecords('000012345', 11);
// nextRecordOffset is the startRecord for the next page (absent when done)
```

| Method | Returns | When to use it |
|--------|---------|----------------|
| `readSubrecordAmount(recordId)` | `{amount}` | Just showing a count ("12 songs") without fetching records |
| `readAllSubrecords(recordId)` | `{records, amount}` | You need every component at once (background jobs, exports) |
| `readSomeSubrecords(recordId, offset = 1)` | `{records, amount, nextRecordOffset}` | Paging: fetch a slice and use `nextRecordOffset` as the next `offset` |

> **Warning:** non-monograph hosts (e.g. a journal) can have a **very large number of component records** — a journal may have hundreds or thousands of article records accumulated over its publication history. Avoid `readAllSubrecords` for such hosts in request-handling code; check `amount` first (via `readSubrecordAmount`) and prefer `readSomeSubrecords` paging for anything user-facing.

Notes:

- `recordId` is the **host record's** Melinda id; components are resolved through the SRU index field `melinda.partsofhost` (or `melinda.partsofmonohost` when `monoHostComponentsOnly` is `true`).
- `records` are ready-to-use `MarcRecord` objects from `@natlibfi/marc-record` (parsed from MARCXML).
- Constructor options: `sruUrl` (required at runtime — omitting it throws an `Error` with `status: 400`), `retrieveAll` (default `false`), `monoHostComponentsOnly` (default `false`).
- With `retrieveAll: true`, `readSomeSubrecords` throws (it needs a single-page response to compute `nextRecordOffset`) — use `readAllSubrecords` for fetching everything, or create the picker without `retrieveAll` for paging.
- Under the hood it uses `@natlibfi/sru-client`; `amount` always reflects the server-reported total, so `records.length < amount` is expected for `readSomeSubrecords`.

## Notes

- Importing the package sets `MarcRecord.setValidationOptions({subfieldValues: false})` globally on `@natlibfi/marc-record` (Aleph creates partial subfields).
- Mail functionality is **not** included in this package. It lives in [`@natlibfi/melinda-commons-mailer`](https://github.com/NatLibFi/melinda-mailer-js).
- Consumers migrating from `@natlibfi/melinda-backend-commons`: change only the package specifier to `@natlibfi/melinda-commons` and bump. Function names and signatures are unchanged, **except the encryption algorithm moved from AES-256-CTR to AES-256-GCM** — new writes are GCM, and `decryptString` transparently reads legacy CTR values (see [Legacy AES-256-CTR fallback](#legacy-aes-256-ctr-fallback-temporary)). Re-encrypt stored values with the script above; the CTR fallback is removed in 17.0.0.

## Development

```
npm i
npm test            # lint + full test suites with coverage
npm run dev         # watch mode tests
npm run build       # tsc -> dist/
```

## License and copyright

Copyright (c) 2018-2026 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **MIT** or any later version.
