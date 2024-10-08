import { DateTime } from 'luxon';

import appConfig from './utils/config.js';
import argvUtils from './utils/argv.js';
import logger from './utils/logger.js';
import nicUtils from './utils/nicUtils.js';
import hfApiUtils from './utils/hfApiUtils.js';
import downloadUtils from './utils/downloadUtils.js';

async function mainCmdHandler() {
  logger.level = argvUtils.getArgv().logLevel;
  const netshCmdRsp = await nicUtils.getNetshInfo();
  await nicUtils.checkIsUsingTempIpv6(netshCmdRsp);
  // await downloadUtils.singleDownload(276666); 数多いやつ
  // await downloadUtils.singleDownload(1182574); 長いやつ
  // await downloadUtils.singleDownload(1030680); 小さいやつ
  const downloadList = [
    1021182, 1019581, 1018783, 1018383, 1017452, 1014943, 1004815, 440161, 423408, 1004726, 1005103, 1003834, 1000682,
    1005630,

    1025442, 1025238, 1006094, 1006930, 1009257, 1006446, 1008282, 1006974, 1008923, 1008050,

    1026083, 1026029, 1022084, 1003155, 1013900, 1012852, 1009385, 1012927, 1010222,

    1026063, 1025977, 1017212, 1012868, 1001212, 1014911, 1014483, 1013980, 1014036, 1014272,
  ];
  for (const downloadWorkId of downloadList) {
    await downloadUtils.singleDownload(downloadWorkId);
  }
}

export default mainCmdHandler;
