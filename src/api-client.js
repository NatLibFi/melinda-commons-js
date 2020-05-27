import fetch from 'node-fetch';
import httpStatus from 'http-status';
import {URL} from 'url';
import {createLogger, logError, generateAuthorizationHeader} from './utils';
import ApiError from './error';

export function createApiClient({restApiUrl, restApiUsername, restApiPassword, userAgent = 'Melinda commons API client / Javascript'}) {
	const logger = createLogger();
	const Authorization = generateAuthorizationHeader(restApiUsername, restApiPassword);

	return {
		getRecord, postPrio, postBulk, getMetadata,
		getStatus, deleteBulk
	};

	function getRecord(recordId, params = false) {
		logger.log('verbose', 'Getting record');
		if (params) {
			return doRequest({method: 'get', path: recordId, params});
		}

		return doRequest({method: 'get', path: recordId});
	}

	function postPrio({params, contentType, body}, id = false) {
		if (id) {
			logger.log('verbose', `Posting prio update ${id}`);
			return doRequest({method: 'post', path: id, params, contentType, body});
		}

		logger.log('verbose', 'Posting prio create');
		return doRequest({method: 'post', path: '', params, contentType, body});
	}

	function postBulk({params, contentType, body}) {
		logger.log('verbose', 'Posting bulk');
		return doRequest({method: 'post', path: 'bulk/', params, contentType, body});
	}

	function getMetadata({id}) {
		logger.log('verbose', 'Getting metadata');
		return doRequest({method: 'get', path: 'bulk/', params: {id}});
	}

	async function getStatus({id}) {
		logger.log('verbose', 'Getting status');
		const result = await getMetadata({id});
		return result.queueItemState;
	}

	function deleteBulk({id}) {
		logger.log('verbose', 'Deleting bulk');
		return doRequest({method: 'delete', path: 'bulk/', params: {id}});
	}

	async function doRequest({method, path, params = false, contentType = 'application/json', body = null}) {
		logger.log('verbose', 'Doing request');
		try {
			const query = params ? new URLSearchParams(params) : '';
			const url = new URL(`${restApiUrl}${path}${query === '' ? '' : '?'}${query}`);

			logger.log('silly', `connection URL ${url.toString()}`);
			logger.log('silly', JSON.stringify(body, undefined, ' ');)

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

			logger.log('debug', `Response status: ${response.status}`);

			if (response.status === httpStatus.OK || response.status === httpStatus.CREATED) {
				if (path === 'bulk/') {
					if (method === 'get') {
						// Get Bulk
						const [data] = await response.json();
						if (data === undefined) { // eslint-disable-line functional/no-conditional-statement
							throw new ApiError(httpStatus.NOT_FOUND, 'Queue item not found!');
						}

						return {data};
					}

					// Post bulk
					if (method === 'post') {
						const result = await response.json();
						const data = result.value || result;
						return data;
					}
				}

				if (path === '') {
					// Create prio
					const id = response.headers.get('Record-ID') || undefined;
					return {id};
				}

				// Validation results & default
				const data = await response.json();
				return data;
			}

			throw new ApiError(response.status, await response.text());
		} catch (error) {
			logger.log('debug', 'Api-client Error');
			if (error instanceof ApiError) { // eslint-disable-line functional/no-conditional-statement
				throw error;
			}

			logError(error);
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Unexpected internal error');
		}
	}
}
