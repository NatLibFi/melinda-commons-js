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
import nock from 'nock';
import {expect} from 'chai';
import {MarcRecord} from '@natlibfi/marc-record';
import {createBibService} from './index';

const FIXTURES_PATH = path.join(__dirname, '../../../test-fixtures/record-matching/bib');

describe('record-matching/bib', () => {
	afterEach(() => {
		nock.cleanAll();
	});

	function getFixtures(index) {
		const recordData = fs.readFileSync(path.join(FIXTURES_PATH, `record${index}.json`), 'utf8');
		const matchingsIdsPath = path.join(FIXTURES_PATH, `matchingIds${index}.json`);

		const record = new MarcRecord(JSON.parse(recordData));
		const sruResponse = fs.readFileSync(path.join(FIXTURES_PATH, `sruResponse${index}.xml`), 'utf8');

		if (fs.existsSync(matchingsIdsPath)) {
			return {
				record, sruResponse,
				expectedMatchingIds: JSON.parse(fs.readFileSync(matchingsIdsPath, 'utf8'))
			};
		}

		return {record, sruResponse};
	}

	it('Should find a match', async () => {
		const {record, sruResponse, expectedMatchingIds} = getFixtures(1);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(expectedMatchingIds);
	});

	it('Should not find a match (No candidates)', async () => {
		const {record, sruResponse} = getFixtures(2);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		expect(await Service.find(record)).to.have.lengthOf(0);
	});

	it('Should not find a match (Candidates don\'t match)', async () => {
		const {record, sruResponse} = getFixtures(3);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		expect(await Service.find(record)).to.have.lengthOf(0);
	});

	it('Should find multiples matches', async () => {
		const {record, sruResponse, expectedMatchingIds} = getFixtures(4);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(expectedMatchingIds);
	});

	it('Should not find a match because of post filter', async () => {
		const {record, sruResponse} = getFixtures(5);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		expect(await Service.find(record)).to.have.lengthOf(0);
	});

	it('Should find multiples matches (Up to the maximum)', async () => {
		const {record, sruResponse, expectedMatchingIds} = getFixtures(6);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url, maxDuplicates: 3});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(expectedMatchingIds);
	});

	it('Should find multiples matches (Fetching candidates up to a maximum)', async () => {
		const {record, sruResponse, expectedMatchingIds} = getFixtures(7);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url, maxCandidatesPerQuery: 3});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(expectedMatchingIds);
	});

	it('Should find multiples matches (Ignoring negative features', async () => {
		const {record, sruResponse, expectedMatchingIds} = getFixtures(8);
		const url = 'https://sru';
		const Service = createBibService({sruURL: url, ignoreNegativeFeatures: true});

		nock('https://sru')
			.get(/.*/).reply(200, sruResponse);

		const matchingIds = await Service.find(record);

		expect(matchingIds).to.eql(expectedMatchingIds);
	});
});
