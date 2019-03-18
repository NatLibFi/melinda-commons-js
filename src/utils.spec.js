/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Shared modules for Melinda's applications
*
* Copyright (C) 2018-2019 University Of Helsinki (The National Library Of Finland)
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

/* eslint-disable camelcase, import/named */

import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {MarcRecord} from '@natlibfi/marc-record';
import {
	generateAuthorizationHeader, isDeletedRecord, readEnvironmentVariable,
	generateEncryptionKey, encryptString, decryptString, parseBoolean,
	__RewireAPI__ as RewireAPI,
	getRecordTag
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
		it('Should find the record deleted', () => {
			const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record1.json'), 'utf8');
			const record = new MarcRecord(JSON.parse(data));
			expect(isDeletedRecord(record)).to.equal(true);
		});

		it('Should find the record not deleted', () => {
			const data = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record2.json'), 'utf8');
			const record = new MarcRecord(JSON.parse(data));
			expect(isDeletedRecord(record)).to.equal(false);
		});
	});

	describe('readEnvironmentVariable', () => {
		afterEach(() => {
			RewireAPI.__ResetDependency__('console');
			delete process.env.FOO;
		});

		it('Should read a environment variable', () => {
			process.env.FOO = 'bar';
			expect(readEnvironmentVariable('FOO')).to.equal('bar');
		});

		it('Should use  a default value for environment', () => {
			RewireAPI.__Rewire__('console', {log: msg => {
				expect(msg).to.equal('No environment variable set for FOO, using default value: fubar');
			}});

			expect(readEnvironmentVariable('FOO', {defaultValue: 'fubar'})).to.equal('fubar');
		});

		it('Should not log the default value', () => {
			RewireAPI.__Rewire__('console', {log: msg => {
				expect(msg).to.equal('No environment variable set for FOO, using default value: [hidden]');
			}});

			expect(readEnvironmentVariable('FOO', {defaultValue: 'fubar', hideDefault: true})).to.equal('fubar');
		});

		it('Should throw because mandatory variable is missing', () => {
			expect(() => {
				readEnvironmentVariable('FOO');
			}).to.throw(Error, /^Mandatory environment variable missing: FOO$/);
		});

		it('Should format the variable', () => {
			process.env.FOO = '1';
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

			RewireAPI.__Rewire__('randomBytes', () => bytes);

			expect(generateEncryptionKey()).to.equal(expectedKey);
		});
	});

	describe('encryptString', () => {
		it('Should encrypt the string', () => {
			const key = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/key1.txt'), 'utf8');
			const value = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/string1.txt'), 'utf8');
			const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'encryptString/expectedValue1.txt'), 'utf8');

			expect(encryptString({key, value, algorithm: 'aes128'})).to.equal(expectedValue);
		});
	});

	describe('descryptString', () => {
		it('Should decrypt the string', () => {
			const key = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/key1.txt'), 'utf8');
			const value = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/string1.txt'), 'utf8');
			const expectedValue = fs.readFileSync(path.join(FIXTURES_PATH, 'decryptString/expectedValue1.txt'), 'utf8');

			expect(decryptString({key, value, algorithm: 'aes128'})).to.equal(expectedValue);
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

	describe('getRecordTag', () => {
		[
			'Should return both title and identifier',
			'Should only a title',
			'Should return only an id',
			'Should return an empty string'
		].forEach((descr, index) => {
			it(descr, () => {
				const tag = fs.readFileSync(path.join(FIXTURES_PATH, `getRecordTag/tag${index}.txt`), 'utf8');
				const recordData = fs.readFileSync(path.join(FIXTURES_PATH, `getRecordTag/record${index}.json`), 'utf8');
				const record = new MarcRecord(JSON.parse(recordData));

				expect(getRecordTag(record)).to.equal(tag);
			});
		});
	});
});
