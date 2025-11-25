import fs from 'fs';
import path from 'path';

export function ensureOutputDir() {
  const dir = path.resolve(process.cwd(), 'output');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export function outputFilePath(filename) {
  const dir = ensureOutputDir();
  return path.join(dir, filename);
}
