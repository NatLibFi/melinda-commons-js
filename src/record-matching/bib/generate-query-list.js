/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Shared modules for Melinda's software
*
* Copyright (C) 2018-2020 University Of Helsinki (The National Library Of Finland)
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

export function generateIdentifierQueries(record) {
	const identifiers = getStandardIdentifiers();
	return identifiers.map(id => `dc.identifier=${id}`);

	function getStandardIdentifiers() {
		return record.get(/^020|022|024$/)
			.reduce((acc, field) => {
				const codes = ['a', 'z'];
				field.subfields
					.forEach(sub => {
						if (codes.includes(sub.code) && !acc.includes(sub.value)) {
							acc.push(sub.value);
						}
					});

				return acc;
			}, []);
	}
}

export function generateTitleQueries(record) {
	const title = getTitle();

	return [`dc.title="${title}*"`];

	function getTitle() {
		const STRIP_PATTERN = '[\\s\\]\\[":;,.-?\'=+\\*]*';
		const startPattern = new RegExp(`^${STRIP_PATTERN}`, 'g');
		const endPattern = new RegExp(`${STRIP_PATTERN}$`, 'g');
		const field = record.get(/^245$/).shift();

		// Normalize
		if (field && field.subfields.some((sf => sf.code === 'a'))) {
			return field.subfields.find(sf => sf.code === 'a').value
				.replace(startPattern, ' ')
				.replace(endPattern, ' ')
				.substr(0, 20)
				.trim();
		}
	}
}
