export default class extends Error {
  status: number;
  payload: unknown;
  /** Extra arguments passed to the constructor (legacy API compatibility). */
  params: unknown[];

  // message is intentionally left empty: payload is data, not a message
  // (identical behavior to all JS-era versions of this package).
  constructor(status: number, payload: unknown, ...params: unknown[]) {
    super();
    this.status = status;
    this.payload = payload;
    this.params = params;
  }
}
