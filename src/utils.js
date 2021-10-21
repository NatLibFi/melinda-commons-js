/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Shared modules for Melinda's software
*
* Copyright (C) 2018-2021 University Of Helsinki (The National Library Of Finland)
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

export function generateAuthorizationHeader(username, password = '') {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

export function isDeletedRecord(record) {
  if (['d', 's', 'x'].includes(record.leader[5])) {
    return true;
  }

  return checkDel() || checkSta();

  function checkDel() {
    return record.get(/^DEL$/u).some(check);

    function check({subfields}) {
      return subfields.some(({code, value}) => code === 'a' && value === 'Y');
    }
  }

  function checkSta() {
    return record.get(/^STA$/u).some(check);

    function check({subfields}) {
      const values = ['DELETED', 'DELETED-SPLIT', 'DELETED-DEPRECATED'];
      return subfields.some(({code, value}) => code === 'a' && values.includes(value));
    }
  }
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

export function getRecordTitle(record) {
  const TRIM_PATTERN = '[?!.,(){}:;/ ]*';
  const field = record
    .get(/^245$/u)
    .find(f => f.subfields.some(sf => sf.code === 'a'));

  if (field) {
    return field.subfields.find(sf => sf.code === 'a').value
      .replace(new RegExp(`^${TRIM_PATTERN}`, 'u'), '')
      .replace(new RegExp(`${TRIM_PATTERN}$`, 'u'), '');
  }

  return '';
}

export function getRecordStandardIdentifiers(record) {
  return record.get(/^(?<def>020|022|024)$/u)
    .filter(f => f.subfields.some(sf => ['a', 'z'].includes(sf.code)))
    .map(field => {
      const subfield = field.subfields.find(sf => ['a', 'z'].includes(sf.code));
      return subfield.value;
    });
}

export function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function toAlephId(id) {
  return id.padStart(9, '0');
}

export function fromAlephId(id) {
  return id.replace(/^0+/u, '');
}
