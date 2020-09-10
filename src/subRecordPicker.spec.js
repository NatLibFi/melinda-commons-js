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

import {expect} from 'chai';
import {createSubrecordPicker} from './subRecordPicker';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen-http-client';
import {MarcRecord} from '@natlibfi/marc-record';

describe('subRecordPicker', () => {
  const sruUrl = 'https://sru';
  const retrieveAll = false;

  describe('createSubrecordPicker', () => {
    it('Client should have methods', () => {
      const client = createSubrecordPicker(sruUrl, retrieveAll);
      expect(client).to.respondTo('readAllSubrecords');
      expect(client).to.respondTo('readSomeSubrecords');
    });

    it('Create client should work with just one parametter', () => {
      const client = createSubrecordPicker(sruUrl);
      expect(client).to.respondTo('readAllSubrecords');
      expect(client).to.respondTo('readSomeSubrecords');
    });

    it('Create client should have at least one parametter', () => {
      expect(createSubrecordPicker).to.throw();
    });
  });

  generateTests({
    callback,
    path: [__dirname, '..', 'test-fixtures', 'subRecordPicker']
  });

  async function callback({getFixture, method, sruUrl, retrieveAll, recordId}) {
    const client = createSubrecordPicker(sruUrl, retrieveAll);
    const expectedRecords = getFixture({components: ['expected-records.json'], reader: READERS.JSON});
    const {records} = await client[method](recordId);

    // Expect records to be marc records
    const [record] = records;
    expect(record).to.be.instanceof(MarcRecord);
    expect(format()).to.eql(expectedRecords);

    function format() {
      return records.map(r => r.toObject());
    }
  }

  console.log('OK'); // eslint-disable-line no-console
});
