import {describe, it} from 'node:test';
import assert from 'node:assert';
import {millisecondsToString} from './millisecondsToString.ts';

describe('millisecondsToString', () => {
  // Table of [input ms, expected output]. Expected values were derived by
  // running the function (they lock in the current behavior of the vendored
  // pretty-print-ms port; formatting is NOT to be changed).
  //
  // Notable locked-in behaviors:
  // - 59999 -> "1m 0s": the seconds branch uses Math.round(t), so 59.999s
  //   rounds to 60 and falls through to the minutes branch.
  // - 3599940 (59.999 min) -> "1h 0m": getParts() uses toFixed(2), which
  //   rounds 59.999 to "60.00", so the m < 60 check fails and the value
  //   cascades into the hours branch instead of rendering "60m 0s".
  const cases: [number, string][] = [
    // milliseconds
    [0, '0ms'],
    [999, '999ms'],
    // seconds (boundary at 1s)
    [1000, '1s'],
    [1499, '1s'],
    [1500, '2s'],
    [59499, '59s'],
    // minutes (boundary at 1m)
    [59999, '1m 0s'],
    [60000, '1m 0s'],
    [60499, '1m 1s'],
    [60500, '1m 1s'],
    [120000, '2m 0s'],
    // hours (boundary at 1h)
    [3599000, '59m 59s'],
    [3599940, '1h 0m'],
    [3600000, '1h 0m'],
    [3600001, '1h 0m'],
    [3661000, '1h 1m'],
  ];

  for (const [input, expected] of cases) {
    it(`Should format ${input} as ${expected}`, () => {
      assert.equal(millisecondsToString(input), expected);
    });
  }
});
