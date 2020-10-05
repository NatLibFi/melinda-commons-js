
import {expect} from 'chai';
import CommonError from './error';

describe('error', () => {
  const doThrow = () => {
    throw new CommonError(400, 'Test error!');
  };
  it('Should throw error', () => {
    expect(doThrow).to.throw(CommonError);
  });
  it('Should contain status', () => {
    try {
      doThrow();
    } catch (error) {
      expect(error).to.have.property('status');
      expect(error.status).to.eql(400);
    }
  });
  it('Should contain payload', () => {
    try {
      doThrow();
    } catch (error) {
      expect(error).to.have.property('payload');
      expect(error.payload).to.eql('Test error!');
    }
  });
  it('Should contain stack', () => {
    try {
      doThrow();
    } catch (error) {
      expect(error).to.have.property('stack');
    }
  });
});

