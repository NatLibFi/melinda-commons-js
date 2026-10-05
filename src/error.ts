export default class extends Error {
  status: number;
  payload: string;

  constructor(status: number, payload: string, ...params: unknown[]) {
    // KNOWN BUG: the original code passed the rest-array `params` (always
    // `[]`) to Error, so `error.message` is always ''. Preserved verbatim
    // to keep the JS->TS migration behavior-identical; fix separately.
    super(params as unknown as string);
    this.status = status;
    this.payload = payload;
  }
}
