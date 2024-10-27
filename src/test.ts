import { DateTime } from 'luxon';

import appConfig from './utils/config.js';
import argvUtils from './utils/argv.js';
import logger from './utils/logger.js';
import nicUtils from './utils/nicUtils.js';
import hfApiUtils from './utils/hfApiUtils.js';
import downloadUtils from './utils/downloadUtils.js';

async function mainCmdHandler() {
  logger.level = argvUtils.getArgv().logLevel;
  process.platform === 'win32'
    ? await (async () => {
        const netshCmdRsp = await nicUtils.getNetshInfo();
        await nicUtils.checkIsUsingTempIpv6(netshCmdRsp);
      })()
    : null;
  // await downloadUtils.singleDownload(276666); 数多いやつ
  // await downloadUtils.singleDownload(1182574); 長いやつ
  // await downloadUtils.singleDownload(1030680); 小さいやつ
  const downloadList = [1092551];
  for (const downloadWorkId of downloadList) {
    await downloadUtils.singleDownload(downloadWorkId);
  }
}

export default mainCmdHandler;
