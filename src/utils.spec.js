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
import {createAuthorizationHeader, isDeletedRecord, readEnvironmentVariable, __RewireAPI__ as RewireAPI} from './utils';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/utils');

const isDeletedRecord_record1 = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record1.json'), 'utf8');
const isDeletedRecord_record2 = fs.readFileSync(path.join(FIXTURES_PATH, 'isDeletedRecord/record2.json'), 'utf8');

describe('utils', () => {
	describe('createAuthorizationHeader', () => {
		it('Should create a proper Authorization header', () => {
			const value = createAuthorizationHeader('foo', 'bar');
			expect(value).to.equal('Basic Zm9vOmJhcg==');
		});
	});

	describe('isDeletedRecord', () => {
		it('Should find the record deleted', () => {
			const record = new MarcRecord(JSON.parse(isDeletedRecord_record1));
			expect(isDeletedRecord(record)).to.equal(true);
		});

		it('Should find the record not deleted', () => {
			const record = new MarcRecord(JSON.parse(isDeletedRecord_record2));
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

			expect(readEnvironmentVariable('FOO', 'fubar')).to.equal('fubar');
		});

		it('Should not log the default value', () => {
			RewireAPI.__Rewire__('console', {log: msg => {
				expect(msg).to.equal('No environment variable set for FOO, using default value: [hidden]');
			}});

			expect(readEnvironmentVariable('FOO', 'fubar', {hideDefaultValue: true})).to.equal('fubar');
		});

		it('Should throw because mandatory variable is missing', () => {
			expect(() => {
				readEnvironmentVariable('FOO');
			}).to.throw(Error, /^Mandatory environment variable missing: FOO$/);
		});
	});
});
