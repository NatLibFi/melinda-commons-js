import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import createDebugLogger from 'debug';
import {Error as ApiError} from './error';

export function createSubrecordPicker(sruUrl, retrieveAll = false) {
  if (sruUrl === undefined) { // eslint-disable-line functional/no-conditional-statement
    throw new ApiError(400, 'Invalid sru url');
  }

  const debug = createDebugLogger('@natlibfi/melinda-commons:subRecordPicker');
  debug(`SRU client url: ${sruUrl}`);
  const sruClient = createSruClient({url: sruUrl, recordSchema: 'marcxml', retrieveAll});

  return {readSomeSubrecords, readAllSubrecords};

  function readSomeSubrecords(recordId, offset = 1) {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const records = [];
      sruClient.searchRetrieve(`melinda.partsofhost=${recordId}`, {startRecord: offset})
        .on('record', async xmlString => {
          records.push(await MARCXML.from(xmlString, {subfieldValues: false})); // eslint-disable-line functional/immutable-data
        })
        .on('end', async nextRecordOffset => {
          await Promise.all(records);
          resolve({nextRecordOffset, records});
        })
        .on('error', err => reject(err));
    });
  }

  function readAllSubrecords(recordId) {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const records = [];
      sruClient.searchRetrieve(`melinda.partsofhost=${recordId}`)
        .on('record', async xmlString => {
          records.push(await MARCXML.from(xmlString, {subfieldValues: false})); // eslint-disable-line functional/immutable-data
        })
        .on('end', async () => {
          await Promise.all(records);
          resolve({records});
        })
        .on('error', err => reject(err));
    });
  }
}
