// @ts-check

import fs from 'fs';
import path from 'path';
import assert from './assert.mjs';


/**
 * @param {string} file_path
 * @returns {any[]}
 */
export const load_array = (file_path) => {
  assert(typeof file_path === 'string');
  const dirname = path.dirname(file_path);
  if (fs.existsSync(file_path) === false) {
    if (fs.existsSync(dirname) === false) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    const array_string = JSON.stringify([]);
    fs.writeFileSync(file_path, array_string);
    const basename = path.basename(file_path);
    console.log(`created: ${basename}`);
  }
  const array_string = fs.readFileSync(file_path, { encoding: 'utf-8' });
  const array = JSON.parse(array_string);
  assert(array instanceof Array);
  const basename = path.basename(file_path);
  console.log(`loaded: ${basename}, ${array.length} items.`);
  return array;
};


/**
 * @param {string} file_path
 * @param {any[]} array
 * @returns {void}
 */
export const save_array = (file_path, array) => {
  assert(typeof file_path === 'string');
  assert(array instanceof Array);
  const dirname = path.dirname(file_path);
  if (fs.existsSync(dirname) === false) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  const array_string = JSON.stringify(array);
  fs.writeFileSync(file_path, array_string);
  const basename = path.basename(file_path);
  console.log(`updated: ${basename}`);
};


/**
 * @param {Function} callback
 * @returns {void}
 * @description SIGTERM, killall node
 * @description SIGTSTP, ctrl + z
 * @description SIGINT, ctrl + c
 */
export const on_exit = (callback) => {

  assert(callback instanceof Function);

  /**
   * @param {string} signal
   */
  const on_process_signal = (signal) => {
    assert(typeof signal === 'string');
    console.log(`process signal: ${signal}`);
    process.exit(0);
  };

  /**
   * @param {number} code
   */
  const on_process_exit = (code) => {
    assert(typeof code === 'number');
    console.log(`process exit code: ${code}`);
    callback();
  };

  process.on('SIGTERM', on_process_signal);
  process.on('SIGTSTP', on_process_signal);
  process.on('SIGINT', on_process_signal);
  process.on('exit', on_process_exit);
};


/**
 * @param {number} timeout
 */
export const sleep = async (timeout) => {
  assert(typeof timeout === 'number');
  await new Promise((resolve) => setTimeout(resolve, timeout));
};