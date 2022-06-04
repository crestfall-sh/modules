// @ts-check

import fs from 'fs';
import path from 'path';
import { config } from './config.mjs';
import { __dirname } from './constants.mjs';
import * as telegram from './telegram.mjs';

process.nextTick(async () => {

  const chat_id = -691850503;

  await telegram.send_message(String(config.telegram_token), {
    chat_id,
    text: 'Example message.',
  });

  const image_buffer = fs.readFileSync(path.join(__dirname, 'dog.png'));
  await telegram.send_photo(String(config.telegram_token), {
    chat_id,
    photo: { name: 'dog.png', buffer: image_buffer },
    caption: 'Example image.',
  });

});