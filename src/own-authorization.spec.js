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

import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {MarcRecord} from '@natlibfi/marc-record';
import * as testContext from './own-authorization';
import OwnAuthorizationError from './error';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/own-authorization');

const tags1 = fs.readFileSync(path.join(FIXTURES_PATH, 'tags1.json'), 'utf8');
const tags2 = fs.readFileSync(path.join(FIXTURES_PATH, 'tags2.json'), 'utf8');
const tags3 = fs.readFileSync(path.join(FIXTURES_PATH, 'tags3.json'), 'utf8');
const tags4 = fs.readFileSync(path.join(FIXTURES_PATH, 'tags4.json'), 'utf8');
const record1 = fs.readFileSync(path.join(FIXTURES_PATH, 'record1.json'), 'utf8');
const record2a = fs.readFileSync(path.join(FIXTURES_PATH, 'record2a.json'), 'utf8');
const record2b = fs.readFileSync(path.join(FIXTURES_PATH, 'record2b.json'), 'utf8');
const record3 = fs.readFileSync(path.join(FIXTURES_PATH, 'record3.json'), 'utf8');
const record4a = fs.readFileSync(path.join(FIXTURES_PATH, 'record4a.json'), 'utf8');
const record4b = fs.readFileSync(path.join(FIXTURES_PATH, 'record4b.json'), 'utf8');

describe('own-authorization', () => {
	describe('validateChanges', () => {
		it('Should pass', () => {
			const tags = JSON.parse(tags1);
			const record = new MarcRecord(JSON.parse(record1));

			expect(() => {
				testContext.validateChanges(tags, record);
			}).to.not.throw();
		});

		it('Should pass (Record comparison)', () => {
			const tags = JSON.parse(tags2);
			const recordA = new MarcRecord(JSON.parse(record2a));
			const recordB = new MarcRecord(JSON.parse(record2b));

			expect(() => {
				testContext.validateChanges(tags, recordA, recordB);
			}).to.not.throw();
		});

		it('Should throw', () => {
			const tags = JSON.parse(tags3);
			const record = new MarcRecord(JSON.parse(record3));

			expect(() => {
				testContext.validateChanges(tags, record);
			}).to.throw(OwnAuthorizationError);
		});

		it('Should throw (Record comparison)', () => {
			const tags = JSON.parse(tags4);
			const recordA = new MarcRecord(JSON.parse(record4a));
			const recordB = new MarcRecord(JSON.parse(record4b));

			expect(() => {
				testContext.validateChanges(tags, recordA, recordB);
			}).to.throw(OwnAuthorizationError);
		});
	});
});
