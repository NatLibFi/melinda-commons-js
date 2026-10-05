#!/usr/bin/env node

import {generateEncryptionKey} from './backendUtils.ts';
console.log(generateEncryptionKey()); // eslint-disable-line no-console
