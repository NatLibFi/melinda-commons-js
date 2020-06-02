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

import {readFileSync} from 'fs';
import passport from 'passport';
import {v4 as uuid} from 'uuid';
import {BasicStrategy} from 'passport-http';
import {Strategy as BearerStrategy} from 'passport-http-bearer';
import {clone} from '../utils';

import {
	BearerCredentialsStrategy as CrowdCredentialsStrategy,
	BearerTokenStrategy as CrowdTokenStrategy
} from '@natlibfi/passport-atlassian-crowd';

import {createLogger} from '../utils';

export function generatePassportMiddlewares({crowd, localUsers}) {
	const logger = createLogger();

	if (crowd.url && crowd.appName && crowd.appPassword) {
		return initCrowdMiddlewares();
	}

	if (typeof localUsers === 'string') {
		return initLocalMiddlewares();
	}

	throw new Error('No configuration for passport strategies');

	function initCrowdMiddlewares() {
		passport.use(new CrowdCredentialsStrategy(crowd));
		passport.use(new CrowdTokenStrategy({
			...crowd,
			useCache: crowd.useCache, fetchGroupMembership: crowd.fetchGroupMembership
		}));

		logger.log('info', 'Enabling Crowd passport strategies');

		return {
			credentials: passport.authenticate('atlassian-crowd-bearer-credentials', {session: false}),
			token: passport.authenticate('atlassian-crowd-bearer-token', {session: false})
		};
	}

	function initLocalMiddlewares() {
		const users = parseUsers();
		const localSessions = {};

		passport.use(new BasicStrategy(localBasicCallback));
		passport.use(new BearerStrategy(localBearerCallback));

		logger.log('info', 'Enabling local passport strategies');

		return {
			credentials: passport.authenticate('basic', {session: false}),
			token: passport.authenticate('bearer', {session: false})
		};

		function parseUsers() {
			if (localUsers.startsWith('file://')) {
				const str = readFileSync(localUsers.replace(/^file:\/\//, ''), 'utf8');
				return parse(str);
			}

			return parse(localUsers);

			function parse(str) {
				try {
					return JSON.parse(str);
				} catch (err) {
					throw new Error('Could not parse local users');
				}
			}
		}

		function localBasicCallback(reqUsername, reqPassword, done) {
			const user = users.find(({id, password}) => {
				return reqUsername === id && reqPassword === password;
			});

			if (user) {
				const token = getToken();
				done(null, token);
			} else {
				done(null, false);
			}

			function getToken() {
				const existingToken = Object.keys(localSessions).find(token => {
					const userInfo = localSessions[token];
					return userInfo.id === user.username;
				});

				if (existingToken) {
					return existingToken;
				}

				const newToken = uuid().replace(/-/g, '');
				localSessions[newToken] = removePassword(user);

				return newToken;

				function removePassword(userData) {
					return Object.keys(clone(userData)).filter(k => k !== 'password').reduce((acc, key) => {
						return {...acc, [key]: userData[key]};
					}, {});
				}
			}
		}

		function localBearerCallback(reqToken, done) {
			const entry = Object.entries(localSessions).find(([token]) => {
				return reqToken === token;
			});

			if (entry) {
				done(null, entry[1]);
			} else {
				done(null, false);
			}
		}
	}
}
