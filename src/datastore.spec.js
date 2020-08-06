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
import HttpStatus from 'http-status';
import nock from 'nock';
import {expect} from 'chai';
import {MarcRecord} from '@natlibfi/marc-record';
import {
	createService, DatastoreError, INDEXING_PRIORITY,
	__RewireAPI__ as RewireAPI
} from './datastore';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/datastore');

const sruResponse1 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse1.xml'), 'utf8');
const sruResponse2 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse2.xml'), 'utf8');
const sruResponse3 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse3.xml'), 'utf8');
const sruResponse4 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse4.xml'), 'utf8');
const sruResponse5 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse5.xml'), 'utf8');
const sruResponse6 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse6.xml'), 'utf8');
const sruResponse7 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse7.xml'), 'utf8');
const sruResponse8 = fs.readFileSync(path.join(FIXTURES_PATH, 'sruResponse8.xml'), 'utf8');
const expectedRecord1 = fs.readFileSync(path.join(FIXTURES_PATH, 'expectedRecord1.json'), 'utf8');
const incomingRecord1 = fs.readFileSync(path.join(FIXTURES_PATH, 'incomingRecord1.json'), 'utf8');
const incomingRecord2 = fs.readFileSync(path.join(FIXTURES_PATH, 'incomingRecord2.json'), 'utf8');
const incomingRecord3 = fs.readFileSync(path.join(FIXTURES_PATH, 'incomingRecord3.json'), 'utf8');
const incomingRecord4 = fs.readFileSync(path.join(FIXTURES_PATH, 'incomingRecord4.json'), 'utf8');

