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

export function generateAuthorizationHeader(username, password = '') {
	const encoded = Buffer.from(`${username}:${password}`).toString('base64');
	return `Basic ${encoded}`;
}

export function isDeletedRecord(record) {
	return record
		.get(/^STA$/)
		.some(f => f.subfields.some(sf => sf.code === 'a' && sf.value === 'DELETED'));
}

export function readEnvironmentVariable(name, {defaultValue = undefined, hideDefault = false, format = v => v} = {}) {
	if (process.env[name] === undefined) {
		if (defaultValue === undefined) {
			throw new Error(`Mandatory environment variable missing: ${name}`);
		}

		const defaultValuePrintable = typeof defaultValue === 'object' ? JSON.stringify(defaultValue) : defaultValue;

		console.log(`No environment variable set for ${name}, using default value: ${hideDefault ? '[hidden]' : defaultValuePrintable}`);
		return defaultValue;
	}

	return format(process.env[name]);
}

export function createLogger(options = {}) {
	return winston.createLogger({...createLoggerOptions(), ...options});
}

export function createExpressLogger(options = {}) {
	return expressWinston.logger({
		meta: true,
		msg: '{{req.ip}} HTTP {{req.method}} {{req.path}} - {{res.statusCode}} {{res.responseTime}}ms',
		ignoreRoute: () => false,
		...createLoggerOptions(),
		...options
	});
}

function createLoggerOptions() {
	const debuggingEnabled = parseBoolean(process.env.DEBUG);
	const timestamp = winston.format(info => {
		info.timestamp = moment().format();
		return info;
	});

	return {
		format: winston.format.combine(timestamp(), winston.format.printf(formatMessage)),
		transports: [
			new winston.transports.Console({
				level: debuggingEnabled ? 'debug' : 'info',
				silent: process.env.NODE_ENV === 'test' && !debuggingEnabled
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

export function handleInterrupt(arg) {
	if (arg instanceof Error) {
		console.error(`Uncaught Exception: ${arg.stack}`);
	// Signal
	} else {
		console.log(`Received ${arg}`);
	}

	process.exit(1);
}

export function parseBoolean(value) {
	if (value === undefined) {
		return false;
	}

	if (Number.isNaN(Number(value))) {
		return value.length > 0 && value !== 'false';
	}

	return Boolean(Number(value));
}

export function getRecordTag(record) {
	const id = getId();
	const title = getTitle();

	if (id && title) {
		return `${title} (${id})`;
	}

	return id ? id : title;

	function getId() {
		const field = record
			.get(/^(020|022|024)$/)
			.find(f => f.subfields.some(sf => ['a', 'z'].includes(sf.code)));

		if (field) {
			return field.subfields.find(sf => ['a', 'z'].includes(sf.code)).value;
		}

		return '';
	}

	function getTitle() {
		const TRIM_PATTERN = '[?!.,(){}:;/\\ ]*';
		const field = record
			.get(/^245$/)
			.find(f => f.subfields.some(sf => sf.code === 'a'));

		if (field) {
			return field.subfields.find(sf => sf.code === 'a').value
				.replace(new RegExp(`^${TRIM_PATTERN}`), '')
				.replace(new RegExp(`${TRIM_PATTERN}$`), '');
		}

		return '';
	}
}
