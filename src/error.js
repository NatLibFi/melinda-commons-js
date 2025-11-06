export default class extends Error {
  constructor(status, payload, ...params) {
    super(params);
    this.status = status;
    this.payload = payload;
  }
}
