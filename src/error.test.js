import {describe, it} from 'node:test';
import assert from 'node:assert';
import CommonsError from './error.js';

describe('error', () => {
  it('Should construct the expected instance', () => {
    const error = new CommonsError(200, 'foobar');

    assert(error instanceof Error);
    assert.equal(Object.hasOwn(error, 'status'), true);
    assert.equal(Object.hasOwn(error, 'payload'), true);
    assert.equal(error.status, 200);
    assert.equal(error.payload, 'foobar');
  });
});
