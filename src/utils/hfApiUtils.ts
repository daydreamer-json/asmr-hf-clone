import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import cliProgress from 'cli-progress';
import { DateTime } from 'luxon';
import * as hfHubModule from '@huggingface/hub';
import { pathToFileURL } from 'url';
import retry from 'async-retry';
import zstd from '@mongodb-js/zstd';
import appConfig from './config.js';
import logger from './logger.js';
import argvUtils from './argv.js';
import mathUtils from './mathUtils.js';
import waitUtils from './waitUtils.js';
import stringUtils from './stringUtils.js';
import * as TypesTrackEntry from '../types/TrackEntry.js';
import appConfigDatabase from './configDatabase.js';
import markdownUtils from './markdownUtils.js';
import tarballUtils from './tarballUtils.js';

async function authenticate() {
  logger.debug('Authenticating HuggingFace account ...');
  const credentialData = {
    token: appConfig.network.hfApi.token,
    whoAmI: await hfHubModule.whoAmI({
      accessToken: appConfig.network.hfApi.token,
    }),
  };
  return credentialData;
}

async function uploadWorkFiles(
  metadataJson: {
    workInfoPruned: Record<string, any>;
    workFolderStructure: Array<TypesTrackEntry.TypeModifiedTrackEntry>;
    date: string;
  },
  optimizedWorkFolderStructureJson: Array<TypesTrackEntry.TypeOptimizedTrackEntry>,
  isCoverAvailable: {
    main: boolean;
    small: boolean;
    thumb: boolean;
  },
) {
  const credentialData = await authenticate();
  const targetRepo: hfHubModule.RepoDesignation = {
    type: 'dataset',
    name: appConfig.network.hfApi.repo,
  };
  logger.info('Uploading work:', metadataJson.workInfoPruned.id, '...');
  appConfigDatabase.setConfig([
    ...appConfigDatabase.getConfig(),
    {
      workInfoPruned: metadataJson.workInfoPruned,
      workFolderStructure: metadataJson.workFolderStructure,
      date: metadataJson.date,
    },
  ]);
  await retry(
    async () => {
      await hfHubModule.uploadFiles({
        repo: targetRepo,
        accessToken: credentialData.token,
        commitTitle: `${metadataJson.workInfoPruned.create_date}_${stringUtils.numberToRJIdString(metadataJson.workInfoPruned.id)}`,
        files: [
          {
            path: 'database.tar.zst',
            content: new Blob(
              [
                await zstd.compress(
                  await tarballUtils.createTarBuffer(
                    (() => {
                      const chunkArrayFunc = (array: Array<any>, chunkSize: number) => {
                        const chunks = [];
                        for (let i = 0; i < array.length; i += chunkSize) {
                          chunks.push(array.slice(i, i + chunkSize));
                        }
                        return chunks;
                      };
                      return chunkArrayFunc(appConfigDatabase.getConfig(), 4096).map((obj, index) => ({
                        path: `database.json.${index.toString().padStart(2, '0')}`,
                        data: Buffer.from(JSON.stringify(obj), 'utf-8'),
                        modifiedTime: null,
                      }));
                    })(),
                  ),
                  14,
                ),
              ],
              {
                type: 'application/zstd',
              },
            ),
          },
          ...(() => {
            const coverFiles = new Array();
            isCoverAvailable.main ? coverFiles.push('cover_main.jpg') : null;
            isCoverAvailable.small ? coverFiles.push('cover_small.jpg') : null;
            isCoverAvailable.thumb ? coverFiles.push('cover_thumb.jpg') : null;
            const metaFiles = ['metadata.json', ...coverFiles];
            const arr = new Array();
            metaFiles.forEach((fn) => {
              arr.push({
                path: path
                  .join(
                    'output',
                    metadataJson.workInfoPruned.create_date,
                    stringUtils.numberToRJIdString(metadataJson.workInfoPruned.id),
                    fn,
                  )
                  .replaceAll(path.sep, path.posix.sep),
                content: pathToFileURL(path.join(argvUtils.getArgv().outputDir, fn)),
              });
            });
            return arr;
          })(),
          ...optimizedWorkFolderStructureJson.map((ent) => ({
            path: path
              .join(
                'output',
                metadataJson.workInfoPruned.create_date,
                stringUtils.numberToRJIdString(metadataJson.workInfoPruned.id),
                ent.uuid + path.extname(ent.path),
              )
              .replaceAll(path.sep, path.posix.sep),
            content: pathToFileURL(path.join(argvUtils.getArgv().outputDir, ent.uuid + path.extname(ent.path))),
          })),
        ],
      });
    },
    {
      retries: 10,
      factor: 2,
      minTimeout: 500,
      maxTimeout: Infinity,
      onRetry: (error, num) => {
        console.log(error);
        logger.error(`An upload error has occurred. Retrying (${num} times) ...`);
      },
    },
  );
  await appConfigDatabase.writeConfigToFile();
}

