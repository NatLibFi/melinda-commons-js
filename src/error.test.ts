import {describe, it} from 'node:test';
import assert from 'node:assert';
import CommonsError from './error.ts';

describe('error', () => {
  it('Should construct the expected instance', () => {
    const error = new CommonsError(200, 'foobar');

    assert(error instanceof Error);
    assert.equal(Object.hasOwn(error, 'status'), true);
    assert.equal(Object.hasOwn(error, 'payload'), true);
    assert.equal(Object.hasOwn(error, 'params'), true);
    assert.equal(error.status, 200);
    assert.equal(error.payload, 'foobar');
    assert.deepEqual(error.params, []);
    // message is intentionally empty: payload is data, not a message
    assert.equal(error.message, '');
  });

  it('Should accept a non-string payload', () => {
    const payload = {code: 'X', detail: {a: 1}};
    const error = new CommonsError(500, payload);

    assert.equal(error.payload, payload);
    assert.equal(error.message, '');
  });

  it('Should preserve extra constructor args on params', () => {
    const extra = {hint: 'see docs'};
    const error = new CommonsError(400, 'bad input', 42, extra);

    assert.deepEqual(error.params, [42, extra]);
    assert.equal(error.message, '');
  });
});
