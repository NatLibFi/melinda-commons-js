import {default as createSruClient} from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import type {MarcRecord} from '@natlibfi/marc-record';
import createDebugLogger from 'debug';
import ApiError from './error.ts';

const componentIndex = 'melinda.partsofhost';
const monoHostComponentIndex = 'melinda.partsofmonohost';

export interface SubrecordAmount {
  amount: number;
}

export interface SomeSubrecords extends SubrecordAmount {
  nextRecordOffset: number;
  records: MarcRecord[];
}

export interface AllSubrecords extends SubrecordAmount {
  records: MarcRecord[];
}

export interface SubrecordPicker {
  readSubrecordAmount(recordId: string): Promise<SubrecordAmount>;
  readSomeSubrecords(recordId: string, offset?: number): Promise<SomeSubrecords>;
  readAllSubrecords(recordId: string): Promise<AllSubrecords>;
}

export function createSubrecordPicker(sruUrl?: string, retrieveAll = false, monoHostComponentsOnly = false): SubrecordPicker {

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

  function readSubrecordAmount(recordId: string): Promise<SubrecordAmount> {
    debug(`Getting subrecord amount for ${recordId}`);
    return new Promise((resolve, reject) => {
      sruClientForAmount.searchRetrieve(`${index}=${recordId}`)
        .on('total', totalNumberOfRecords => {
          resolve({amount: totalNumberOfRecords});
        })
        .on('error', err => reject(err));
    });
  }

  function readSomeSubrecords(recordId: string, offset = 1): Promise<SomeSubrecords> {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const promises: Promise<MarcRecord>[] = [];
      let amount: number | undefined;
      sruClient.searchRetrieve(`${index}=${recordId}`, {startRecord: offset})
        .on('total', totalNumberOfRecords => {
          amount = totalNumberOfRecords;
        })
        .on('record', xmlString => {
          promises.push(MARCXML.from(xmlString, {subfieldValues: false}));
        })
        .on('end', async nextRecordOffset => {
          try {
            const records = await Promise.all(promises);
            // amount is set by the 'total' event which always precedes 'end'
            resolve({nextRecordOffset, records, amount: amount!});
          } catch (error) {
            reject(error);
          }
        })
        .on('error', err => reject(err));
    });
  }

  function readAllSubrecords(recordId: string): Promise<AllSubrecords> {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const promises: Promise<MarcRecord>[] = [];
      let amount: number | undefined;
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
            // amount is set by the 'total' event which always precedes 'end'
            resolve({records, amount: amount!});
          } catch (error) {
            reject(error);
          }
        })
        .on('error', err => reject(err));
    });
  }
}
