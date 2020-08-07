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

import createDebugLogger from 'debug';
import {promisify} from 'util';
import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import {Preference, Similarity, Models} from '@natlibfi/melinda-ai-commons';
import {generateIdentifierQueries, generateTitleQueries} from './generate-query-list';
import {isDeletedRecord} from '../../utils';

export function createSimpleBibService({sruURL, maxCandidatesPerQuery = 10}) {
  const debug = createDebugLogger('@natlibfi/melinda-commons:record-matching');
  const SruClient = createSruClient({serverUrl: sruURL, maximumRecords: maxCandidatesPerQuery});

  return {find};

  function find(record) {
    const queryList = generateIdentifierQueries(record);

    return findDuplicates();

    function findDuplicates() {
      const query = queryList.shift(); // eslint-disable-line functional/immutable-data

      if (query) {
        debug(`Executing query: ${query}`);
        return findCandidates();
      }

      return [];

      function findCandidates() {
        return new Promise((resolve, reject) => {
          SruClient.searchRetrieve(query)
            .on('record', handleRecord)
            .on('error', reject)
            .on('end', () => resolve(findDuplicates));

          function handleRecord(xml) {
            const record = MARCXML.from(xml);
            const id = getId(record);

            if (id && !isDeletedRecord(record)) { // eslint-disable-line functional/no-conditional-statement
              resolve([id]);
            }
          }

          function getId(record) {
            const [field] = record.get(/^001$/u);
            return field?.value;
          }
        });
      }
    }
  }
}

export function createBibService({sruURL, maxDuplicates = 5, maxCandidatesPerQuery = 10, ignoreNegativeFeatures = false}) {
  const debug = createDebugLogger('@natlibfi/melinda-commons:record-matching');

  const setTimeoutPromise = promisify(setTimeout);
  const {BibDefault: extractorSet} = Preference.ExtractorPresets;

  const SruClient = createSruClient({serverUrl: sruURL, maximumRecords: maxCandidatesPerQuery});
  const PreferenceService = Preference.createService({model: Models.BibPreference, extractorSet});
  const SimilarityService = Similarity.createService({model: Models.BibDuplicateDetection});

  return {find};

  function find(record) {
    const foundIdList = [];
    const queryList = generateIdentifierQueries(record)
      .concat(generateTitleQueries(record));

    return findDuplicates(queryList);

    function findDuplicates(queryList, foundList = []) {
      let done;// eslint-disable-line functional/no-let
      let findCandidateError;// eslint-disable-line functional/no-let
      const candidates = [];
      const query = queryList.shift(); // eslint-disable-line functional/immutable-data

      if (query) {
        debug(`Executing query: ${query}`);
        findCandidates(query);
        return processCandidates();
      }

      return foundList;

      function findCandidates() {
        let candidatesForQuery = 0;// eslint-disable-line functional/no-let

        SruClient.searchRetrieve(query)
          .on('record', handleRecord)
          .on('end', () => {
            done = true; // eslint-disable-line functional/immutable-data
          })
          .on('error', err => {
            findCandidateError = err; // eslint-disable-line functional/immutable-data
          });

        function handleRecord(xml) {
          if (candidatesForQuery < maxCandidatesPerQuery) {
            const record = MARCXML.from(xml);
            const id = getId(record);

            if (id && !isDeletedRecord(record) && !foundIdList.includes(id)) {
              foundIdList.push(id); // eslint-disable-line functional/immutable-data
              candidates.push(record); // eslint-disable-line functional/immutable-data

              if (++candidatesForQuery === maxCandidatesPerQuery) { // eslint-disable-line no-plusplus, functional/no-conditional-statement
                done = true;
              }
            }
          }

          function getId(record) {
            const [field] = record.get(/^001$/u);
            return field?.value;
          }
        }
      }

      async function processCandidates() {
        const candidate = candidates.shift(); // eslint-disable-line functional/immutable-data

        if (findCandidateError) { // eslint-disable-line functional/no-conditional-statement
          throw findCandidateError;
        }

        if (candidate) {
          debug('Checking a candidate for similarity');
          const {preferredRecord, otherRecord} = PreferenceService.find(record, candidate);
          const results = SimilarityService.check(preferredRecord, otherRecord);

          if (isDuplicate(results)) {
            debug('Found duplicate');

            const id = candidate.get(/^001$/u)[0].value;
            foundList.push(id); // eslint-disable-line functional/immutable-data

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
            if (ignoreNegativeFeatures) { // eslint-disable-line functional/no-conditional-statement
              debug('Negative features found. Continuing anyway.');
            } else { // eslint-disable-line functional/no-conditional-statement
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
            if (rec.get(/^773$/u).length > 0) {
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
