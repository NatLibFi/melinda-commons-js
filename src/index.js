import {MarcRecord} from '@natlibfi/marc-record';

// Aleph creates partial subfields...
MarcRecord.setValidationOptions({subfieldValues: false});

import {createSubrecordPicker} from './subRecordPicker.js';

export * from './utils.js';

export {default as Error} from './error.js';
export {createSubrecordPicker};
