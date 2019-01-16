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
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-commons-js is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
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
import * as testContext from './generate-query-list';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(__dirname, '../../../test-fixtures/record-matching/bib/generate-query-list');

const record1 = fs.readFileSync(path.join(FIXTURES_PATH, 'record1.json'), 'utf8');
const record2 = fs.readFileSync(path.join(FIXTURES_PATH, 'record2.json'), 'utf8');
const record3 = fs.readFileSync(path.join(FIXTURES_PATH, 'record3.json'), 'utf8');

const queryList1 = fs.readFileSync(path.join(FIXTURES_PATH, 'queryList1.json'), 'utf8');
const queryList2 = fs.readFileSync(path.join(FIXTURES_PATH, 'queryList2.json'), 'utf8');
const queryList3 = fs.readFileSync(path.join(FIXTURES_PATH, 'queryList3.json'), 'utf8');

describe('record-matching/bib/generate-query-list', () => {
	it('Should generate a list of identifiers and titles', () => {
		const record = new MarcRecord(JSON.parse(record1));
		const queryList = testContext.default(record);

		expect(queryList).to.eql(JSON.parse(queryList1));
	});

	it('Should generate a list of identifiers and titles (ISSN)', () => {
		const record = new MarcRecord(JSON.parse(record2));
		const queryList = testContext.default(record);

		expect(queryList).to.eql(JSON.parse(queryList2));
	});

	it('Should generate a list of titles', () => {
		const record = new MarcRecord(JSON.parse(record3));
		const queryList = testContext.default(record);

		expect(queryList).to.eql(JSON.parse(queryList3));
	});
});
