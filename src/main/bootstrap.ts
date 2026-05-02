/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * F.O.C.U.S. Assessment - Bootstrap Entry Point
 *
 * Sets up the application root as the current working directory,
 * registers module-alias, then loads the actual main process.
 */

import * as path from 'path';

// Determine the application root (where package.json resides)
// This works both in development and packaged Electron builds
const appRoot = path.resolve(__dirname, '../..');
process.chdir(appRoot);

// Register module-alias to resolve @/ imports
require('module-alias/register');

// Load the actual main process entry point
require('./main');
