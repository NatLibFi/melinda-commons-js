import fs from 'fs';
import path from 'path';
import {describe, it} from 'node:test';
import assert from 'node:assert';
import {MarcRecord} from '@natlibfi/marc-record';
import {
  generateAuthorizationHeader, isDeletedRecord, parseBoolean, clone,
  getRecordTitle, getRecordStandardIdentifiers
} from './utils.js';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(import.meta.dirname, '../test-fixtures/utils');

describe('utils', () => {
  describe('generateAuthorizationHeader', () => {
    it('Should create a proper Authorization header', () => {
      const value = generateAuthorizationHeader('foo', 'bar');
      assert.equal(value, 'Basic Zm9vOmJhcg==');
    });
  });

  describe('isDeletedRecord', () => {
    it('Should find the record deleted (Leader)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record1.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), true);
    });

    it('Should find the record deleted (DEL)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record2.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), true);
    });

    it('Should find the record deleted (STA)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record3.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), true);
    });

    it('Should find the record not deleted', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record4.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), false);
    });

    it('Should find the record deleted (Split)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record5.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), true);
    });

    it('Should find the record deleted (Deprecated)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record6.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), true);
    });

    it('Should find the record deleted (Split (Aleph))', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record7.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), true);
    });

    it('Should find the record deleted (Deprecated (Aleph))', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record8.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      assert.equal(isDeletedRecord(record), true);
    });
  });

  describe('parseBoolean', () => {
    it('Should parse undefined as false', () => {
      assert.equal(parseBoolean(undefined), false);
    });

    it('Should parse zero-length string as false', () => {
      assert.equal(parseBoolean(''), false);
    });

    it('Should parse numericish value as true', () => {
      assert.equal(parseBoolean('1'), true);
    });

    it('Should parse numericush value as false', () => {
      assert.equal(parseBoolean('0'), false);
    });

    it('Should parse literal \'false\' value as false', () => {
      assert.equal(parseBoolean('false'), false);
    });

    it('Should parse non-numericish value as true', () => {
      assert.equal(parseBoolean('foo'), true);
    });

    it('Should parse literal \'FALSE\' value as false', () => {
      assert.equal(parseBoolean('FALSE'), false);
    });

    it('Should parse literal \'FAlsE\' value as false', () => {
      assert.equal(parseBoolean('FAlsE'), false);
    });

  });

  describe('getRecordTitle', () => {
    [
      'Should find a title',
      'Should not find a title'
    ].forEach((descr, index) => {
      it(descr, () => {
        const title = fs.readFileSync(path.join(FIXTURES_PATH, `getRecordTitle/title${index}.txt`), 'utf8');
        const recordData = fs.readFileSync(path.join(FIXTURES_PATH, `getRecordTitle/record${index}.json`), 'utf8');
        const record = new MarcRecord(JSON.parse(recordData));

        assert.equal(getRecordTitle(record), title);
      });
    });
  });

  describe('getRecordStandardIdentifiers', () => {
    [
      'Should find identifiers',
      'Should not find an identifier'
    ].forEach((descr, index) => {
      it(descr, () => {
        const identifiers = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, `getRecordStandardIdentifiers/identifiers${index}.json`), 'utf8'));
        const recordData = fs.readFileSync(path.join(FIXTURES_PATH, `getRecordStandardIdentifiers/record${index}.json`), 'utf8');
        const record = new MarcRecord(JSON.parse(recordData));

        assert.deepStrictEqual(getRecordStandardIdentifiers(record), identifiers);
      });
    });
  });

  describe('clone', () => {
    it('Should clone an object', () => {
      const obj = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, `clone/1/obj.json`), 'utf8'));
      const cloned = clone(obj);

      assert.equal(Object.is(obj, cloned), false);
      assert.deepStrictEqual(cloned, obj);
    });
  });
});
