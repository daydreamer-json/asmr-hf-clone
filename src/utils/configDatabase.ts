import fs from 'fs';
import { DateTime } from 'luxon';
import * as TypesTrackEntry from '../types/TrackEntry.js';

const initDatabaseData: Array<{
  workInfoPruned: any;
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
if ((await fileExistsCheck('config/database.json')) === false) {
  await fs.promises.writeFile('config/database.json', JSON.stringify(initDatabaseData, null, '  '), {
    encoding: 'utf-8',
  });
}

let database = await (async (): Promise<
  Array<{
    workInfoPruned: any;
    date: string;
  }>
> => {
  const tmpObj: Array<{
    workInfoPruned: any;
    date: string;
  }> = JSON.parse(await fs.promises.readFile('config/database.json', 'utf-8')).map(
    (obj: { workInfoPruned: any; workFolderStructure?: any; date: any }) => ({
      workInfoPruned: obj.workInfoPruned,
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
      date: string;
    }>,
  ) => {
    database = newValue;
  },
  writeConfigToFile: async () => {
    await fs.promises.writeFile('config/database.json', JSON.stringify(database), 'utf-8');
  },
};