describe('datastore', () => {
	afterEach(() => {
		nock.cleanAll();
	});

	describe('factory', () => {
		it('Should create the expected object', () => {
			const service = createService({});
			expect(service).to.be.an('object')
				.and.respondTo('read')
				.and.respondTo('create')
				.and.respondTo('update');
		});

		describe('#read', () => {
			it('Should fetch a record', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse1);

				const service = createService({
					sruURL: 'https://sru',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				const record = await service.read('1234');
				expect(record.toObject()).to.eql(JSON.parse(expectedRecord1));
			});

			it('Should fail because the record does not exist', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse2);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					await service.read('foobar');
				} catch (err) {
					expect(err).to.be.an.instanceof(DatastoreError);
					expect(err).to.have.property('status', HttpStatus.NOT_FOUND);
					return;
				}

				throw new Error('Should throw');
			});

			it('Should fail because of an unexpected error', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.INTERNAL_SERVER_ERROR);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					await service.read('1234');
				} catch (err) {
					expect(err).to.be.an('error');
					return;
				}

				throw new Error('Should throw');
			});
		});

		describe('#create', () => {
			beforeEach(() => {
				RewireAPI.__Rewire__('MAX_RETRIES_ON_CONFLICT', 3);
				RewireAPI.__Rewire__('RETRY_WAIT_TIME_ON_CONFLICT', 100);
			});

			afterEach(() => {
				RewireAPI.__ResetDependency__('MAX_RETRIES_ON_CONFLICT');
				RewireAPI.__ResetDependency__('RETRY_WAIT_TIME_ON_CONFLICT');
				RewireAPI.__ResetDependency__('moment');
			});

			it('Should create a record', async () => {
				nock('https://api')
					.post(/.*/).reply(HttpStatus.OK, ['1234']);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				const record = new MarcRecord(JSON.parse(incomingRecord1));
				const id = await service.create({record});

				expect(id).to.equal('1234');
			});

			it('Should fail because of an unexpected error', async () => {
				nock('https://api')
					.post(/.*/).reply(HttpStatus.INTERNAL_SERVER_ERROR);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					const record = new MarcRecord(JSON.parse(incomingRecord1));
					await service.create({record});
				} catch (err) {
					expect(err).to.be.an('error');
					return;
				}

				throw new Error('Should throw');
			});

			it('Should succeed after retries on conflict', async () => {
				nock('https://api')
					.post(/.*/).reply(HttpStatus.CONFLICT)
					.post(/.*/).reply(HttpStatus.OK, ['1234']);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				const record = new MarcRecord(JSON.parse(incomingRecord1));
				const id = await service.create({record});

				expect(id).to.equal('1234');
			});

			it('Should fail after retries on conflict', async () => {
				nock('https://api')
					.post(/.*/).reply(HttpStatus.CONFLICT)
					.post(/.*/).reply(HttpStatus.CONFLICT)
					.post(/.*/).reply(HttpStatus.CONFLICT)
					.post(/.*/).reply(HttpStatus.CONFLICT)
					.post(/.*/).reply(HttpStatus.OK, ['foo']);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					const record = new MarcRecord(JSON.parse(incomingRecord1));
					await service.create({record});
				} catch (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.match(/^Unexpected response: 409/);
					return;
				}

				throw new Error('Should throw');
			});

			it('Should fail during service offline hours', async () => {
				nock('https://api')
					.post(/.*/).reply(HttpStatus.SERVICE_UNAVAILABLE);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					const record = new MarcRecord(JSON.parse(incomingRecord1));
					await service.create({record});
				} catch (err) {
					expect(err).to.be.an.instanceof(DatastoreError);
					expect(err.status).to.equal(HttpStatus.SERVICE_UNAVAILABLE);
					return;
				}

				throw new Error('Should throw');
			});

			it('Should create a record with the specified indexing priority', async () => {
				RewireAPI.__Rewire__('moment', () => ({
					add: () => ({
						year: () => '3000'
					})
				}));

				const recordLoadLibrary = 'foo';
				const recordLoadURL = 'https://api';

				nock(recordLoadURL)
					.post(`/?library=${recordLoadLibrary}&method=NEW&fixRoutine=API&updateAction=REP&cataloger=API&indexingPriority=3000`)
					.reply(HttpStatus.OK, ['1234']);

				const service = createService({
					recordLoadLibrary, recordLoadURL,
					sruURL: 'https://sru/bib',
					recordLoadApiKey: 'foobar'
				});

				const record = new MarcRecord(JSON.parse(incomingRecord1));
				const id = await service.create({record, indexingPriority: INDEXING_PRIORITY.LOW});

				expect(id).to.equal('1234');
			});
		});

		describe('#update', () => {
			afterEach(() => {
				RewireAPI.__ResetDependency__('moment');
			});

			it('Should update a record', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse3);
				nock('https://api')
					.post(/.*/).reply(HttpStatus.OK, ['1234']);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				const record = new MarcRecord(JSON.parse(incomingRecord2));
				await service.update({record, id: '1234'});
			});

			it('Should fail because the record does not exist', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse4);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					const record = new MarcRecord(JSON.parse(incomingRecord2));
					await service.update({record, id: '1234'});
				} catch (err) {
					expect(err).to.be.an.instanceof(DatastoreError);
					expect(err).to.have.property('status', HttpStatus.NOT_FOUND);
					return;
				}

				throw new Error('Should throw');
			});

			it('Should fail because target record has changed in datastore', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse5);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					const record = new MarcRecord(JSON.parse(incomingRecord3));
					await service.update({record, id: '1234'});
				} catch (err) {
					expect(err).to.be.an.instanceof(DatastoreError);
					expect(err).to.have.property('status', HttpStatus.CONFLICT);
					return;
				}

				throw new Error('Should throw');
			});

			it('Should fail because of an unexpected error', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.INTERNAL_SERVER_ERROR);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					const record = new MarcRecord(JSON.parse(incomingRecord3));
					await service.update({record, id: '1234'});
				} catch (err) {
					expect(err).to.be.an('error');
				}
			});

			it('Should fail during service offline hours', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse6);
				nock('https://api')
					.post(/.*/).reply(HttpStatus.SERVICE_UNAVAILABLE);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				try {
					const record = new MarcRecord(JSON.parse(incomingRecord3));
					await service.update({record, id: '1234'});
				} catch (err) {
					expect(err).to.be.an.instanceof(DatastoreError);
					expect(err.status).to.equal(HttpStatus.SERVICE_UNAVAILABLE);
					return;
				}

				throw new Error('Should throw');
			});

			it('Should update a record with the specified indexing priority', async () => {
				RewireAPI.__Rewire__('moment', () => ({
					add: () => ({
						year: () => '3000'
					})
				}));

				const recordLoadLibrary = 'foo';
				const recordLoadURL = 'https://api';

				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse7);
				nock(recordLoadURL)
					.post(`/?library=${recordLoadLibrary}&method=OLD&fixRoutine=API&updateAction=REP&cataloger=API&indexingPriority=3000`)
					.reply(HttpStatus.OK, ['1234']);

				const service = createService({
					recordLoadLibrary, recordLoadURL,
					sruURL: 'https://sru/bib',
					recordLoadApiKey: 'foobar'
				});

				const record = new MarcRecord(JSON.parse(incomingRecord2));
				await service.update({record, id: '1234', indexingPriority: INDEXING_PRIORITY.LOW});
			});

			it('Should update a record and replace "WRONG" id to given id', async () => {
				nock('https://sru/bib')
					.get(/.*/).reply(HttpStatus.OK, sruResponse8);
				nock('https://api')
					.post(/.*/).reply(HttpStatus.OK, ['4321']);

				const service = createService({
					sruURL: 'https://sru/bib',
					recordLoadURL: 'https://api',
					recordLoadApiKey: 'foobar',
					recordLoadLibrary: 'foo'
				});

				const record = new MarcRecord(JSON.parse(incomingRecord4));
				await service.update({record, id: '4321'});
			});
		});
	});
});
