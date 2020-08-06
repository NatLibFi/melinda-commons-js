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

import OwnAuthorizationError from './error';

export function validateChanges(ownTags, incomingRecord, existingRecord) {
	const lowTags = getLowTags();

	if (lowTags.some(t => !ownTags.includes(t))) {
		throw new OwnAuthorizationError(403);
	}

	function getLowTags() {
		if (existingRecord) {
			const incomingTags = get(incomingRecord);
			const existingTags = get(existingRecord);

			const additions = incomingTags.reduce((acc, tag) => {
				return existingTags.includes(tag) ? acc : acc.concat(tag);
			}, []);

			const removals = existingTags.reduce((acc, tag) => {
				return incomingTags.includes(tag) ? acc : acc.concat(tag);
			}, []);

			// Concat and remove duplicates
			return additions.concat(removals).reduce((acc, tag) => {
				return acc.includes(tag) ? acc : acc.concat(tag);
			}, []);
		}

		return get(incomingRecord);

		// Get unique tags
		function get(record) {
			return record.get(/^LOW$/)
				.map(f => f.subfields.find(sf => sf.code === 'a').value)
				.reduce((acc, v) => {
					return acc.includes(v) ? acc : acc.concat(v);
				}, []);
		}
	}
}
