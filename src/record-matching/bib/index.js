/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* RESTful API for Melinda
*
* Copyright (C) 2018-2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-rest-api
*
* melinda-rest-api program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-rest-api is distributed in the hope that it will be useful,
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

import {promisify} from 'util';
import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import {Preference, Similarity, Models} from '@natlibfi/melinda-ai-commons';
import generateQueryList from './generate-query-list';
import {isDeletedRecord} from '../../utils';

export function createBibService({sruURL}) {
	const setTimeoutPromise = promisify(setTimeout);
	const {BibDefault: extractorSet} = Preference.ExtractorPresets;

	const SruClient = createSruClient({serverUrl: sruURL});
	const PreferenceService = Preference.createService({model: Models.BibPreference, extractorSet});
	const SimilarityService = Similarity.createService({model: Models.BibDuplicateDetection});

	return {find};

	async function find(record) {
		const foundIdList = [];
		const queryList = generateQueryList(record);

		return find(queryList);

		async function find(queryList) {
			let done;
			let findCandidateError;
			const candidates = [];
			const query = queryList.shift();

			if (query) {
				findCandidates(query);
				return processCandidates();
			}

			function findCandidates() {
				SruClient.searchRetrieve(query)
					.on('record', handleRecord)
					.on('end', () => {
						done = true;
					})
					.on('error', err => {
						findCandidateError = err;
					});

				function handleRecord(xml) {
					const record = MARCXML.from(xml);
					const id = record.get(/^001$/).shift().value;

					if (!isDeletedRecord(record) && !foundIdList.includes(id)) {
						candidates.push(record);
					}
				}
			}

			async function processCandidates() {
				const candidate = candidates.shift();

				if (findCandidateError) {
					throw findCandidateError;
				}

				if (candidate) {
					const {preferredRecord, otherRecord} = PreferenceService.find(record, candidate);
					const results = SimilarityService.check(preferredRecord, otherRecord);

					if (!results.hasNegativeFeatures && results.type !== 'NOT_DUPLICATE') {
						const id = candidate.get(/^001$/).shift().value;
						return id;
					}
				} else if (done) {
					return find(queryList);
				}

				await setTimeoutPromise(100);
				return processCandidates();
			}
		}
	}
}
