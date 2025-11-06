import {describe, it} from 'node:test';
import assert from 'node:assert';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen-http-client';
import createDebugLogger from 'debug';
import {createSubrecordPicker} from './subRecordPicker.js';

const debug = createDebugLogger('@natlibfi/melinda-commons:subRecordPicker:test');

describe('subRecordPicker', () => {
  const sruUrl = 'https://sru';
  const retrieveAll = false;
  //const monoHostComponentsOnly = false;

  describe('createSubrecordPicker', () => {
    it('Client should have methods', () => {
      const client = createSubrecordPicker(sruUrl, retrieveAll);
      // expect(client).to.respondTo('readAllSubrecords');
      // expect(client).to.respondTo('readSomeSubrecords');
      assert(typeof client.readAllSubrecords, 'function');
      assert(typeof client.readSomeSubrecords, 'function');
    });

    it('Create client should work with just one parametter', () => {
      const client = createSubrecordPicker(sruUrl);
      // expect(client).to.respondTo('readAllSubrecords');
      // expect(client).to.respondTo('readSomeSubrecords');
      assert(typeof client.readAllSubrecords, 'function');
      assert(typeof client.readSomeSubrecords, 'function');
    });

    it('Create client should have at least one parametter', () => {
      try {
        createSubrecordPicker();
      } catch (error) {
        assert.equal(error.payload, 'Invalid sru url');
      }
    });
  });

  generateTests({
    callback,
    path: [import.meta.dirname, '..', 'test-fixtures', 'subRecordPicker']
  });

  async function callback({getFixture, method, sruUrl, retrieveAll, recordId, expectedAmount = undefined}) {
    const client = createSubrecordPicker(sruUrl, retrieveAll);
    const expectedRecords = getFixture({components: ['expected-records.json'], reader: READERS.JSON});
    debug(`Testing: ${method}`);
    const result = await client[method](recordId);
    debug(`${JSON.stringify(result)}`);
    const {records, amount} = result;

    if (expectedAmount) {
      assert.equal(amount, expectedAmount);
    }

    if (expectedRecords) {
      assert.deepStrictEqual(format(), expectedRecords);
    }

    function format() {
      return records.map(r => r.toObject());
    }
  }
});
