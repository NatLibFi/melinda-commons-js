import fs from 'fs';
import path from 'path';
import {describe, it, afterEach, mock} from 'node:test';
import assert from 'node:assert';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen';
import type {FixugenTestConfig} from '@natlibfi/fixugen';
//import createDebugLogger from 'debug';
import {
  readEnvironmentVariable,
  generateEncryptionKey, encryptString, decryptString,
  joinObjects, createWebhookOperator,
  logWait,
  createLogger,
  createExpressLogger
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

  describe('decryptString', () => {
    afterEach(() => {
      mock.reset();
    });

    it('Should decrypt the string', () => {
      //const bytes = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/bytes.txt'), 'utf8');
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');
      const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/expectedValue1.txt'), 'utf8');

      assert.equal(decryptString({key, value}), expectedValue);
    });

    it('Should throw when the ciphertext has been tampered with', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      const buffer = Buffer.from(value.trim(), 'base64');
      // flip a byte in the ciphertext region (iv = bytes 0-15, auth tag = last 16 bytes)
      buffer[20]! ^= 0xff;
      const tamperedValue = buffer.toString('base64');

      assert.throws(() => decryptString({key, value: tamperedValue}), /decryption failed/u);
    });

    it('Should throw when the wrong key is used', () => {
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      assert.throws(() => decryptString({key: generateEncryptionKey(), value}), /decryption failed/u);
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

    it('Should throw when the value decodes to fewer than 33 bytes (17-32 decoded bytes, below the GCM minimum)', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');

      for (const length of [17, 26, 32]) {
        assert.throws(
          () => decryptString({key, value: Buffer.alloc(length).toString('base64')}),
          err => err instanceof Error
            && err.message === `decryptString: value is too short (${length} bytes; minimum 33 for AES-256-GCM: 16-byte IV + ciphertext + 16-byte auth tag)`
        );
      }
    });

    it('Should throw the plain decryption error on a tampered GCM value (regression guard for 99a7388)', () => {
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');

      const buffer = Buffer.from(value.trim(), 'base64');
      buffer[20]! ^= 0xff;
      const tamperedValue = buffer.toString('base64');

      assert.throws(
        () => decryptString({key, value: tamperedValue}),
        err => err instanceof Error
          && err.message === 'decryptString: decryption failed: key does not match value, or value is corrupted'
          && err.cause instanceof Error
      );
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
      mock.method(global, 'fetch', (url: string, {body}: {body: string}) => {
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
      mock.method(global, 'fetch', (url: string, {body}: {body: string}) => {
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
      mock.method(global, 'fetch', (url: string, {headers}: {headers: Record<string, string>}) => {
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
      mock.method(global, 'fetch', (url: string, {body}: {body: string}) => {
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
      mock.method(global, 'fetch', (url: string, {body}: {body: string}) => {
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

function callback(testConf: FixugenTestConfig) {
  const {testType} = testConf;
  if (testType === 'joinObjects') {
    return testJoinObjects(testConf);
  }

  throw new Error('Test type not set!');
}

function testJoinObjects({getFixture, arrayOfKeysWanted = []}: FixugenTestConfig) {
  const originalObj = getFixture('originalObj.json');
  const objectToBeJoined = undefineValues(getFixture('ojectToBeJoined.json'));
  const resultObject = getFixture('resultObject.json');

  joinObjects(originalObj, objectToBeJoined, arrayOfKeysWanted);
  assert.deepEqual(originalObj, resultObject);

  function undefineValues(obj: Record<string, unknown>): Record<string, unknown> {
    Object.keys(obj).forEach(key => {
      if (obj[key] === 'undefined') {
        obj[key] = undefined;
        return;
      }
    });

    return obj;
  }
}
