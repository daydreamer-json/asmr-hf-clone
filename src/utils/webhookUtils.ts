import * as uuid from 'uuid';
import { DateTime } from 'luxon';
import appConfig from './config.js';
import logger from './logger.js';
import argvUtils from './argv.js';
import mathUtils from './mathUtils.js';
import * as TypesTrackEntry from '../types/TrackEntry.js';
import ky from 'ky';
import stringUtils from './stringUtils.js';

async function sendDiscordWebhook(workInfoPruned: any) {
  const hfAssetBaseUrl = `https://huggingface.co/datasets/${appConfig.network.hfApi.repo}/resolve/main/output`;
  const frontPageBaseUrl = `https://asmr-archive-data.daydreamer-json.cc/works`;
  logger.debug('Sending webhook request to Discord ...');
  const webhookBody = {
    content: 'Work uploaded',
    tts: false,
    embeds: [
      {
        id: 602723758,
        description: `**${stringUtils.numberToRJIdString(workInfoPruned.id)}**`,
        fields: [
          {
            id: 258338989,
            name: 'VAs',
            value: (() => {
              let vadisp = null;
              if (
                workInfoPruned.vas.length !== 0 &&
                workInfoPruned.vas[0].id !== '83a442aa-3662-5e17-aece-757bc3cb97cd' &&
                workInfoPruned.vas[0].name !== 'N/A'
              ) {
                vadisp = workInfoPruned.vas.map((obj: any) => obj.name).join(', ');
              } else {
                vadisp = '---';
              }
              return vadisp;
            })(),
            inline: true,
          },
          {
            id: 117335365,
            name: 'Tags',
            value: (() => {
              let tagdisp = null;
              if (workInfoPruned.tags.length !== 0) {
                tagdisp = workInfoPruned.tags
                  .map((obj: any) => {
                    if (Object.keys(obj.i18n).length === 0) {
                      return obj.name;
                    } else {
                      return obj.i18n['ja-jp'].name;
                    }
                  })
                  .join(', ');
              } else {
                tagdisp = '---';
              }
              return tagdisp;
            })(),
            inline: true,
          },
        ],
        title: workInfoPruned.title,
        author: {
          name: workInfoPruned.circle.name,
          url: `https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG${workInfoPruned.circle.id.toString().padStart(5, '0')}.html`,
        },
        image: {
          url: `${hfAssetBaseUrl}/${workInfoPruned.create_date}/${stringUtils.numberToRJIdString(workInfoPruned.id)}/cover_main.jpg`,
        },
        footer: {
          text: 'ASMR Archive Data',
        },
        timestamp: DateTime.now().toISO(),
        url: `${frontPageBaseUrl}/work?create_date=${workInfoPruned.create_date}&id=${workInfoPruned.id}`,
      },
    ],
    components: [],
    actions: {},
    username: 'Archiver Bot',
    avatar_url: 'https://files.catbox.moe/hvmrl9.png',
  };
  for (const whUrl of appConfig.network.discordApi.webhookUrl) {
    await ky(whUrl, {
      method: 'post',
      json: webhookBody,
      retry: 10,
    });
  }
}

export default { sendDiscordWebhook };
