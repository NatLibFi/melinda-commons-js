/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Shared modules for Melinda's software
*
* Copyright (C) 2018-2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-commons-js
*
* melinda-commons-js program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-commons-js is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

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