async function getRepoSize() {
  const credentialData = await authenticate();
  const targetRepo: hfHubModule.RepoDesignation = {
    type: 'dataset',
    name: appConfig.network.hfApi.repo,
  };
  logger.info('Analyzing repository total size ...');
  const list = new Array();
  for await (const entry of hfHubModule.listFiles({
    repo: targetRepo,
    recursive: true,
    accessToken: credentialData.token,
  })) {
    // argvUtils.getArgv().noShowProgress === true ? list.push(entry) : logger.trace('Data received: ' + list.push(entry));
    // argvUtils.getArgv().noShowProgress === true ? null : readline.moveCursor(process.stdout, -1000, -1);
    list.push(entry);
  }
  argvUtils.getArgv().noShowProgress === true ? null : console.log('');
  const listFiles = list.filter((obj) => obj.type !== 'directory');
  const listFileTypes = [...new Set(listFiles.map((obj) => path.extname(obj.path).replace('.', '')))];
  const listFileFiltered = [];
  for (const extname of listFileTypes) {
    listFileFiltered.push({
      ext: extname,
      count: listFiles.filter((obj) => path.extname(obj.path).replace('.', '') === extname).length,
      size: mathUtils.arrayTotal(
        listFiles.filter((obj) => path.extname(obj.path).replace('.', '') === extname).map((obj) => obj.size),
      ),
      sizeFmt: mathUtils.formatFileSizeFixedUnit(
        mathUtils.arrayTotal(
          listFiles.filter((obj) => path.extname(obj.path).replace('.', '') === extname).map((obj) => obj.size),
        ),
        'GiB',
        2,
      ),
      sizeEntry: listFiles.filter((obj) => path.extname(obj.path).replace('.', '') === extname).map((obj) => obj.size),
    });
  }
  logger.info('Total entry:', listFiles.length);
  logger.info(
    'Total size :',
    mathUtils.formatFileSizeFixedUnit(mathUtils.arrayTotal(listFiles.map((obj) => obj.size)), 'GiB', 2),
  );
  argvUtils.getArgv().noShowProgress === true
    ? null
    : console.table(
        listFileFiltered
          .map((obj) => ({
            ext: obj.ext,
            count: obj.count,
            size: obj.size,
            sizeFmt: obj.sizeFmt,
          }))
          .sort((a, b) => b.size - a.size),
      );
  // console.log(listFiles.filter((obj) => path.extname(obj.path).replace('.', '') === 'avi').map((obj) => obj.path));
  return listFileFiltered
    .sort((a, b) => b.size - a.size)
    .map((obj) => ({
      ext: obj.ext,
      count: obj.count,
      size: obj.size,
      sizeEntry: obj.sizeEntry,
    }));
}

async function uploadStatsMetaToHf() {
  const credentialData = await authenticate();
  const targetRepo: hfHubModule.RepoDesignation = {
    type: 'dataset',
    name: appConfig.network.hfApi.repoMeta,
  };
  const retRepoSize = await getRepoSize();
  logger.debug('Uploading stats meta to meta repo ...');
  await retry(
    async () => {
      await hfHubModule.uploadFiles({
        repo: targetRepo,
        accessToken: credentialData.token,
        commitTitle: `Update stats meta`,
        files: [
          {
            path: 'stats_02.json.zst',
            content: new Blob(
              [await zstd.compress(Buffer.from(JSON.stringify({ repoSize: retRepoSize }, null, '  '), 'utf-8'), 18)],
              {
                type: 'application/zstd',
              },
            ),
          },
        ],
      });
    },
    {
      retries: 10,
      factor: 2,
      minTimeout: 500,
      maxTimeout: Infinity,
      onRetry: (error, num) => {
        console.log(error);
        logger.error(`An upload error has occurred. Retrying (${num} times) ...`);
      },
    },
  );
}

async function test() {
  const credentialData = await authenticate();
  logger.debug('Running listDatasets ...');
  const listDatasetsRsp = new Array();
  for await (const dataset of hfHubModule.listDatasets({
    search: { owner: credentialData.whoAmI.name },
    accessToken: credentialData.token,
  })) {
    listDatasetsRsp.push(dataset);
  }
  // console.log(listDatasetsRsp);
  // logger.debug('Running uploadFilesWithProgress ...');
  // const uploadTargetRepo: hfHubModule.RepoDesignation = { type: 'dataset', name: 'daydreamer-json/nodejs-upload-test' };
  // const fileBuffer = await fs.promises.readFile('H:\\PassingMemories\\Ys_PassingMemories.mkv');
  // const fileBlob = new Blob([fileBuffer]);
  // console.log(fileBlob);
  // for await (const progressEvent of hfHubModule.uploadFilesWithProgress({
  //   repo: uploadTargetRepo,
  //   accessToken: credentialData.token,
  //   files: [
  //     {
  //       path: 'RandomBytes_1.mkv',
  //       content: new Blob([crypto.randomBytes(104857600)]),
  //     },
  //     {
  //       path: 'RandomBytes_2.mkv',
  //       content: new Blob([crypto.randomBytes(104857600)]),
  //     },
  //     {
  //       path: 'RandomBytes_3.mkv',
  //       content: new Blob([crypto.randomBytes(104857600)]),
  //     },
  //   ],
  // })) {
  //   console.log(progressEvent);
  // }
}

export default {
  authenticate,
  uploadWorkFiles,
  getRepoSize,
  uploadStatsMetaToHf,
  test,
};
