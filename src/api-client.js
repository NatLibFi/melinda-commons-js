import fetch from 'node-fetch';
import httpStatus from 'http-status';
import {URL} from 'url';
import {createLogger, logError, generateAuthorizationHeader} from './utils';
import ApiError from './error';
import {MarcRecord} from '@natlibfi/marc-record';

// Change to true when working
MarcRecord.setValidationOptions({subfieldValues: false});

export function createApiClient({restApiUrl, restApiUsername, restApiPassword, cataloger = false, userAgent = 'Melinda commons API client / Javascript'}) {
	const logger = createLogger();
	const Authorization = generateAuthorizationHeader(restApiUsername, restApiPassword);

	const defaultParamsBulk = cataloger ? {pCatalogerIn: cataloger} : {};
	const defaultParamsPrio = cataloger ? {cataloger} : {};

	return {
		read, create, update, createBulk, readBulk
	};

	function read(recordId) {
		logger.log('silly', 'Reading record');
		return doRequest({method: 'get', path: recordId});
	}

	function create(record, params) {
		logger.log('silly', 'Posting create');
		return doRequest({method: 'post', path: '', params: {...defaultParamsPrio, ...params}, body: record});
	}

	function update(record, id, params) {
		logger.log('silly', `Posting update ${id}`);
		return doRequest({method: 'post', path: id, params: {...defaultParamsPrio, ...params}, body: record});
	}

	function createBulk(records, params) {
		logger.log('silly', 'Posting bulk');
		return doRequest({method: 'post', path: 'bulk/', params: {...defaultParamsBulk, ...params}, body: records});
	}

	function readBulk(id) {
		logger.log('silly', 'Reading bulk metadata');
		return doRequest({method: 'get', path: 'bulk/', params: {id}});
	}

	async function doRequest({method, path, params = false, body = null}) {
		logger.log('silly', 'Doing request');
		try {
			const query = params ? new URLSearchParams(params) : '';
			const url = new URL(`${restApiUrl}${path}${query === '' ? '' : '?'}${query}`);

			logger.log('silly', `connection URL ${url.toString()}`);
			logger.log('silly', JSON.stringify(body, undefined, ''));

			const response = await fetch(url, {
				method,
				headers: {
					'User-Agent': userAgent,
					'content-type': 'application/json',
					Authorization,
					Accept: 'application/json'
				},
				body
			});

			logger.log('http', `${path === 'bulk/' ? 'Bulk' : 'Prio'} ${method} status: ${response.status}`);

			if (response.status === httpStatus.OK || response.status === httpStatus.CREATED) {
				if (path === 'bulk/') {
					const data = await response.json();
					logger.log('silly', `Response data: ${JSON.stringify(data)}`);
					if (method === 'post') {
						// Post to bulk
						const value = data.value || data;
						return value;
					}

					// Querry bulk status
					return data;
				}

				if (method === 'get') {
					const data = await response.json();
					logger.log('silly', `Response data: ${JSON.stringify(data)}`);
					if (params === false || params.subrecords === 0) {
						// Get just one record
						const record = new MarcRecord(parseJson(data));
						return {record, subrecords: []};
					}

					// Get record and subrecords
					const record = new MarcRecord(parseJson(data.record));
					const subrecords = (data.subrecords === undefined || data.subrecords === []) ? [] : data.subrecords.map(record => new MarcRecord(parseJson(record)));
					return {record, subrecords};
				}

				if (path === '') {
					// Create new record
					const recordId = response.headers.get('Record-ID') || undefined;
					logger.log('silly', `Response data: ${JSON.stringify(recordId)}`);
					return {recordId};
				}

				// Validation results & update record
				const data = await response.json();
				logger.log('silly', `Response data: ${JSON.stringify(data)}`);
				return data;
			}

			logger.log('error', response);
			throw new ApiError(response.status);
		} catch (error) {
			logger.log('debug', 'Api-client Error');
			if (error instanceof ApiError) {
				throw error;
			}

			logError(error);
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Unexpected internal error');
		}
	}

	function parseJson(record) {
		if (typeof record === 'string') {
			return JSON.parse(record);
		}

		return record;
	}
}
