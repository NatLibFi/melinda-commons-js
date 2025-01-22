import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {MarcRecord} from '@natlibfi/marc-record';
import {
  generateAuthorizationHeader, isDeletedRecord, parseBoolean, clone,
  getRecordTitle, getRecordStandardIdentifiers
} from './utils';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/utils');

describe('utils', () => {
  describe('generateAuthorizationHeader', () => {
    it('Should create a proper Authorization header', () => {
      const value = generateAuthorizationHeader('foo', 'bar');
      expect(value).to.equal('Basic Zm9vOmJhcg==');
    });
  });

  describe('isDeletedRecord', () => {
    it('Should find the record deleted (Leader)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record1.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(true);
    });

    it('Should find the record deleted (DEL)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record2.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(true);
    });

    it('Should find the record deleted (STA)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record3.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(true);
    });

    it('Should find the record not deleted', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record4.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(false);
    });

    it('Should find the record deleted (Split)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record5.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(true);
    });

    it('Should find the record deleted (Deprecated)', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record6.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(true);
    });

    it('Should find the record deleted (Split (Aleph))', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record7.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(true);
    });

    it('Should find the record deleted (Deprecated (Aleph))', () => {
      const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record8.json'), 'utf8');
      const record = new MarcRecord(JSON.parse(data));
      expect(isDeletedRecord(record)).to.equal(true);
    });
  });

  describe('parseBoolean', () => {
    it('Should parse undefined as false', () => {
      expect(parseBoolean(undefined)).to.equal(false);
    });

    it('Should parse zero-length string as false', () => {
      expect(parseBoolean('')).to.equal(false);
    });

    it('Should parse numericish value as true', () => {
      expect(parseBoolean('1')).to.equal(true);
    });

    it('Should parse numericush value as false', () => {
      expect(parseBoolean('0')).to.equal(false);
    });

    it('Should parse literal \'false\' value as false', () => {
      expect(parseBoolean('false')).to.equal(false);
    });

    it('Should parse non-numericish value as true', () => {
      expect(parseBoolean('foo')).to.equal(true);
    });

    it('Should parse literal \'FALSE\' value as false', () => {
      expect(parseBoolean('FALSE')).to.equal(false);
    });

    it('Should parse literal \'FAlsE\' value as false', () => {
      expect(parseBoolean('FAlsE')).to.equal(false);
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

        expect(getRecordTitle(record)).to.equal(title);
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

        expect(getRecordStandardIdentifiers(record)).to.eql(identifiers);
      });
    });
  });

  describe('clone', () => {
    it('Should clone an object', (index = '1') => {
      const obj = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, `clone/${index}/obj.json`), 'utf8'));
      const cloned = clone(obj);

      expect(obj).to.not.equal(cloned);
      expect(cloned).to.eql(obj);
    });
  });
});
