/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Shared modules for Melinda's applications
*
* Copyright (C) 2018-2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-commons-js
*
* melinda-commons-js program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-commons-js is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import HttpStatus from 'http-status';
import fetch from 'node-fetch';
import {URL} from 'url';
import {DOMParser} from 'xmldom';
import {generateAuthorizationHeader} from '../../utils';

export class AuthenticationError extends Error {}

export function createService({xServiceURL, userLibrary, ownAuthzURL, ownAuthzApiKey}) {
	const xBaseURL = new URL(xServiceURL);

	xBaseURL.searchParams.set('op', 'user-auth');
	xBaseURL.searchParams.set('library', userLibrary);

	return {authenticate};

	async function authenticate({username, password}) {
		const requestURL = new URL(xBaseURL);

		requestURL.searchParams.set('staff_user', username);
		requestURL.searchParams.set('staff_pass', password);

		const response = await fetch(requestURL);
		const body = await response.text();

		if (response.status === HttpStatus.OK) {
			const doc = new DOMParser().parseFromString(body);

			checkForErrors(doc);

			const userInfo = parseUserInfo(doc);
			const ownTags = await getOwnTags(username);

			return Object.assign(userInfo, {authorization: ownTags});
		}

		throw new Error(body);

		function checkForErrors(doc) {
			if (invalidReply() || hasErrors()) {
				throw new AuthenticationError(body);
			}

			function invalidReply() {
				const nodeList = doc.getElementsByTagName('reply');
				return nodeList.length === 0 || (nodeList.length > 0 && nodeList.item(0).textContent !== 'ok');
			}

			function hasErrors() {
				return doc.getElementsByTagName('error').length > 0;
			}
		}

		/* Returns contact schema compliant profile: https://tools.ietf.org/html/draft-smarr-vcarddav-portable-contacts-00 */
		function parseUserInfo(doc) {
			const data = {id: username};
			const nodeList = doc.getElementsByTagName('z66').item(0).childNodes;

			for (let i = 0; i < nodeList.length; i++) {
				const node = nodeList.item(i);

				switch (node.nodeName) {
					case 'z66-email':
						data.emails = [{value: node.textContent, type: 'work'}];
						break;
					case 'z66-name':
						data.displayName = node.textContent;
						data.name = parseName(node.textContent);
						break;
					case 'z66-department':
						data.organization = [{name: node.textContent}];
						break;
					default:
						break;
				}
			}

			return data;

			function parseName(value) {
				const parts = value.split(/ /);
				const obj = {
					givenName: parts.shift(),
					familyName: parts.pop()
				};

				if (parts.length > 0) {
					obj.middleName = parts.join(' ');
				}

				return obj;
			}
		}

		async function getOwnTags(username) {
			const url = new URL(ownAuthzURL);
			url.searchParams.set('username', username);

			const response = await fetch(url, {headers: {
				Authorization: generateAuthorizationHeader(ownAuthzApiKey)
			}});

			if (response.status === HttpStatus.OK) {
				return response.json();
			}

			throw new Error(await response.text());
		}
	}
}
