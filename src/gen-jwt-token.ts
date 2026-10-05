#!/usr/bin/env node

import {createHmac} from 'crypto';
import {encode as b64Encode} from 'base64-url';

const {JWT_KEY: jwtKey} = process.env;
const [, , id] = process.argv;

if (jwtKey && id) {
  const payload = {id};
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const start = `${b64Encode(JSON.stringify(header))}.${b64Encode(JSON.stringify(payload))}`;
  const signature = createHmac('SHA256', jwtKey).update(start).digest();

  console.log(`${start}.${b64Encode(signature)}`); // eslint-disable-line no-console
  process.exit();
}

console.error('USAGE: gen-jwt-token <id>'); // eslint-disable-line no-console
console.error(); // eslint-disable-line no-console
console.error('Mandatory parameteters missing. JWT_KEY environment variable must be set and application id must be passed as a positional argument'); // eslint-disable-line no-console
process.exit(1);

