import fetch from 'node-fetch';
import httpStatus from 'http-status';
import {URL} from 'url';
import {createLogger} from './utils';
import {ApiError} from './error';

export function createApiClient({restApiUrl, restApiUsername, restApiPassword, userAgent = 'Melinda commons API client / Javascript'}) {
    const logger = createLogger();

    return {
        getRecord, postPrio, postBulk, getMetadata,
        getStatus, deleteBulk
    };

    async function getRecord(recordId) {
        return doRequest({method: 'get', path: recordId});
    }

    async function postPrio({params, contentType, body}, id = false) {
        if (id) {
            return doRequest({method: 'post', path: id, params, contentType, body});
        }

        return doRequest({method: 'post', path: '', params, contentType, body});
    }

    async function postBulk({params, contentType, body}) {
        return doRequest({method: 'post', path: 'bulk/', params, contentType, body});
    }

    async function getMetadata({id}) {
        return doRequest({method: 'get', path: 'bulk/', params: {id}});
    }

    async function getStatus({id}) {
        const result = await getMetadata({id});
        return result.queueItemState;
    }

    async function deleteBulk({id}) {
        return doRequest({method: 'delete', path: 'bulk/', params: {id}});
    }

    async function doRequest({method, path, params = false, contentType = 'application/json', body = null}) {
        try {
            const query = params ? new URLSearchParams(params) : '';
            const url = new URL(`${restApiUrl}${path}${query === '' ? '' : '?'}${query}`);

            logger.log('silly', url.toString());

            const response = await fetch(url, {
                method,
                headers: {
                    'User-Agent': userAgent,
                    'content-type': contentType,
                    'Authorization': `Basic ${Buffer.from(`${restApiUsername}:${restApiPassword}`).toString('base64')}`,
                    'Accept': 'application/json'
                },
                body
            });

            logger.log('silly', `Response status: ${response.status}`);

            if (response.status === httpStatus.OK || response.status === httpStatus.CREATED) {
                if (method === 'get') {
                    const [data] = await response.json();
                    if (data === undefined) { // eslint-disable-line functional/no-conditional-statement
                        throw new ApiError(404, `Queue item ${correlationId} not found!`);
                    }

                    return {data};
                }

                const id = response.headers.get('Record-ID') || undefined;
                const response = await response.json();
                const data = response.value ? response.value : response;
                return {id, data};
            }

            throw new ApiError(response.status, await response.text());
        } catch (error) {
            logger.log('error', error);
            if (error instanceof ApiError) { // eslint-disable-line functional/no-conditional-statement
                throw error;
            }
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Unexpected internal error');
        }
    }
}