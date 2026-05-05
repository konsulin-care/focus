/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * F.O.C.U.S. Assessment - Bootstrap Entry Point
 *
 * Configures module-alias for @/ imports, then loads the main process.
 */

import { resolve } from 'node:path';
import { addAlias } from 'module-alias';

// __dirname is '.../dist/main'
// We want '@' to resolve to '.../dist'
const distRoot = resolve(__dirname, '..');
addAlias('@', distRoot);

// Load the actual main process entry point
require('./main');
