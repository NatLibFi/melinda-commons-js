import {expect} from 'chai';
import CommonsError from './error';

describe('error', () => {
  it('Should construct the expected instance', () => {
    const error = new CommonsError(200, 'foobar');

    expect(error).to.be.an.instanceOf(Error);
    expect(error.status).to.equal(200);
    expect(error.payload).to.equal('foobar');
  });
});
