import {createLogger} from './utils';
import {MarcRecord} from '@natlibfi/marc-record';
import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';

// Change to true when working
MarcRecord.setValidationOptions({subfieldValues: false});

export function createSubrecordPicker(sruURL) {
	const logger = createLogger();
	const sruClient = createSruClient({url: sruURL, recordSchema: 'marcxml'});

	return {
		readSubrecords
	};

	function readSubrecords(id) {
		logger.log('verbose', `Picking subrecords for ${id}`);
		return new Promise((resolve, reject) => {
			const records = [];
			sruClient.searchRetrieve(`melinda.partsofhost=${id}`)
				.on('record', xmlString => {
					records.push(MARCXML.from(xmlString));
				})
				.on('end', () => resolve(records))
				.on('error', err => reject(err));
		});
	}
}
