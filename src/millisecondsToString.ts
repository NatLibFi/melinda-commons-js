/** Code from https://www.npmjs.com/package/pretty-print-ms 2025-09-18, Reason: Native node 22 esm import failed */
/** Thanks to "shariko" Sahar Brodbeker and "ealush" Evyatar */

const MS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;

const getParts = (t, divisor) => {
  const [big, _small] = t.toFixed(2).split('.');
  const small = Math.round((Number(_small) / 100) * divisor);

  return [big, small];
};

export function millisecondsToString(t) {
  if (t < MS_IN_SECOND) {
    return `${t}ms`;
  }

  t /= MS_IN_SECOND;

  {
    const s = Math.round(t);

    if (s < SECONDS_IN_MINUTE) {
      return `${s}s`;
    }
  }

  t /= SECONDS_IN_MINUTE;

  {
    const [m, s] = getParts(t, SECONDS_IN_MINUTE);

    if (m < MINUTES_IN_HOUR) {
      return `${m}m ${s}s`;
    }
  }

  t /= MINUTES_IN_HOUR;

  const [h, m] = getParts(t, MINUTES_IN_HOUR);

  return `${h}h ${m}m`;
}