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

// Disable import/named because eslint doesn't get __RewireAPI__
/* eslint-disable new-cap, import/named */

import fs from 'fs';
import path from 'path';
import nock from 'nock';
import {expect} from 'chai';
import {MarcRecord} from '@natlibfi/marc-record';
import {createBibService, __RewireAPI__ as RewireAPI} from './index';

const FIXTURES_PATH = path.join(__dirname, '../../../test-fixtures/record-matching/bib');

const sruResponse1 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse1.xml'), 'utf8');
const sruResponse2 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse2.xml'), 'utf8');
const sruResponse3 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse3.xml'), 'utf8');
const sruResponse4 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse4.xml'), 'utf8');
const sruResponse5 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse5.xml'), 'utf8');
const sruResponse6 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse6.xml'), 'utf8');
const sruResponse7 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse7.xml'), 'utf8');

const record1 = fs.readFileSync(path.join(FIXTURES_PATH, 'record1.json'), 'utf8');
const record2 = fs.readFileSync(path.join(FIXTURES_PATH, 'record2.json'), 'utf8');
const record3 = fs.readFileSync(path.join(FIXTURES_PATH, 'record3.json'), 'utf8');

const matchingIds1 = fs.readFileSync(path.join(FIXTURES_PATH, 'matchingIds1.json'), 'utf8');
const matchingIds2 = fs.readFileSync(path.join(FIXTURES_PATH, 'matchingIds2.json'), 'utf8');
const matchingIds3 = fs.readFileSync(path.join(FIXTURES_PATH, 'matchingIds3.json'), 'utf8');
const matchingIds4 = fs.readFileSync(path.join(FIXTURES_PATH, 'matchingIds4.json'), 'utf8');

describe('record-matching/bib', () => {
	afterEach(() => {
		nock.cleanAll();
		RewireAPI.__ResetDependency__('MAX_DUPLICATES');
		RewireAPI.__ResetDependency__('MAX_CANDIDATE_PER_QUERY');
	});

	it('Should find a match', async () => {
		const url = 'https://sru';
		const record = new MarcRecord(JSON.parse(record1));
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse1);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(JSON.parse(matchingIds1));
	});

	it('Should not find a match (No candidates)', async () => {
		const url = 'https://sru';
		const record = new MarcRecord(JSON.parse(record2));
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse2);

		expect(await Service.find(record)).to.have.lengthOf(0);
	});

	it('Should not find a match (Candidates don\'t match)', async () => {
		const url = 'https://sru';
		const record = new MarcRecord(JSON.parse(record3));
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse3);

		expect(await Service.find(record)).to.have.lengthOf(0);
	});

	it('Should find multiples matches', async () => {
		const url = 'https://sru';
		const record = new MarcRecord(JSON.parse(record1));
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse4);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(JSON.parse(matchingIds2));
	});

	it('Should not find a match because of post filter', async () => {
		const url = 'https://sru';
		const record = new MarcRecord(JSON.parse(record1));
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse5);

		expect(await Service.find(record)).to.have.lengthOf(0);
	});

	it('Should find multiples matches (Up to the maximum)', async () => {
		RewireAPI.__Rewire__('MAX_DUPLICATES', 3);

		const url = 'https://sru';
		const record = new MarcRecord(JSON.parse(record1));
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse6);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(JSON.parse(matchingIds3));
	});

	it('Should find multiples matches (Fetching candidates up to a maximum)', async () => {
		RewireAPI.__Rewire__('MAX_CANDIDATES_PER_QUERY', 3);

		const url = 'https://sru';
		const record = new MarcRecord(JSON.parse(record1));
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse7);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(JSON.parse(matchingIds4));
	});
});
