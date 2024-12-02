import fs from 'fs';
import { DateTime } from 'luxon';
import * as TypesTrackEntry from '../types/TrackEntry.js';
import writerUtils from './writerUtils.js';
import tarballUtils from './tarballUtils.js';

const zstdCompressionLevel = 14;

interface DatabaseEntry {
  workInfoPruned: any;
  workFolderStructure: TypesTrackEntry.TypeModifiedTrackEntry[];
  date: string;
}

const initDatabaseData: Array<DatabaseEntry> = [];

const fileExistsCheck = async (path: string) => {
  try {
    await fs.promises.access(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};
if ((await fileExistsCheck('config/database.tar.zst')) === false) {
  await writerUtils.writeZstdData(
    // Buffer.from(JSON.stringify(initDatabaseData), 'utf-8'),
    await tarballUtils.createTarBuffer([
      {
        path: 'database.json.00',
        data: Buffer.from(JSON.stringify(initDatabaseData), 'utf-8'),
        modifiedTime: null,
      },
    ]),
    'config/database.tar.zst',
    zstdCompressionLevel,
  );
}

let database = await (async (): Promise<Array<DatabaseEntry>> => {
  const tmpObj: Array<DatabaseEntry> = await (async () => {
    const extractedTar = await tarballUtils.extractTarBuffer(await writerUtils.readZstdData('config/database.tar.zst'));
    const parsedJsonChunk = extractedTar.map((entry) => JSON.parse(entry.data.toString('utf-8')));
    return parsedJsonChunk
      .flat()
      .sort((a, b) => DateTime.fromISO(a).toSeconds() - DateTime.fromISO(b).toSeconds())
      .map((obj: { workInfoPruned: any; workFolderStructure: any; date: any }) => ({
        workInfoPruned: obj.workInfoPruned,
        workFolderStructure: obj.workFolderStructure,
        date: obj.date,
      }));
  })();
  return tmpObj;
})();

export default {
  getConfig: () => database,
  setConfig: (newValue: Array<DatabaseEntry>) => {
    database = newValue;
  },
  writeConfigToFile: async () => {
    await writerUtils.writeZstdData(
      await tarballUtils.createTarBuffer(
        (() => {
          const chunkArrayFunc = (array: Array<any>, chunkSize: number) => {
            const chunks = [];
            for (let i = 0; i < array.length; i += chunkSize) {
              chunks.push(array.slice(i, i + chunkSize));
            }
            return chunks;
          };
          return chunkArrayFunc(database, 4096).map((obj, index) => ({
            path: `database.json.${index.toString().padStart(2, '0')}`,
            data: Buffer.from(JSON.stringify(obj), 'utf-8'),
            modifiedTime: null,
          }));
        })(),
      ),
      'config/database.tar.zst',
      zstdCompressionLevel,
    );
  },
};
