import fetch from 'node-fetch';
import httpStatus from 'http-status';
import {URL} from 'url';
import {createLogger, logError, generateAuthorizationHeader} from './utils';
import ApiError from './error';
import {MarcRecord} from '@natlibfi/marc-record';

// Change to true when working
MarcRecord.setValidationOptions({fields: false, subfields: false, subfieldValues: false});

export function createApiClient({restApiUrl, restApiUsername, restApiPassword, cataloger = false, userAgent = 'Melinda commons API client / Javascript'}) {
	const logger = createLogger();
	const Authorization = generateAuthorizationHeader(restApiUsername, restApiPassword);

	const defaultParamsBulk = cataloger ? {pCatalogerIn: cataloger} : {};
	const defaultParamsPrio = cataloger ? {cataloger} : {};

	return {
		getRecord, postPrio, postBulk, getMetadata,
		getStatus, deleteBulk
	};

	function getRecord(recordId, params = false) {
		logger.log('silly', 'Getting record');
		if (params) {
			return doRequest({method: 'get', path: recordId, params});
		}

		return doRequest({method: 'get', path: recordId});
	}

	function postPrio({params, contentType, body}, id = false) {
		if (id) {
			logger.log('silly', `Posting prio update ${id}`);
			return doRequest({method: 'post', path: id, params: {...defaultParamsPrio, ...params}, contentType, body});
		}

		logger.log('silly', 'Posting prio create');
		return doRequest({method: 'post', path: '', params: {...defaultParamsPrio, ...params}, contentType, body});
	}

	function postBulk({params, contentType, body}) {
		logger.log('silly', 'Posting bulk');
		return doRequest({method: 'post', path: 'bulk/', params: {...defaultParamsBulk, ...params}, contentType, body});
	}

	function getMetadata({id}) {
		logger.log('silly', 'Getting metadata');
		return doRequest({method: 'get', path: 'bulk/', params: {id}});
	}

	async function getStatus({id}) {
		logger.log('silly', 'Getting status');
		const [result] = await getMetadata({id});
		return result.queueItemState;
	}

	function deleteBulk({id}) {
		logger.log('silly', 'Deleting bulk');
		return doRequest({method: 'delete', path: 'bulk/', params: {id}});
	}

	async function doRequest({method, path, params = false, contentType = 'application/json', body = null}) {
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
					'content-type': contentType,
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
						const value = data.value || data;
						return value;
					}

					return data;
				}

				if (method === 'get') {
					const data = await response.json();
					const record = new MarcRecord(data.record);
					const subrecords = (data.subrecords === []) ? [] : data.subrecords.map(record => new MarcRecord(record));
					return {record, subrecords};
				}

				if (path === '') {
					// Create prio
					const recordId = response.headers.get('Record-ID') || undefined;
					logger.log('silly', `Response data: ${JSON.stringify(recordId)}`);
					return {recordId};
				}

				// Validation results & default
				const data = await response.json();
				logger.log('debug', `Response data: ${JSON.stringify(data)}`);
				return data;
			}

			throw new ApiError(response.status, await response.text());
		} catch (error) {
			logger.log('debug', 'Api-client Error');
			if (error instanceof ApiError) {
				throw error;
			}

			logError(error);
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Unexpected internal error');
		}
	}
}
