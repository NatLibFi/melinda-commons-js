import {MarcRecord} from '@natlibfi/marc-record';

// Aleph creates partial subfields...
MarcRecord.setValidationOptions({subfieldValues: false});

export * from './utils.ts';
export * from './backendUtils.ts';
export {millisecondsToString} from './millisecondsToString.ts';

export {default as Error} from './error.ts';
export {createSubrecordPicker} from './subRecordPicker.ts';
export type {SubrecordPicker, SubrecordAmount, SomeSubrecords, AllSubrecords} from './subRecordPicker.ts';
