#!/usr/bin/env node
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

import {createHmac} from 'crypto';
import {encode as b64Encode} from 'base64-url';

const {JWT_KEY: jwtKey} = process.env;
const id = process.argv[2];

if (jwtKey && id) {
	const payload = {id};
	const header = {
		alg: 'HS256',
		typ: 'JWT'
	};

	const start = `${b64Encode(JSON.stringify(header))}.${b64Encode(JSON.stringify(payload))}`;
	const signature = createHmac('SHA256', jwtKey).update(start).digest();

	console.log(`${start}.${b64Encode(signature)}`);
	process.exit();
}

console.error('USAGE: gen-jwt-token <id>');
console.error();
console.error('Mandatory parameteters missing. JWT_KEY environment variable must be set and application id must be passed as a positional argument');
process.exit(1);

