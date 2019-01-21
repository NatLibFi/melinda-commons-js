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

// Needed for Rewire to work
import console from 'console';

export function createAuthorizationHeader(username, password = '') {
	const encoded = Buffer.from(`${username}:${password}`).toString('base64');
	return `Basic ${encoded}`;
}

export function isDeletedRecord(record) {
	return record
		.get(/^STA$/)
		.some(f => f.subfields.some(sf => sf.code === 'a' && sf.value === 'DELETED'));
}

export function readEnvironmentVariable(name, defaultValue, opts = {}) {
	if (process.env[name] === undefined) {
		if (defaultValue === undefined) {
			throw new Error(`Mandatory environment variable missing: ${name}`);
		}

		const loggedDefaultValue = opts.hideDefaultValue ? '[hidden]' : defaultValue;
		console.log(`No environment variable set for ${name}, using default value: ${loggedDefaultValue}`);
	}

	return process.env[name] || defaultValue;
}
