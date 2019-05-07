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

import passport from 'passport';
import uuid from 'uuid/v4';
import {BasicStrategy} from 'passport-http';
import {Strategy as BearerStrategy} from 'passport-http-bearer';

import {
	BearerCredentialsStrategy as CrowdCredentialsStrategy,
	BearerTokenStrategy as CrowdTokenStrategy
} from '@natlibfi/passport-atlassian-crowd';

import {createLogger} from '../utils';

export function generatePassportMiddlewares({crowd, localUsers}) {
	const Logger = createLogger();

	if (crowd.url && crowd.appName && crowd.appPassword) {
		return initCrowdMiddlewares();
	}

	if (Array.isArray(localUsers) && localUsers.length > 0) {
		return initLocalMiddlewares();
	}

	throw new Error('No configuration for passport strategies');

	function initCrowdMiddlewares() {
		passport.use(new CrowdCredentialsStrategy(crowd));
		passport.use(new CrowdTokenStrategy({
			...crowd,
			useCache: crowd.useCache, fetchGroupMembership: crowd.fetchGroupMembership
		}));

		Logger.log('info', 'Enabling Crowd passport strategies');

		return {
			credentials: passport.authenticate('atlassian-crowd-bearer-credentials', {session: false}),
			token: passport.authenticate('atlassian-crowd-bearer-token', {session: false})
		};
	}

	function initLocalMiddlewares() {
		const localSessions = {};

		passport.use(new BasicStrategy(localBasicCallback));
		passport.use(new BearerStrategy(localBearerCallback));

		Logger.log('info', 'Enabling local passport strategies');

		return {
			credentials: passport.authenticate('basic', {session: false}),
			token: passport.authenticate('bearer', {session: false})
		};

		function localBasicCallback(reqUsername, reqPassword, done) {
			const user = localUsers.find(({username, password}) => {
				return reqUsername === username && reqPassword === password;
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

				localSessions[newToken] = {
					id: user.username,
					name: {
						givenName: '',
						familyName: ''
					},
					displayName: user.username,
					emails: [{value: '', type: 'work'}],
					organization: [],
					groups: user.groups
				};

				return newToken;
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
