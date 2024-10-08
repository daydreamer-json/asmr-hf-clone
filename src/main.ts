#!/usr/bin/env node

// import clear from 'clear';
// clear();
import childProcess from 'child_process';
import util from 'util';
import parseCommand from './cmd.js';
const execPromise = util.promisify(childProcess.exec);

async function main(): Promise<void> {
  await execPromise('chcp 65001');
  await parseCommand();
}

await main();
