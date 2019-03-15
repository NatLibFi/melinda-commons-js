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
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-rest-api is distributed in the hope that it will be useful,
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

import createDebugLogger from 'debug';
import {promisify} from 'util';
import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import {Preference, Similarity, Models} from '@natlibfi/melinda-ai-commons';
import generateQueryList from './generate-query-list';
import {isDeletedRecord} from '../../utils';

export function createBibService({sruURL, maxDuplicates = 5, maxCandidatesPerQuery = 10, ignoreNegativeFeatures = false}) {
	const debug = createDebugLogger('@natlibfi/melinda-commons:record-matching');

	const setTimeoutPromise = promisify(setTimeout);
	const {BibDefault: extractorSet} = Preference.ExtractorPresets;

	const SruClient = createSruClient({serverUrl: sruURL});
	const PreferenceService = Preference.createService({model: Models.BibPreference, extractorSet});
	const SimilarityService = Similarity.createService({model: Models.BibDuplicateDetection});

	return {find};

	async function find(record) {
		const foundIdList = [];
		const queryList = generateQueryList(record);

		return findDuplicates(queryList);

		async function findDuplicates(queryList, foundList = []) {
			let done;
			let findCandidateError;
			const candidates = [];
			const query = queryList.shift();

			if (query) {
				debug(`Executing query: ${query}`);
				findCandidates(query);
				return processCandidates();
			}

			return foundList;

			function findCandidates() {
				let candidatesForQuery = 0;

				SruClient.searchRetrieve(query)
					.on('record', handleRecord)
					.on('end', () => {
						done = true;
					})
					.on('error', err => {
						findCandidateError = err;
					});

				function handleRecord(xml) {
					if (candidatesForQuery < maxCandidatesPerQuery) {
						const record = MARCXML.from(xml);
						const id = record.get(/^001$/).shift().value;

						if (!isDeletedRecord(record) && !foundIdList.includes(id)) {
							foundIdList.push(id);
							candidates.push(record);

							if (++candidatesForQuery === maxCandidatesPerQuery) {
								done = true;
							}
						}
					}
				}
			}

			async function processCandidates() {
				const candidate = candidates.shift();

				if (findCandidateError) {
					throw findCandidateError;
				}

				if (candidate) {
					debug('Checking a candidate for similarity');
					const {preferredRecord, otherRecord} = PreferenceService.find(record, candidate);
					const results = SimilarityService.check(preferredRecord, otherRecord);

					if (isDuplicate(results)) {
						debug('Found duplicate');

						const id = candidate.get(/^001$/).shift().value;
						foundList.push(id);

						if (foundList.length === maxDuplicates) {
							return foundList;
						}
					}
				} else if (done) {
					return findDuplicates(queryList, foundList);
				}

				await setTimeoutPromise(100);
				return processCandidates();

				function isDuplicate(results) {
					if (results.hasNegativeFeatures) {
						if (ignoreNegativeFeatures) {
							debug('Negative features found. Continuing anyway.');
						} else {
							debug('Negative features found');
							return false;
						}
					}

					if (results.type === 'NOT_DUPLICATE') {
						debug('Records are not similar');
						return false;
					}

					if (!postFilter()) {
						debug('Post filter did not pass');
						return false;
					}

					return true;
				}

				// Checks that both records are either hosts or components
				function postFilter() {
					return isComponent(record) === isComponent(candidate);

					function isComponent(rec) {
						if (rec.get(/^773$/).length > 0) {
							return true;
						}

						if (['a', 'b', 'd'].includes(rec.leader[7])) {
							return true;
						}
					}
				}
			}
		}
	}
}
