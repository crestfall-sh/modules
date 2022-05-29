// @ts-check

import fs from 'fs';
import url from 'url';
import path from 'path';
import { config } from './config.mjs';
import * as telegram from './telegram.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.nextTick(async () => {

  const chat_id = -691850503;

  await telegram.send_message(config.telegram_token, {
    chat_id,
    text: 'Example message.',
  });

  const image_buffer = fs.readFileSync(path.join(__dirname, 'dog.png'));
  await telegram.send_photo(config.telegram_token, {
    chat_id,
    photo: { name: 'dogdog.png', buffer: image_buffer },
    caption: 'Example image.',
  });

});