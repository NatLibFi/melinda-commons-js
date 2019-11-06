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

import {URL} from 'url';
import {promisify} from 'util';
import createDebugLogger from 'debug';
import HttpStatus from 'http-status';
import fetch from 'node-fetch';
import createSruClient from '@natlibfi/sru-client';
import {MARCXML, AlephSequential} from '@natlibfi/marc-record-serializers';
import {generateAuthorizationHeader, updateField001ToParamId} from './utils';
import deepEqual from 'deep-eql';
import moment from 'moment';

const setTimeoutPromise = promisify(setTimeout);

const FIX_ROUTINE = 'API';
const UPDATE_ACTION = 'REP';
const SRU_VERSION = '2.0';
const DEFAULT_CATALOGER_ID = 'API';
const MAX_RETRIES_ON_CONFLICT = 10;
const RETRY_WAIT_TIME_ON_CONFLICT = 1000;

export const INDEXING_PRIORITY = {
	HIGH: 1,
	LOW: 2
};

export class DatastoreError extends Error {
	constructor(status, ...params) {
		super(params);
		this.status = status;
	}
}

export function createService({sruURL, recordLoadURL, recordLoadApiKey, recordLoadLibrary}) {
	const debug = createDebugLogger('@natlibfi/melinda-commons:datastore');
	const requestOptions = {
		headers: {
			Accept: 'application/json',
			Authorization: generateAuthorizationHeader(recordLoadApiKey)
		}
	};

	return {create, read, update};

	async function read(id) {
		return fetchRecord(id);
	}

	async function create({record, cataloger = DEFAULT_CATALOGER_ID, indexingPriority = INDEXING_PRIORITY.HIGH}) {
		return loadRecord({record, cataloger, indexingPriority});
	}

	async function update({record, id, cataloger = DEFAULT_CATALOGER_ID, indexingPriority = INDEXING_PRIORITY.HIGH}) {
		const existingRecord = await fetchRecord(id);
		updateField001ToParamId(id, record);
		await validateRecordState(record, existingRecord);
		await loadRecord({record, id, cataloger, indexingPriority});
	}

	async function fetchRecord(id) {
		return new Promise((resolve, reject) => {
			try {
				const sruClient = createSruClient({serverUrl: sruURL, version: SRU_VERSION, maximumRecords: 1});

				sruClient.searchRetrieve(`rec.id=${id}`)
					.on('record', record => {
						try {
							resolve(MARCXML.from(record));
						} catch (err) {
							reject(err);
						}
					})
					.on('end', () => {
						reject(new DatastoreError(HttpStatus.NOT_FOUND));
					})
					.on('error', err => {
						reject(err);
					});
			} catch (err) {
				reject(err);
			}
		});
	}

	async function loadRecord({record, id, cataloger, indexingPriority, retriesCount = 0}) {
		const url = new URL(recordLoadURL);
		const formattedRecord = AlephSequential.to(record);

		url.searchParams.set('library', recordLoadLibrary);
		url.searchParams.set('method', id === undefined ? 'NEW' : 'OLD');
		url.searchParams.set('fixRoutine', FIX_ROUTINE);
		url.searchParams.set('updateAction', UPDATE_ACTION);
		url.searchParams.set('cataloger', cataloger);
		url.searchParams.set('indexingPriority', generateIndexingPriority(indexingPriority, id === undefined));

		const response = await fetch(url, Object.assign({
			method: 'POST',
			body: formattedRecord
		}, requestOptions));

		if (response.status === HttpStatus.OK) {
			const idList = await response.json();
			return formatRecordId(idList.shift());
		}

		if (response.status === HttpStatus.SERVICE_UNAVAILABLE) {
			throw new DatastoreError(HttpStatus.SERVICE_UNAVAILABLE);
		}

		if (response.status === HttpStatus.CONFLICT) {
			if (retriesCount === MAX_RETRIES_ON_CONFLICT) {
				throw new Error(`Unexpected response: ${response.status}: ${await response.text()}`);
			}

			debug('Got conflict response. Retrying...');
			await setTimeoutPromise(RETRY_WAIT_TIME_ON_CONFLICT);
			return loadRecord({record, id, cataloger, indexingPriority, retriesCount: retriesCount + 1});
		}

		throw new Error(`Unexpected response: ${response.status}: ${await response.text()}`);

		function formatRecordId(id) {
			const pattern = new RegExp(`${recordLoadLibrary.toUpperCase()}$`);
			return id.replace(pattern, '');
		}

		function generateIndexingPriority(priority, forCreated) {
			if (priority === INDEXING_PRIORITY.HIGH) {
				// These are values Aleph assigns for records modified in the cataloging GUI
				return forCreated ? '1990' : '1998';
			}

			return moment().add(1000, 'years').year();
		}
	}

	// Checks that the modification history is identical
	function validateRecordState(incomingRecord, existingRecord) {
		const incomingModificationHistory = incomingRecord.get(/^CAT$/);
		const existingModificationHistory = existingRecord.get(/^CAT$/);

		if (!deepEqual(incomingModificationHistory, existingModificationHistory)) {
			throw new DatastoreError(HttpStatus.CONFLICT);
		}
	}
}
