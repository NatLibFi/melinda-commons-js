import {expect} from 'chai';
import {createSubrecordPicker} from './subRecordPicker';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen-http-client';

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

    expect(format()).to.eql(expectedRecords);

    function format() {
      return records.map(r => r.toObject());
    }
  }
});
