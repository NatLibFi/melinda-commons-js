// base64-url's runtime `encode` also accepts a Buffer/Uint8Array (it wraps its
// input in `new Buffer(...)`), which the published @types/base64-url does not
// declare. Extend the type so callers can pass digests without a cast.
import 'base64-url';

declare module 'base64-url' {
  export function encode(value: Uint8Array, encoding?: string): string;
}
