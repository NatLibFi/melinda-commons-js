import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';

export function createSubrecordPicker(sruUrl, retrieveAll = false) {
  const sruClient = createSruClient({url: sruUrl, recordSchema: 'marcxml', retrieveAll});
  const debug = createDebugLogger('@natlibfi/melinda-commons:subRecordPicker');

  return {readSubrecords};

  function readSubrecords(recordId) {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const records = [];
      sruClient.searchRetrieve(`melinda.partsofhost=${recordId}`)
        .on('record', xmlString => {
          records.push(MARCXML.from(xmlString)); // eslint-disable-line functional/immutable-data
        })
        .on('end', () => resolve(records))
        .on('error', err => reject(err));
    });
  }
}
