import expressWinston from 'express-winston';
import winston from 'winston';
import moment from 'moment';

import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';

import createDebugLogger from 'debug';
import {millisecondsToString} from './millisecondsToString.ts';

import {generateBasicNotification, generateBlobNotification} from './notificationTemplates.ts';

interface readEnvironmentVariableOptions {
  defaultValue?: string | boolean | number | any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  hideDefault?: boolean | number,
  format?: (arg: any) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function readEnvironmentVariable(name: string, {defaultValue = undefined, hideDefault = false, format = v => v}: readEnvironmentVariableOptions = {}) {
  if (process.env[name] === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Mandatory environment variable missing: ${name}`);
    }

    if (typeof defaultValue === 'boolean') {
      return Boolean(defaultValue);
    }

    const defaultValuePrintable = typeof defaultValue === 'object' ? JSON.stringify(defaultValue) : defaultValue;

    console.error(`No environment variable set for ${name}, using default value: ${hideDefault ? '[hidden]' : defaultValuePrintable}`); // eslint-disable-line no-console
    return defaultValue;
  }

  return format(process.env[name]);
}

export function createLogger(options = {}) {
  return winston.createLogger({...createLoggerOptions(), ...options});
}

function createLoggerOptions() {
  const logLevel = process.env['LOG_LEVEL'] || 'info';
  const debuggingEnabled = logLevel === 'debug';
  const timestamp = winston.format(info => ({...info, timestamp: moment().format()}));

  return {
    // @ts-expect-error format message is wrong type but works
    format: winston.format.combine(timestamp(), winston.format.printf(formatMessage)),
    transports: [
      new winston.transports.Console({
        level: logLevel,
        silent: process.env['NODE_ENV'] === 'test' && !debuggingEnabled
      })
    ]
  };

  function formatMessage({timestamp, level, message}): string {
    return `${timestamp} - ${level}: ${message}`;
  }
}

export function createExpressLogger(options = {}) {
  return expressWinston.logger({
    meta: true,
    msg: '{{req.ip}} HTTP {{req.method}} {{req.path}} - {{res.statusCode}} {{res.responseTime}}ms',
    ignoreRoute: () => false,
    ...createLoggerOptions(),
    ...options
  });
}

export function handleInterrupt(arg) {
  if (arg instanceof Error) {
    console.error(`Uncaught Exception: ${arg.stack}`); // eslint-disable-line no-console
    process.exit(1);
  }

  console.log(`Received ${arg}`); // eslint-disable-line no-console
  process.exit(1);
}

type mockBytes = Buffer | false

export function generateEncryptionKey(mockBytes: mockBytes = false) {
  return !mockBytes ? randomBytes(32).toString('hex') : mockBytes.toString('hex');
}

export function encryptString({key, value}: {key: string; value: string}, mockIv?: Buffer) {
  const iv = mockIv ?? randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const encrypted = cipher.update(value, 'utf8');
  cipher.final(); // on aes-256-gmc returns empty buffer and tag needs to be asked after
  return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString('base64');
}

// 16-byte IV + at least 1 byte of ciphertext + 16-byte GCM auth tag
const MIN_ENCRYPTED_VALUE_LENGTH = 33;
// 16-byte IV + at least 1 byte of ciphertext (AES-256-CTR layout from @natlibfi/melinda-backend-commons ≤ 3.0.6)
const MIN_LEGACY_CTR_VALUE_LENGTH = 17;

const STRICT_BASE64 = /^[A-Za-z0-9+/]*={0,2}$/u;

// Node's base64 decoder never throws (it silently drops invalid characters),
// so invalid input is detected with a strict check. Whitespace padding is
// tolerated (stored values often come from files/env with trailing newlines).
function decodeBase64Strict(value: string): Buffer | false {
  const trimmed = value.trim();
  if (trimmed === '') {
    return Buffer.alloc(0);
  }

  if (trimmed.length % 4 !== 0 || !STRICT_BASE64.test(trimmed)) {
    return false;
  }

  return Buffer.from(trimmed, 'base64');
}
interface decryptStringOptions {
  // TEMPORARY (removed in 17.0.0): fall back to legacy AES-256-CTR for values
  // written by @natlibfi/melinda-backend-commons ≤ 3.0.6 before they are re-encrypted.
  legacyCtrFallback?: boolean,
}

/**
 * Verbatim copy of the legacy AES-256-CTR decryption algorithm used by
 * @natlibfi/melinda-backend-commons ≤ 3.0.6: base64(input) = iv (16 bytes) ‖ ciphertext.
 * No input validation beyond the length guard; a wrong key returns garbage (old behavior).
 */
export function decryptLegacyCtrString({key, value}: {key: string; value: string}) {
  if (!/^[0-9a-f]{64}$/iu.test(key)) {
    throw new Error('decryptLegacyCtrString: key must be a 64-character hex string (32 bytes)');
  }

  const input = decodeBase64Strict(value);
  if (input === false) {
    throw new Error('decryptLegacyCtrString: value is not valid base64');
  }

  if (input.length < MIN_LEGACY_CTR_VALUE_LENGTH) {
    throw new Error(`decryptLegacyCtrString: value is too short (${input.length} bytes; minimum ${MIN_LEGACY_CTR_VALUE_LENGTH}: 16-byte IV + ciphertext)`);
  }

  const iv = input.subarray(0, 16);
  const decipher = createDecipheriv('aes-256-ctr', Buffer.from(key, 'hex'), iv);
  return Buffer.concat([decipher.update(input.subarray(16)), decipher.final()]).toString('utf-8');
}

// One-time-per-process console.warn when the legacy CTR fallback is used on the
// ambiguous path (grep-able stable prefix, documented in README for log alerting).
let legacyCtrFallbackWarned = false;

function warnLegacyCtrFallback() {
  if (legacyCtrFallbackWarned) {
    return;
  }

  legacyCtrFallbackWarned = true;
  // eslint-disable-next-line no-console
  console.warn('decryptString: legacy AES-256-CTR value was decrypted via the legacyCtrFallback option; re-encrypt it with encryptString (the fallback will be removed in a future major)');
}

// Exposed for tests so the "one-time per process" flag can be reset between tests.
export function __resetLegacyCtrFallbackWarnFlagForTests() {
  legacyCtrFallbackWarned = false;
}

function decryptGcmString(key: string, input: Buffer): string {
  const iv = input.subarray(0, 16);
  const ciphertext = input.subarray(16, input.length - 16);
  const authTag = input.subarray(-16);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv).setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

export function decryptString({key, value}: {key: string; value: string}, {legacyCtrFallback = true}: decryptStringOptions = {}) {
  if (!/^[0-9a-f]{64}$/iu.test(key)) {
    throw new Error('decryptString: key must be a 64-character hex string (32 bytes)');
  }

  const input = decodeBase64Strict(value);
  if (input === false) {
    throw new Error('decryptString: value is not valid base64');
  }

  if (input.length < MIN_LEGACY_CTR_VALUE_LENGTH) {
    throw new Error(`decryptString: value is too short (${input.length} bytes; minimum ${MIN_ENCRYPTED_VALUE_LENGTH} for AES-256-GCM: 16-byte IV + ciphertext + 16-byte auth tag)`);
  }

  if (input.length < MIN_ENCRYPTED_VALUE_LENGTH) {
    // Provably legacy CTR: the GCM layout cannot be this short.
    if (legacyCtrFallback) {
      return decryptLegacyCtrString({key, value});
    }

    throw new Error(`decryptString: value is too short for AES-256-GCM (${input.length} bytes) but looks like a legacy AES-256-CTR value; enable {legacyCtrFallback: true} or re-encrypt`);
  }

  // Ambiguous length: both layouts possible — try GCM first (current behavior).
  try {
    return decryptGcmString(key, input);
  } catch (error) {
    if (legacyCtrFallback) {
      warnLegacyCtrFallback();
      return decryptLegacyCtrString({key, value});
    }

    throw new Error('decryptString: decryption failed: key does not match value, or value is corrupted (or the value was encrypted with @natlibfi/melinda-backend-commons AES-256-CTR; pass {legacyCtrFallback: true} or re-encrypt)', {cause: error});
  }
}

export type encryptedValueFormatResult = 'invalid-base64' | 'too-short' | 'legacy-ctr' | 'gcm-or-legacy-ambiguous';

/**
 * Length-based classifier for stored encrypted values (dry-run inventory helper).
 * Deliberately never claims 'gcm' — values ≥ 33 bytes could still be legacy CTR;
 * only the GCM auth tag can confirm.
 */
export function encryptedValueFormat(value: string): encryptedValueFormatResult {
  const input = decodeBase64Strict(value);
  if (input === false) {
    return 'invalid-base64';
  }

  if (input.length < MIN_LEGACY_CTR_VALUE_LENGTH) {
    return 'too-short';
  }

  if (input.length < MIN_ENCRYPTED_VALUE_LENGTH) {
    return 'legacy-ctr';
  }

  return 'gcm-or-legacy-ambiguous';
}

export function logWait(logger, waitTime) {
  //const debug = createDebugLogger('@natlibfi/melinda-commons:backendUtils:logWait');
  //const debugData = debug.extend('data');

  // 900000 ms = 15 min
  if (waitTime % 900000 === 0) {
    return logger.verbose(`Total wait: ${millisecondsToString(waitTime)}`);
  }
  // 60000ms = 1min
  if (waitTime % 60000 === 0) {
    return logger.debug(`Total wait: ${millisecondsToString(waitTime)}`);
  }
  return logger.silly(`Total wait: ${millisecondsToString(waitTime)}`);
}

export function joinObjects(obj, objectToBeJoined, arrayOfKeysWanted: string[] = []) {
  // Add the new items to the object if they are not undefined
  if (arrayOfKeysWanted.length > 0) {
    arrayOfKeysWanted.forEach(wantedKey => {
      if (objectToBeJoined[wantedKey] !== undefined) {
        obj[wantedKey] = objectToBeJoined[wantedKey];
        return;
      }
    });

    return;
  }

  Object.keys(objectToBeJoined).forEach(key => {
    if (objectToBeJoined[key] !== undefined) {
      obj[key] = objectToBeJoined[key];
      return;
    }

    return;
  });
}

type webhookUrl = string | false;

type basicNotificationContext = string | {text: string};

interface blobNotificationContext {
  profile?: string,
  id?: string,
  correlationId?: string,
  numberOfRecords?: number,
  failedRecords?: number,
  processedRecords?: number,
  created?: number,
  updated?: number,
  skipped?: number,
  error?: number,
}

// Same as in notification templates
interface sendNotificationOpts {
  environment?: false | string,
  linkUrl?: string,
  template: string | false,
  fail?: boolean
}

interface createWebhookOperatorResponse {
  sendNotification: (bodyData: basicNotificationContext | blobNotificationContext, options?: sendNotificationOpts) => Promise<boolean> | boolean
}

export function createWebhookOperator(WEBHOOK_URL: webhookUrl = false): createWebhookOperatorResponse {
  if (WEBHOOK_URL === false || typeof WEBHOOK_URL !== 'string') {
    throw new Error('Webhook URL is not defined');
  }

  const debug = createDebugLogger('@natlibfi/melinda-commons:backendUtils:sendNotification');
  const URL = WEBHOOK_URL;

  if (WEBHOOK_URL === 'test') {
    return {sendNotification: sendNotificationMock};
  }

  if (!URL.startsWith('https')) {
    throw new Error('Webhook URL needs to use https');
  }

  return {sendNotification};

  async function sendNotification(bodyData: basicNotificationContext | blobNotificationContext, options: sendNotificationOpts = {template: 'basic'}): Promise<boolean> {
    const method = 'POST';
    const headers = {'Content-Type': 'application/json'};

    try {
      const body = prepareBodyData(bodyData, options);
      const response = await fetch(URL, {method, headers, body});
      if (response.ok) {
        return true;
      }

      throw new Error(`HTTP response status was not ok (${response.status})`);
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      debug(`Encountered problem when sending notification: ${error.message}`);
      // throw new Error('Sending notification webhook failed');
      return false;
    }
  }

  // NOTE: synchronous on purpose, matching the old @natlibfi/melinda-backend-commons
  // contract: the 'test' mock throws synchronously when {fail: true}.
  function sendNotificationMock(bodyData: basicNotificationContext | blobNotificationContext, options: sendNotificationOpts = {template: false, fail: false}): boolean {
    debug('Mock notification!');
    debug(JSON.stringify(bodyData));
    debug(JSON.stringify(options));

    if (options.fail) {
      throw new Error('HTTP response status was not ok (MOCK)');
    }

    return true;
  }

  function prepareBodyData(bodyData, options) {
    if (options.template === 'basic') {
      const objectAsBody = generateBasicNotification(bodyData);
      return JSON.stringify(objectAsBody);
    }

    if (options.template === 'blob') {
      const objectAsBody = generateBlobNotification(bodyData, options);
      return JSON.stringify(objectAsBody);
    }

    return JSON.stringify(bodyData);
  }
}
