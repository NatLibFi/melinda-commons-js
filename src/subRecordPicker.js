/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Shared modules for Melinda's software
*
* Copyright (C) 2018-2022 University Of Helsinki (The National Library Of Finland)
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

import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import createDebugLogger from 'debug';
import {Error as ApiError} from './error';

export function createSubrecordPicker(sruUrl, retrieveAll = false) {
  if (sruUrl === undefined) { // eslint-disable-line functional/no-conditional-statements
    throw new ApiError(400, 'Invalid sru url');
  }

  const debug = createDebugLogger('@natlibfi/melinda-commons:subRecordPicker');
  debug(`SRU client url: ${sruUrl}`);
  const sruClient = createSruClient({url: sruUrl, recordSchema: 'marcxml', retrieveAll});

  return {readSomeSubrecords, readAllSubrecords};

  function readSomeSubrecords(recordId, offset = 1) {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const promises = [];
      sruClient.searchRetrieve(`melinda.partsofhost=${recordId}`, {startRecord: offset})
        .on('record', xmlString => {
          promises.push(MARCXML.from(xmlString, {subfieldValues: false})); // eslint-disable-line functional/immutable-data
        })
        .on('end', async nextRecordOffset => {
          try {
            const records = await Promise.all(promises);
            resolve({nextRecordOffset, records});
          } catch (error) {
            reject(error);
          }
        })
        .on('error', err => reject(err));
    });
  }

  function readAllSubrecords(recordId) {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const promises = [];
      sruClient.searchRetrieve(`melinda.partsofhost=${recordId}`)
        .on('record', xmlString => {
          promises.push(MARCXML.from(xmlString, {subfieldValues: false})); // eslint-disable-line functional/immutable-data
        })
        .on('end', async () => {
          try {
            const records = await Promise.all(promises);
            resolve({records});
          } catch (error) {
            reject(error);
          }
        })
        .on('error', err => reject(err));
    });
  }
}
