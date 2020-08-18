import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';

export function createSubrecordPicker(sruUrl) {
	const logger = createLogger();
	const sruClient = createSruClient({url: sruUrl, recordSchema: 'marcxml'});

	return {readSubrecords};

	function readSubrecords(recordId) {
		logger.log('verbose', `Picking subrecords for ${recordId}`);
		return new Promise((resolve, reject) => {
			const records = [];
			sruClient.searchRetrieve(`melinda.partsofhost=${recordId}`)
				.on('record', xmlString => {
					records.push(MARCXML.from(xmlString));
				})
				.on('end', () => resolve(records))
				.on('error', err => reject(err));
		});
	}
}