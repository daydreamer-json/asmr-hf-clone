import tar from 'tar-stream';
import { Writable } from 'stream';

async function createTarBuffer(
  fileBufArray: Array<{ path: string; data: Buffer | ArrayBuffer; modifiedTime: Date | null }>,
) {
  const tarPack = tar.pack();
  const chunks = new Array();
  const writable = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  tarPack.pipe(writable);
  for (const file of fileBufArray) {
    tarPack.entry(
      { name: file.path, mtime: file.modifiedTime === null ? new Date() : file.modifiedTime },
      Buffer.from(file.data),
    );
  }
  tarPack.finalize();
  await new Promise((resolve, reject) => {
    writable.on('finish', resolve);
    writable.on('error', reject);
  });
  return Buffer.concat(chunks);
}

async function extractTarBuffer(buffer: Buffer): Promise<Array<{ data: Buffer; header: tar.Headers }>> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const files: Array<{
      data: Buffer;
      header: tar.Headers;
    }> = [];
    extract.on('entry', (header, stream, next) => {
      const chunks: Array<any> = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files.push({
          data: Buffer.concat(chunks),
          header,
        });
        next();
      });
      stream.on('error', reject);
    });
    extract.on('finish', () => resolve(files));
    extract.on('error', reject);
    extract.end(buffer);
  });
}

async function test() {
  const tarBuf = await createTarBuffer([
    { path: 'a.bin', data: new ArrayBuffer(8), modifiedTime: null },
    { path: 'b.bin', data: new ArrayBuffer(16), modifiedTime: null },
    { path: 'x/c.bin', data: new ArrayBuffer(24), modifiedTime: null },
    { path: 'x/d.bin', data: new ArrayBuffer(32), modifiedTime: null },
  ]);
  console.log(await extractTarBuffer(tarBuf));
}

export default {
  createTarBuffer,
  extractTarBuffer,
  test,
};
