import fs from 'fs';
import { DateTime } from 'luxon';
import * as TypesTrackEntry from '../types/TrackEntry.js';
import writerUtils from './writerUtils.js';

const zstdCompressionLevel = 14;

const initDatabaseData: Array<{
  workInfoPruned: any;
  workFolderStructure: TypesTrackEntry.TypeModifiedTrackEntry[];
  date: string;
}> = [];

const fileExistsCheck = async (path: string) => {
  try {
    await fs.promises.access(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};
if ((await fileExistsCheck('config/database.json.zst')) === false) {
  await writerUtils.writeZstdData(
    Buffer.from(JSON.stringify(initDatabaseData), 'utf-8'),
    'config/database.json.zst',
    14,
  );
}

let database = await (async (): Promise<
  Array<{
    workInfoPruned: any;
    workFolderStructure: TypesTrackEntry.TypeModifiedTrackEntry[];
    date: string;
  }>
> => {
  const tmpObj: Array<{
    workInfoPruned: any;
    workFolderStructure: TypesTrackEntry.TypeModifiedTrackEntry[];
    date: string;
  }> = JSON.parse((await writerUtils.readZstdData('config/database.json.zst')).toString('utf-8')).map(
    (obj: { workInfoPruned: any; workFolderStructure: any; date: any }) => ({
      workInfoPruned: obj.workInfoPruned,
      workFolderStructure: obj.workFolderStructure,
      date: obj.date,
    }),
  );
  return tmpObj;
})();

export default {
  getConfig: () => database,
  setConfig: (
    newValue: Array<{
      workInfoPruned: any;
      workFolderStructure: TypesTrackEntry.TypeModifiedTrackEntry[];
      date: string;
    }>,
  ) => {
    database = newValue;
  },
  writeConfigToFile: async () => {
    await writerUtils.writeZstdData(Buffer.from(JSON.stringify(database), 'utf-8'), 'config/database.json.zst', 14);
  },
};
