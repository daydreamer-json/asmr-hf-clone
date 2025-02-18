import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ky from 'ky';

const THREAD_COUNT = 8;
// const OUTPUT_DIR = 'R:\\asmr-hf-clone-output';
const OUTPUT_DIR = './output';

async function main() {
  while (true) {
    console.log('Downloading database.tar.zst ...');
    const dbBuffer = await ky(`https://huggingface.co/datasets/DeliberatorArchiver/asmr-archive-data-02/resolve/main/database.tar.zst`, {
      method: 'get',
    }).arrayBuffer();
    await fs.promises.writeFile('./config/database.tar.zst', Buffer.from(dbBuffer));
    await spawnAsync(`npm`, [
      'run', 'build'
    ], {
      cwd: path.resolve('./'),
      shell: true
    }, true);
    try {
      await spawnAsync(`node`, [
        'dist/main.js', 'test', '--thread', THREAD_COUNT, '--output-dir', OUTPUT_DIR, '--server', 'original',
        '--np'
      ], {
        cwd: path.resolve('./')
      }, true)
    } catch (err) {
      console.error('=============== SCRIPT ERROR ===============');
      console.log(err);
      console.log('Restarting ...');
    }
  }
}

function spawnAsync(command, args = [], options = {}, isStdPrint = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    // console.log(child.spawnargs);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      isStdPrint ? process.stdout.write(data.toString()) : null;
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      isStdPrint ? process.stderr.write(data.toString()) : null;
      stderr += data.toString();
    });
    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });
    child.on('exit', (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`Spawned process error code ${exitCode}`));
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
}


await main();
