import {expect} from 'chai';
import {createSubrecordPicker} from './subRecordPicker';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen-http-client';
import createDebugLogger from 'debug';

const debug = createDebugLogger('@natlibfi/melinda-commons:subRecordPicker:test');


describe('subRecordPicker', () => {
  const sruUrl = 'https://sru';
  const retrieveAll = false;
  //const monoHostComponentsOnly = false;

  describe('createSubrecordPicker', () => {
    it('Client should have methods', () => {
      const client = createSubrecordPicker(sruUrl, retrieveAll);
      expect(client).to.respondTo('readAllSubrecords');
      expect(client).to.respondTo('readSomeSubrecords');
      expect(client).to.respondTo('readSubrecordAmount');
    });

    it('Create client should work with just one parametter', () => {
      const client = createSubrecordPicker(sruUrl);
      expect(client).to.respondTo('readAllSubrecords');
      expect(client).to.respondTo('readSomeSubrecords');
      expect(client).to.respondTo('readSubrecordAmount');
    });

    it('Create client should have at least one parametter', () => {
      expect(createSubrecordPicker).to.throw();
    });
  });

  generateTests({
    callback,
    path: [__dirname, '..', 'test-fixtures', 'subRecordPicker']
  });

  async function callback({getFixture, method, sruUrl, retrieveAll, recordId, expectedAmount = undefined}) {
    const client = createSubrecordPicker(sruUrl, retrieveAll);
    const expectedRecords = getFixture({components: ['expected-records.json'], reader: READERS.JSON});
    debug(`Testing: ${method}`);
    const result = await client[method](recordId);
    debug(`${JSON.stringify(result)}`);
    const {records, amount} = result;

    // eslint-disable-next-line functional/no-conditional-statements
    if (expectedRecords) {
      expect(format()).to.eql(expectedRecords);
    }

    // eslint-disable-next-line functional/no-conditional-statements
    if (expectedAmount) {
      expect(amount).to.eql(expectedAmount);
    }

    function format() {
      return records.map(r => r.toObject());
    }
  }
});
