export default class extends Error {
  constructor(status, payload, ...params) {
    super(params);
    this.status = status; // eslint-disable-line functional/no-this-expressions
    this.payload = payload; // eslint-disable-line functional/no-this-expressions
  }
}
