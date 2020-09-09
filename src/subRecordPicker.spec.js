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

import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {MarcRecord} from '@natlibfi/marc-record';
import {createSubrecordPicker} from './subRecordPicker';
// import apiError from './error';

MarcRecord.setValidationOptions({subfieldValues: false});

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/subRecordPicker');

const allIn = fs.readFileSync(path.join(FIXTURES_PATH, 'readAllSubrecords-in'), 'utf8');
const allOut = fs.readFileSync(path.join(FIXTURES_PATH, 'readAllSubrecords-out'), 'utf8');
const someIn = fs.readFileSync(path.join(FIXTURES_PATH, 'readSomeSubrecords-in'), 'utf8');
const someOut = fs.readFileSync(path.join(FIXTURES_PATH, 'readSomeSubrecords-out'), 'utf8');

const sruUrl = 'https://sru';
const retrieveAll = false;

describe('subRecordPicker', () => {
  describe('createSubrecordPicker', () => {
    it('Client should have methods pass', () => {
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

  describe('readAllSubrecords', () => {
    it('Should pass', () => {
      console.log(allIn); // eslint-disable-line no-console
      console.log(allOut); // eslint-disable-line no-console
    });
  });
  describe('readSomeSubrecords', () => {
    it('Should pass', () => {
      console.log(someIn); // eslint-disable-line no-console
      console.log(someOut); // eslint-disable-line no-console
    });
  });
});
