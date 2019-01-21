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

import expressWinston from 'express-winston';
import winston from 'winston';
import moment from 'moment';
import {createCipher, createDecipher, randomBytes} from 'crypto';

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

export function createLogger() {
	return winston.createLogger(createLoggerOptions());
}

export function createExpressLogger() {
	return expressWinston.logger(Object.assign({
		meta: true,
		msg: '{{req.ip}} HTTP {{req.method}} {{req.path}} - {{res.statusCode}} {{res.responseTime}}ms',
		ignoreRoute: () => false
	}, createLoggerOptions()));
}

function createLoggerOptions() {
	const timestamp = winston.format(info => {
		info.timestamp = moment().format();
		return info;
	});

	return {
		format: winston.format.combine(timestamp(), winston.format.printf(formatMessage)),
		transports: [
			new winston.transports.Console({
				level: process.env.DEBUG ? 'debug' : 'info',
				silent: process.env.NODE_ENV === 'test'
			})
		]
	};

	function formatMessage(i) {
		return `${i.timestamp} - ${i.level}: ${i.message}`;
	}
}

export function generateEncryptionKey() {
	return randomBytes(32).toString('base64');
}

// Do not use for very sensitive data (Implement IV-based encryption)
export function encryptString({key, value, algorithm, encoding = 'base64'}) {
	const Cipher = createCipher(algorithm, key);
	return Cipher.update(value, 'utf8', encoding) + Cipher.final(encoding);
}

export function decryptString({key, value, algorithm, encoding = 'base64'}) {
	const Decipher = createDecipher(algorithm, key);
	return Decipher.update(value, encoding, 'utf8') + Decipher.final('utf8');
}
