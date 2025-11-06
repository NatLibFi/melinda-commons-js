import {default as createSruClient} from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import createDebugLogger from 'debug';
import ApiError from './error.js';

const componentIndex = 'melinda.partsofhost';
const monoHostComponentIndex = 'melinda.partsofmonohost';

export function createSubrecordPicker(sruUrl, retrieveAll = false, monoHostComponentsOnly = false) {

  const debug = createDebugLogger('@natlibfi/melinda-commons:subRecordPicker');

  debug(`SRU client url: ${sruUrl}`);
  if (sruUrl === undefined) {
    throw new ApiError(400, 'Invalid sru url');
  }

  const sruClient = createSruClient({url: sruUrl, recordSchema: 'marcxml', retrieveAll});
  // SRU client with maxRecordsPerRequest does not retrieve any records
  const sruClientForAmount = createSruClient({url: sruUrl, recordSchema: 'marcxml', retrieveAll, maxRecordsPerRequest: 0});

  const index = monoHostComponentsOnly ? monoHostComponentIndex : componentIndex;
  debug(`Using index ${index}, (monoHostComponentsOnly: ${monoHostComponentsOnly})`);

  return {readSubrecordAmount, readSomeSubrecords, readAllSubrecords};

  function readSubrecordAmount(recordId) {
    debug(`Getting subrecord amount for ${recordId}`);
    return new Promise((resolve, reject) => {
      sruClientForAmount.searchRetrieve(`${index}=${recordId}`)
        .on('total', totalNumberOfRecords => {
          resolve({amount: totalNumberOfRecords});
        })
        .on('error', err => reject(err));
    });
  }

  function readSomeSubrecords(recordId, offset = 1) {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const promises = [];
      // eslint-disable-next-line functional/no-let
      let amount;
      sruClient.searchRetrieve(`${index}=${recordId}`, {startRecord: offset})
        .on('total', totalNumberOfRecords => {
          // eslint-disable-next-line no-const-assign
          amount = totalNumberOfRecords;
        })
        .on('record', xmlString => {
          promises.push(MARCXML.from(xmlString, {subfieldValues: false}));
        })
        .on('end', async nextRecordOffset => {
          try {
            const records = await Promise.all(promises);
            resolve({nextRecordOffset, records, amount});
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
      let amount;
      sruClient.searchRetrieve(`${index}=${recordId}`)
        .on('total', totalNumberOfRecords => {
          amount = totalNumberOfRecords;
        })
        .on('record', xmlString => {
          promises.push(MARCXML.from(xmlString, {subfieldValues: false}));
        })
        .on('end', async () => {
          try {
            const records = await Promise.all(promises);
            resolve({records, amount});
          } catch (error) {
            reject(error);
          }
        })
        .on('error', err => reject(err));
    });
  }
}
