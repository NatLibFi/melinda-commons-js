import fs from 'fs';
import path from 'path';
import {describe, it, afterEach, mock} from 'node:test';
import assert from 'node:assert';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen';
//import createDebugLogger from 'debug';
import {
  readEnvironmentVariable,
  generateEncryptionKey, encryptString, decryptString, decryptLegacyCtrString, encryptedValueFormat,
  joinObjects, createWebhookOperator,
  logWait,
  createLogger,
  createExpressLogger,
  __resetLegacyCtrFallbackWarnFlagForTests
} from './backendUtils.ts';

const FIXTURES_PATH = path.join(import.meta.dirname, '../test-fixtures/utils');

//const debug = createDebugLogger('@natlibfi/melinda-commons:backendUtils:test');
//const debugData = debug.extend('data');

// eslint-disable-next-line max-lines-per-function
describe('utils', () => {
  describe('readEnvironmentVariable', () => {
    afterEach(() => {
      delete process.env['FOO'];
    });

    it('Should read a environment variable', () => {
      process.env['FOO'] = 'bar';
      assert.equal(readEnvironmentVariable('FOO'), 'bar');
    });

    it('Should use  a default value for environment variable', () => {
      assert.equal(readEnvironmentVariable('FOO', {defaultValue: 'fubar'}), 'fubar');
    });

    it('Should use a boolean default value for environment variable', () => {
      assert.equal(readEnvironmentVariable('FOO', {defaultValue: false}), false);
    });

    it('Should not log the default value for environment variable', () => {
      assert.equal(readEnvironmentVariable('FOO', {defaultValue: 'fubar', hideDefault: true}), 'fubar');
    });

    it('Should throw because mandatory variable is missing', () => {
      try {
        readEnvironmentVariable('FOO');
      } catch (error) {
        assert(error instanceof Error);
        assert.match(error.message, /^Mandatory environment variable missing: FOO$/u);
      }
    });

    it('Should format the variable', () => {
      process.env['FOO'] = '1';
      assert.equal(readEnvironmentVariable('FOO', {format: v => Number(v)}), 1);
    });
  });

  describe('generateEncryptionKey', () => {
    it('Should generate the expected key', () => {
      const bytes = fs.readFileSync(path.join(FIXTURES_PATH, 'generateEncryptionKey/bytes.txt'), 'utf8');
      const expectedKey = fs.readFileSync(path.join(FIXTURES_PATH, 'generateEncryptionKey/expectedKey.txt'), 'utf8');

      assert.equal(generateEncryptionKey(Buffer.from(bytes, 'hex')), expectedKey);
    });
  });

  describe('logWait', () => {

    it('Should be a function', () => {
      assert.ok(typeof logWait === 'function');
    });

    it('Should not crash when logging', () => {
      const logger = createLogger();
      logWait(logger, 900000);
    });
  });

  describe('createExpressLogger', () => {
    it('Should be a function when called without arguments', () => {
      assert.equal(typeof createExpressLogger(), 'function');
    });

    it('Should be a function when called with an empty object', () => {
      assert.equal(typeof createExpressLogger({}), 'function');
    });

    it('Should accept a custom msg option (as in melinda-backend-commons)', () => {
      assert.equal(typeof createExpressLogger({msg: '{{req.ip}} {{req.user.id}} HTTP {{req.method}} {{req.path}} - {{res.statusCode}} {{res.responseTime}}ms'}), 'function');
    });
  });

  describe('encryptString', () => {
    it('Should encrypt the string', () => {
      const bytes = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/bytes.txt'), 'utf8');
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/string1.txt'), 'utf8');
      const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/expectedValue1.txt'), 'utf8');

      assert.equal(encryptString({key, value}, Buffer.from(bytes, 'hex')), expectedValue);
    });
  });

  // eslint-disable-next-line max-lines-per-function
  describe('decryptString', () => {
    // The one-time console.warn flag is per process; reset it per test so
    // warn assertions don't leak across tests.
    afterEach(() => {
      __resetLegacyCtrFallbackWarnFlagForTests();
      mock.reset();
    });

    it('Should decrypt the string', () => {
      //const bytes = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/bytes.txt'), 'utf8');
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');
      const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/expectedValue1.txt'), 'utf8');

      assert.equal(decryptString({key, value}), expectedValue);
    });

    it('Should throw when the ciphertext has been tampered with (fallback disabled)', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      const buffer = Buffer.from(value.trim(), 'base64');
      // flip a byte in the ciphertext region (iv = bytes 0-15, auth tag = last 16 bytes)
      buffer[20]! ^= 0xff;
      const tamperedValue = buffer.toString('base64');

      assert.throws(() => decryptString({key, value: tamperedValue}, {legacyCtrFallback: false}), /decryption failed/u);
    });

    it('Should throw when the wrong key is used (fallback disabled)', () => {
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      assert.throws(() => decryptString({key: generateEncryptionKey(), value}, {legacyCtrFallback: false}), /decryption failed/u);
    });

    it('Should throw when the key is not 64 hex characters', () => {
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      assert.throws(() => decryptString({key: 'not-hex', value}), /64-character hex/u);
    });

    it('Should throw when the value is shorter than the minimum layout', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');

      assert.throws(() => decryptString({key, value: Buffer.alloc(10).toString('base64')}), /too short/u);
      assert.throws(() => decryptString({key, value: ''}), /too short \(0 bytes/u);
    });

    it('Should decrypt a legacy AES-256-CTR value (17-32 decoded bytes, provably legacy)', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyString1.txt'), 'utf8');
      const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyExpectedValue1.txt'), 'utf8');

      assert.equal(decryptString({key, value}), expectedValue);
      assert.equal(decryptString({key, value}, {legacyCtrFallback: true}), expectedValue);
    });

    it('Should throw on a legacy AES-256-CTR value when the fallback is disabled', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyString1.txt'), 'utf8');

      assert.throws(() => decryptString({key, value}, {legacyCtrFallback: false}), /legacy AES-256-CTR value; enable \{legacyCtrFallback: true\}/u);
    });

    it('Should decrypt a long legacy AES-256-CTR value (>=33 bytes) via GCM-failure fallback + one-time console.warn', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyString2.txt'), 'utf8');
      const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyExpectedValue2.txt'), 'utf8');

      const warn = mock.method(console, 'warn', () => undefined);

      assert.equal(decryptString({key, value}), expectedValue);
      // warn fired exactly once, with the stable grep-able prefix
      assert.equal(warn.mock.callCount(), 1);
      assert.match(warn.mock.calls[0]!.arguments[0] as string, /^decryptString: legacy AES-256-CTR/u);

      // second call in the same process: no second warn (one-time per process)
      assert.equal(decryptString({key, value}, {legacyCtrFallback: true}), expectedValue);
      assert.equal(warn.mock.callCount(), 1);
    });

    it('Should throw the plain decryption error on a tampered GCM value when the fallback is disabled (regression guard for 99a7388)', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      const buffer = Buffer.from(value.trim(), 'base64');
      buffer[20]! ^= 0xff;
      const tamperedValue = buffer.toString('base64');

      const warn = mock.method(console, 'warn', () => undefined);

      assert.throws(
        () => decryptString({key, value: tamperedValue}, {legacyCtrFallback: false}),
        /decryption failed: key does not match value, or value is corrupted \(or the value was encrypted with @natlibfi\/melinda-backend-commons AES-256-CTR; pass \{legacyCtrFallback: true\} or re-encrypt\)/u
      );
      assert.equal(warn.mock.callCount(), 0);
    });

    it('Should NOT throw on a tampered GCM value when the fallback is enabled (returns CTR garbage, documented trade-off) + warn', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      const buffer = Buffer.from(value.trim(), 'base64');
      buffer[20]! ^= 0xff;
      const tamperedValue = buffer.toString('base64');

      const warn = mock.method(console, 'warn', () => undefined);

      const result = decryptString({key, value: tamperedValue}); // default fallback = true
      assert.equal(typeof result, 'string');
      assert.notEqual(result, 'foobar'); // GCM plaintext must not survive a CTR garbage decode
      assert.equal(warn.mock.callCount(), 1);
      assert.match(warn.mock.calls[0]!.arguments[0] as string, /^decryptString: legacy AES-256-CTR/u);
    });
  });

  describe('decryptLegacyCtrString', () => {
    it('Should decrypt the legacy fixtures (short + long) with the verbatim old algorithm', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');

      for (const n of [1, 2]) {
        const value = fs.readFileSync(path.join(FIXTURES_PATH, `decryptString/legacyString${n}.txt`), 'utf8');
        const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, `decryptString/legacyExpectedValue${n}.txt`), 'utf8');

        assert.equal(decryptLegacyCtrString({key, value}), expectedValue);
      }
    });

    it('Should throw on a value shorter than 17 decoded bytes', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');

      assert.throws(() => decryptLegacyCtrString({key, value: Buffer.alloc(10).toString('base64')}), /too short \(10 bytes/u);
      assert.throws(() => decryptLegacyCtrString({key, value: ''}), /too short \(0 bytes/u);
    });

    it('Should throw when the key is not 64 hex characters', () => {
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyString1.txt'), 'utf8');

      assert.throws(() => decryptLegacyCtrString({key: 'not-hex', value}), /64-character hex/u);
    });
  });

  describe('encryptedValueFormat', () => {
    it('Should classify values by decoded length', () => {
      const gcmValue = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      assert.equal(encryptedValueFormat(Buffer.alloc(10).toString('base64')), 'too-short');
      assert.equal(encryptedValueFormat(''), 'too-short');
      assert.equal(encryptedValueFormat(Buffer.alloc(16).toString('base64')), 'too-short');
      assert.equal(encryptedValueFormat(Buffer.alloc(17).toString('base64')), 'legacy-ctr');
      assert.equal(encryptedValueFormat(Buffer.alloc(26).toString('base64')), 'legacy-ctr');
      assert.equal(encryptedValueFormat(Buffer.alloc(32).toString('base64')), 'legacy-ctr');
      assert.equal(encryptedValueFormat(Buffer.alloc(33).toString('base64')), 'gcm-or-legacy-ambiguous');
      assert.equal(encryptedValueFormat(Buffer.alloc(47).toString('base64')), 'gcm-or-legacy-ambiguous');
      // well-formed GCM value is never claimed as GCM (ambiguity is unresolvable by length)
      assert.equal(encryptedValueFormat(gcmValue), 'gcm-or-legacy-ambiguous');
      assert.equal(encryptedValueFormat(fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyString1.txt'), 'utf8')), 'legacy-ctr');
      assert.equal(encryptedValueFormat(fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/legacyString2.txt'), 'utf8')), 'gcm-or-legacy-ambiguous');
    });

    it('Should report invalid base64', () => {
      assert.equal(encryptedValueFormat('!!!not-base64!!!'), 'invalid-base64');
    });
  });

  // eslint-disable-next-line max-lines-per-function
  describe('createWebhookOperator', () => {
    const webhookDomain = 'https://foo.bar';
    const webhookPath = '/foo/bar/1234';
    const webhookUrl = `${webhookDomain}${webhookPath}`;

    afterEach(() => {
      mock.reset();
    });

    it('Should return interface with sendNotification function that sends request to webhook URL', async () => {
      const notificationText = 'Foo';

      // mock interceptor to mock HTTP request response
      mock.method(global, 'fetch', (url, {body}) => {
        assert.equal(url, webhookUrl);
        assert.deepEqual(JSON.parse(body), {text: notificationText});
        return {ok: true};
      });

      const webhookOperator = createWebhookOperator(webhookUrl);
      const result = await webhookOperator.sendNotification({text: notificationText}, {template: false});

      assert.equal(result, true);
    });

    it('Should send request to webhook URL with basic template and a plain string bodyData (as in melinda-backend-commons)', async () => {
      const notificationText = 'Foo';

      // mock interceptor to mock HTTP request response
      mock.method(global, 'fetch', (url, {body}) => {
        assert.equal(url, webhookUrl);
        assert.deepEqual(JSON.parse(body), {text: notificationText});
        return {ok: true};
      });

      const webhookOperator = createWebhookOperator(webhookUrl);
      const result = await webhookOperator.sendNotification(notificationText);

      assert.equal(result, true);
    });

    it('Should send request to webhook URL with Content-Type application/json header', async () => {
      // mock interceptor to mock HTTP request response
      mock.method(global, 'fetch', (url, {headers}) => {
        assert.equal(url, webhookUrl);
        assert.equal(headers['Content-Type'], 'application/json');
        return {ok: true};
      });

      const webhookOperator = createWebhookOperator(webhookUrl);
      const result = await webhookOperator.sendNotification({text: 'Foo'}, {template: false});

      assert.equal(result, true);
    });

    it('Should send request to webhook URL with blob template and default values', async () => {
      const expectedBody = fs.readFileSync(path.join(FIXTURES_PATH, 'sendNotification/templateBlobDefault.json'), 'utf8');

      // mock interceptor to mock HTTP request response
      mock.method(global, 'fetch', (url, {body}) => {
        assert.equal(url, webhookUrl);
        assert.deepEqual(JSON.parse(body), JSON.parse(expectedBody));
        return {ok: true};
      });

      const webhookOperator = createWebhookOperator(webhookUrl);
      const result = await webhookOperator.sendNotification({text: ''}, {template: 'blob'});

      assert.equal(result, true);
    });

    it('Should send request to webhook URL with blob template custom values', async () => {
      const notificationText = {
        profile: 'foobar',
        id: 'foo',
        correlationId: 'bar',
        numberOfRecords: 12,
        failedRecords: 2,
        processedRecords: 10,
        created: 4,
        updated: 3,
        skipped: 2,
        error: 1
      };
      const options = {
        template: 'blob',
        environment: 'TEST',
        linkUrl: webhookDomain
      };

      const expectedBody = fs.readFileSync(path.join(FIXTURES_PATH, 'sendNotification/templateBlobCustom.json'), 'utf8');

      // mock interceptor to mock HTTP request response
      mock.method(global, 'fetch', (url, {body}) => {
        assert.equal(url, webhookUrl);
        assert.deepEqual(JSON.parse(body), JSON.parse(expectedBody));
        return {ok: true};
      });

      const webhookOperator = createWebhookOperator(webhookUrl);
      const result = await webhookOperator.sendNotification(notificationText, options);

      assert.equal(result, true);
    });

    it('Should return test interface with sendNotification function that mocks request', async () => {
      const notificationText = {text: 'Foo'};

      const webhookOperator = createWebhookOperator('test');
      const result = await webhookOperator.sendNotification(notificationText, {template: false});

      assert.equal(result, true);
    });

    it('Should return test interface with sendNotification function that mocks failing request (throws, as in melinda-backend-commons)', () => {
      const notificationText = {text: 'Foo'};

      const webhookOperator = createWebhookOperator('test');
      assert.throws(() => webhookOperator.sendNotification(notificationText, {template: false, fail: true}), {message: 'HTTP response status was not ok (MOCK)'});
    });

    it('Should throw error when initializing interface without URL', () => {
      assert.throws(() => createWebhookOperator(), {message: 'Webhook URL is not defined'});
    });

    it('Should throw error when initializing interface with URL that uses http', () => {
      assert.throws(() => createWebhookOperator('http://foobar'), {message: 'Webhook URL needs to use https'});
    });
  });
});

generateTests({
  callback,
  path: [FIXTURES_PATH, 'joinObjects'],
  recurse: false,
  useMetadataFile: true,
  fixura: {
    reader: READERS.JSON,
    failWhenNotFound: true
  }
});

function callback(testConf) {
  const {testType} = testConf;
  if (testType === 'joinObjects') {
    return testJoinObjects(testConf);
  }

  throw new Error('Test type not set!');
}

function testJoinObjects({getFixture, arrayOfKeysWanted = []}) {
  const originalObj = getFixture('originalObj.json');
  const objectToBeJoined = undefineValues(getFixture('ojectToBeJoined.json'));
  const resultObject = getFixture('resultObject.json');

  joinObjects(originalObj, objectToBeJoined, arrayOfKeysWanted);
  assert.deepEqual(originalObj, resultObject);

  function undefineValues(obj) {
    Object.keys(obj).forEach(key => {
      if (obj[key] === 'undefined') {
        obj[key] = undefined;
        return;
      }
    });

    return obj;
  }
}
