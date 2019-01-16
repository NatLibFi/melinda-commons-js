/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* RESTful API for Melinda
*
* Copyright (C) 2018-2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-rest-api
*
* melinda-rest-api program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-rest-api is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

export default function (record) {
	const identifiers = generateIdentifierQueries();
	const title = generateTitleQueries();

	return identifiers.concat(title);

	function generateIdentifierQueries() {
		const {tag, identifiers} = getStandardIdentifiers();
		return identifiers.map(identifier => {
			return tag === '020' ? `bath.isbn=${identifier}` : `bath.issn=${identifier}`;
		});

		function getStandardIdentifiers() {
			return record.get(/^020|022$/)
				.reduce((acc, field) => {
					if (acc.tag) {
						if (acc.tag === field.tag) {
							acc.identifiers.push(field.subfields.find(sf => sf.code === 'a').value);
							return acc;
						}

						return acc;
					}

					return {
						tag: field.tag,
						identifiers: [field.subfields.find(sf => sf.code === 'a').value]
					};
				}, {tag: undefined, identifiers: []});
		}
	}

	function generateTitleQueries() {
		const title = getTitle();

		return [`dc.title=${title}`];

		function getTitle() {
			const field = record.get(/^245$/).shift();

			// Normalize
			if (field) {
				return field.subfields.find(sf => sf.code === 'a').value
					.replace(/[\][":;,.-?'=+/]/g, ' ')
					.substr(0, 20)
					.trim();
			}
		}
	}
}
