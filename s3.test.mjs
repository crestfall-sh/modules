// @ts-check

import fs from 'fs';
import path from 'path';
import { assert } from './assert.mjs';
import { config } from './config.mjs';
import { __dirname } from './constants.mjs';
import * as s3 from './s3.mjs';

assert(typeof config.s3_region === 'string');
assert(typeof config.s3_hostname === 'string');
assert(typeof config.s3_access_key === 'string');
assert(typeof config.s3_secret_key === 'string');

const file_bucket = 'uncategorized';
const file_name = 'dog.png';
const file_buffer = fs.readFileSync(path.join(__dirname, 'dog.png'));

process.nextTick(async () => {

  const s3c = s3.create_s3c(config.s3_region, config.s3_hostname, config.s3_access_key, config.s3_secret_key);

  const buckets_response = await s3c.bucket_list();

  if (buckets_response.Buckets.some((bucket) => bucket.Name === file_bucket) === false) {
    await s3c.bucket_create(file_bucket);
  }

  try {
    await s3c.file_head(file_bucket, file_name);
  } catch (e) {
    if (e.name === 'NotFound') {
      await s3c.file_upload(file_bucket, file_name, file_buffer);
      await s3c.file_public_read_access(file_bucket, file_name);
    }
  }

  const download_response = await s3c.file_download(file_bucket, file_name);
  const download_response_buffer = await s3c.readable_to_buffer(download_response.Body);
  console.log({ equals: file_buffer.equals(download_response_buffer) });

  const file_url = s3c.file_url(file_bucket, file_name);
  console.log({ file_url });
});