import fetch from 'node-fetch';
import httpStatus from 'http-status';
import {URL} from 'url';
import {Utils} from './utils';
import {ApiError} from './error';

const {createLogger} = Utils;

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
            return doRequest({method: 'post', path: id + '?', params, contentType, body});
        }

        return doRequest({method: 'post', path: '?', params, contentType, body});
    }

    async function postBulk({params, contentType, body}) {
        return doRequest({method: 'post', path: '?', params, contentType, body});
    }

    async function getMetadata({id}) {
        return doRequest({method: 'get', path: 'bulk/?', params: {id}});
    }

    async function getStatus({id}) {
        const result = await getMetadata({id});
        return result.queueItemState;
    }

    async function deleteBulk({id}) {
        return doRequest({method: 'delete', path: 'bulk/?', params: {id}});
    }

    async function doRequest({method, path, params = false, contentType = 'application/json', body = {body: ''}}) {
        const query = params ? new URLSearchParams(params) : '';
        const url = new URL(`${restApiUrl}${path}${query}`);

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

        if (response.status === httpStatus.OK || response.status === httpStatus.CREATED) {
            if (method === 'get') {
                const [result] = await response.json();

                if (result === undefined) { // eslint-disable-line functional/no-conditional-statement
                    throw new ApiError(404, `Queue item ${correlationId} not found!`);
                }

                return result;
            }

            const result = await response.json();

            return result;
        }

        throw new ApiError(response.status, await response.text());
    }
}