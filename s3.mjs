// @ts-check

// - https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html#CannedACL

import { assert } from './assert.mjs';
import s3 from '@aws-sdk/client-s3';

/**
 * @param {string} s3_region
 * @param {string} s3_hostname
 * @param {string} s3_access_key
 * @param {string} s3_secret_key
 */
export const create_s3c = (s3_region, s3_hostname, s3_access_key, s3_secret_key) => {


  const client = new s3.S3Client({
    region: s3_region,
    endpoint: s3_hostname,
    credentials: {
      accessKeyId: s3_access_key,
      secretAccessKey: s3_secret_key,
    },
    tls: true,
  });


  const bucket_list = async () => {
    console.log('bucket_list..');
    const response = await client.send(new s3.ListBucketsCommand({}));
    return response;
  };


  /**
   * @param {string} bucket
   */
  const bucket_create = async (bucket) => {
    assert(typeof bucket === 'string');
    console.log(`bucket_create "${bucket}"..`);
    const response = await client.send(new s3.CreateBucketCommand({
      Bucket: bucket,
      ACL: 'private',
    }));
    return response;
  };


  /**
   * @param {string} bucket
   */
  const bucket_delete = async (bucket) => {
    assert(typeof bucket === 'string');
    console.log(`bucket_delete "${bucket}"..`);
    const response = await client.send(new s3.DeleteBucketCommand({
      Bucket: bucket,
    }));
    return response;
  };


  /**
   * @param {string} bucket
   */
  const bucket_private_access = async (bucket) => {
    assert(typeof bucket === 'string');
    console.log(`bucket_private_access "${bucket}"..`);
    const response = await client.send(new s3.PutBucketAclCommand({
      Bucket: bucket,
      ACL: 'private',
    }));
    return response;
  };


  /**
   * @param {string} bucket
   */
  const bucket_public_read_access = async (bucket) => {
    assert(typeof bucket === 'string');
    console.log(`bucket_public_read_access "${bucket}"..`);
    const response = await client.send(new s3.PutBucketAclCommand({
      Bucket: bucket,
      ACL: 'public-read',
    }));
    return response;
  };


  /**
   * @param {string} bucket
   * @param {string} file_name
   */
  const file_url = (bucket, file_name) => {
    assert(typeof bucket === 'string');
    assert(typeof file_name === 'string');
    return `${s3_hostname}/${bucket}/${file_name}`;
  };


  /**
   * @param {string} bucket
   * @param {string} file_name
   */
  const file_head = async (bucket, file_name) => {
    assert(typeof bucket === 'string');
    assert(typeof file_name === 'string');
    console.log(`file_head "${bucket}" "${file_name}"..`);
    const response = await client.send(new s3.HeadObjectCommand({
      Bucket: bucket,
      Key: file_name,
    }));
    return response;
  };

  /**
   * @param {string} bucket
   * @param {string} file_name
   * @param {Buffer} file_buffer
   */
  const file_upload = async (bucket, file_name, file_buffer) => {
    assert(typeof bucket === 'string');
    assert(typeof file_name === 'string');
    assert(file_buffer instanceof Buffer);
    console.log(`file_upload "${bucket}" "${file_name}" (${file_buffer.length} bytes)..`);
    const response = await client.send(new s3.PutObjectCommand({
      Bucket: bucket,
      Key: file_name,
      Body: file_buffer,
      ACL: 'private',
    }));
    return response;
  };

  /**
   * @param {string} bucket
   * @param {string} file_name
   */
  const file_download = async (bucket, file_name) => {
    assert(typeof bucket === 'string');
    assert(typeof file_name === 'string');
    console.log(`file_download "${bucket}" "${file_name}"..`);
    const response = await client.send(new s3.GetObjectCommand({
      Bucket: bucket,
      Key: file_name,
    }));
    return response;
  };


  /**
   * @param {string} bucket
   * @param {string} file_name
   */
  const file_private_access = async (bucket, file_name) => {
    assert(typeof bucket === 'string');
    assert(typeof file_name === 'string');
    console.log(`file_private_access "${bucket}" "${file_name}"..`);
    const response = await client.send(new s3.PutObjectAclCommand({
      Bucket: bucket,
      Key: file_name,
      ACL: 'private',
    }));
    return response;
  };


  /**
   * @param {string} bucket
   * @param {string} file_name
   */
  const file_public_read_access = async (bucket, file_name) => {
    assert(typeof bucket === 'string');
    assert(typeof file_name === 'string');
    console.log(`file_public_read_access "${bucket}" "${file_name}"..`);
    const response = await client.send(new s3.PutObjectAclCommand({
      Bucket: bucket,
      Key: file_name,
      ACL: 'public-read',
    }));
    return response;
  };


  /**
   * @param {any} readable
   * @returns {Promise<Buffer>}
   */
  const readable_to_buffer = (readable) => new Promise((resolve, reject) => {
    try {
      if (readable instanceof Object === false) {
        throw new Error('readable_to_buffer, "readable" not an instance of Object.');
      }
      if (readable.once instanceof Function === false) {
        throw new Error('readable_to_buffer, "readable.once" not an instance of Function.');
      }
      if (readable.on instanceof Function === false) {
        throw new Error('readable_to_buffer, "readable.on" not an instance of Function.');
      }
      /**
       * @type {Buffer[]}
       */
      const buffers = [];
      readable.once('error', (error) => {
        reject(error);
      });
      readable.on('data', (buffer) => {
        buffers.push(buffer);
      });
      readable.once('end', () => {
        const response = Buffer.concat(buffers);
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });

  const s3c = {
    bucket_list,
    bucket_create,
    bucket_delete,
    bucket_private_access,
    bucket_public_read_access,
    file_url,
    file_head,
    file_upload,
    file_download,
    file_private_access,
    file_public_read_access,
    readable_to_buffer,
  };

  return s3c;
};