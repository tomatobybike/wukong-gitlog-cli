import fs from 'fs';
import path from 'path';

export function ensureOutputDir(customDir) {
  // If a custom absolute/relative path is provided, resolve relative to cwd as-is
  // Otherwise default to `output` inside current working directory.
  const dir = customDir
    ? path.resolve(process.cwd(), customDir)
    : path.resolve(process.cwd(), 'output');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export function outputFilePath(filename, customDir) {
  const dir = ensureOutputDir(customDir);
  const fullpath = path.join(dir, filename);
  const parent = path.dirname(fullpath);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  return fullpath;
}
