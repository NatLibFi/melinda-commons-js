/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Shared modules for Melinda's backend applications
*
* Copyright (C) 2018-2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-backend-commons-js
*
* melinda-backend-commons-js program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-backend-commons-js is distributed in the hope that it will be useful,
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
  readEnvironmentVariable,
  generateEncryptionKey, encryptString, decryptString,
  __RewireAPI__ as RewireAPI
} from './utils';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(__dirname, '../../test-fixtures/utils');

describe('utils', () => {
  describe('readEnvironmentVariable', () => {
    afterEach(() => {
      delete process.env.FOO; // eslint-disable-line functional/immutable-data, no-process-env
    });

    it('Should read a environment variable', () => {
      process.env.FOO = 'bar';// eslint-disable-line functional/immutable-data, no-process-env
      expect(readEnvironmentVariable('FOO')).to.equal('bar');
    });

    it('Should use  a default value for environment', () => {
      expect(readEnvironmentVariable('FOO', {defaultValue: 'fubar'})).to.equal('fubar');
    });

    it('Should not log the default value', () => {
      expect(readEnvironmentVariable('FOO', {defaultValue: 'fubar', hideDefault: true})).to.equal('fubar');
    });

    it('Should throw because mandatory variable is missing', () => {
      expect(() => {
        readEnvironmentVariable('FOO');
      }).to.throw(Error, /^Mandatory environment variable missing: FOO$/u);
    });

    it('Should format the variable', () => {
      process.env.FOO = '1'; // eslint-disable-line functional/immutable-data, no-process-env
      expect(readEnvironmentVariable('FOO', {format: v => Number(v)})).to.equal(1);
    });
  });

  describe('generateEncryptionKey', () => {
    afterEach(() => {
      RewireAPI.__ResetDependency__('randomBytes');
    });

    it('Should generate the expected key', () => {
      const bytes = fs.readFileSync(path.join(FIXTURES_PATH, 'generateEncryptionKey/bytes.txt'), 'utf8');
      const expectedKey = fs.readFileSync(path.join(FIXTURES_PATH, 'generateEncryptionKey/expectedKey.txt'), 'utf8');

      RewireAPI.__Rewire__('randomBytes', () => Buffer.from(bytes, 'hex'));

      expect(generateEncryptionKey()).to.equal(expectedKey);
    });
  });

  describe('encryptString', () => {
    afterEach(() => {
      RewireAPI.__ResetDependency__('randomBytes');
    });

    it('Should encrypt the string', () => {
      const bytes = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/bytes.txt'), 'utf8');
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/string1.txt'), 'utf8');
      const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/expectedValue1.txt'), 'utf8');

      RewireAPI.__Rewire__('randomBytes', () => Buffer.from(bytes, 'hex'));

      expect(encryptString({key, value})).to.equal(expectedValue);
    });
  });

  describe('descryptString', () => {
    afterEach(() => {
      RewireAPI.__ResetDependency__('randomBytes');
    });

    it('Should decrypt the string', () => {
      const bytes = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/bytes.txt'), 'utf8');
      const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
      const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');
      const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/expectedValue1.txt'), 'utf8');

      RewireAPI.__Rewire__('randomBytes', () => Buffer.from(bytes, 'hex'));

      expect(decryptString({key, value})).to.equal(expectedValue);
    });
  });
});
