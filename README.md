# Shared modules for Melinda's software
[![NPM Version](https://img.shields.io/npm/v/@natlibfi/melinda-commons.svg)](https://npmjs.org/package/@natlibfi/melinda-commons)

Shared modules for Melinda's software. Written in TypeScript, built with `tsc` (declarations and source maps are published), and tested with `node:test` on Node.js >= 24.

Since v16 this package is the canonical home for the shared modules formerly split between `@natlibfi/melinda-commons` (MARC helpers, SRU subrecord picker) and `@natlibfi/melinda-backend-commons` (env, logging, crypto, webhook). The latter is deprecated: all of its exports moved here with identical signatures.

## Install

```
npm i @natlibfi/melinda-commons
```

## MARC record helpers

| Function | Description |
|----------|-------------|
| `generateAuthorizationHeader(username, password?)` | Basic auth header |
| `isDeletedRecord(record)` | LDR/05 d/s/x or DEL/STA `a` subfield values |
| `isTestRecord(record, checkNotesInf500?)` | STA `a` = TEST or f500 "test record"/"testitietue" |
| `isComponentRecord(record, ignoreCollections?, additionalHostTags?)` | Bibliographic level a/b/d in LDR/07 and/or host link fields (773 + custom, e.g. 973) |
| `getRecordTitle(record)` | Trimmed 245$a |
| `getRecordStandardIdentifiers(record)` | 020/022/024 a/z values |
| `parseBoolean(value?)` | Lenient env-style boolean parsing |
| `clone(o)` | Deep clone via JSON |
| `toAlephId(id)` / `fromAlephId(id)` | Aleph 9-digit id padding |

## SRU subrecord picker

`createSubrecordPicker(sruUrl?, retrieveAll?, monoHostComponentsOnly?)` returns an object with `readSubrecordAmount(recordId)`, `readSomeSubrecords(recordId, offset?)` and `readAllSubrecords(recordId)`, resolving to `{records: MarcRecord[], amount}` (and `nextRecordOffset` for `readSomeSubrecords`). Uses `@natlibfi/sru-client` with MARCXML.

## Environment, logging, crypto, webhook

| Function | Description |
|----------|-------------|
| `readEnvironmentVariable(name, {defaultValue, hideDefault, format}?)` | Mandatory/default env access with optional formatting |
| `createLogger(options?)` | winston logger honoring `LOG_LEVEL` (quiet in `NODE_ENV=test` unless debug) |
| `createExpressLogger({dateFormat?, responseTimeDigits?})` | morgan format for Express |
| `handleInterrupt(arg)` | Log uncaught exceptions / shutdown signals and exit |
| `generateEncryptionKey(mockBytes?)` | 32 random bytes as hex (or hex of given bytes) |
| `encryptString({key, value}, mockIv?)` | AES-256-GCM, base64 output (iv + ciphertext + auth tag) |
| `decryptString({key, value})` | Reverse of `encryptString` |
| `logWait(logger, waitTime)` | Verbose/debug/silly progress logging by wait duration |
| `joinObjects(obj, objectToBeJoined, arrayOfKeysWanted?)` | Merge non-undefined keys |
| `createWebhookOperator(WEBHOOK_URL)` | `{sendNotification(bodyData, options)}` posting to an https Slack-style webhook; `'test'` returns a mock |
| `millisecondsToString(t)` | Human-readable duration |

See [`example.env`](example.env) for the environment variables these functions read (`DEBUG`, `LOG_LEVEL`, `JWT_KEY`).

## CLI binaries

- `gen-jwt-token <id>` — prints an HS256 JWT signed with the `JWT_KEY` env variable
- `gen-encryption-key` — prints a fresh AES-256 key (hex)

Both are available via `npx` after installing the package.

## Error

`Error` (default export of `src/error.ts`, re-exported as `Error`) carries `status` (number) and `payload` (string).

## Notes

- Importing the package sets `MarcRecord.setValidationOptions({subfieldValues: false})` globally on `@natlibfi/marc-record` (Aleph creates partial subfields).
- Mail functionality is **not** included in this package. It lives in [`@natlibfi/melinda-commons-mailer`](https://github.com/NatLibFi/melinda-mailer-js).
- Consumers migrating from `@natlibfi/melinda-backend-commons`: change only the package specifier to `@natlibfi/melinda-commons` and bump; function names, signatures, and behavior are unchanged.

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
