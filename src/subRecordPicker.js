import {default as createSruClient} from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import createDebugLogger from 'debug';
import ApiError from './error.js';

export function createSubrecordPicker(sruUrl, retrieveAll = false) {
  if (sruUrl === undefined) {
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
          promises.push(MARCXML.from(xmlString, {subfieldValues: false}));
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
          promises.push(MARCXML.from(xmlString, {subfieldValues: false}));
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
