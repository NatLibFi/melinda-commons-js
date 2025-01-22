import {MarcRecord} from '@natlibfi/marc-record';

// Aleph creates partial subfields...
MarcRecord.setValidationOptions({subfieldValues: false});

import {createSubrecordPicker} from './subRecordPicker';

export * from './utils';

export {default as Error} from './error';
export {createSubrecordPicker};
