import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url';

/* ---------------- validation ---------------- */

function validateSchema(schema) {
  if (!schema.schemaVersion) {
    throw new Error('Invalid data schema: missing schemaVersion')
  }

  if (!schema.data?.commits) {
    throw new Error('Invalid data schema: commits missing')
  }
}


export async function readServeData(dir) {
  const dataDir = path.join(dir, 'data');
  const schemaFile = path.join(dataDir, 'data.schema.json');

  if (!fs.existsSync(schemaFile)) throw new Error('Missing data.schema.json');

  // 读取 schema 依然可以用 fs，因为它是配置文件
  const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
  validateSchema(schema);

  const result = {};

  for (const [key, meta] of Object.entries(schema.data)) {
    if (!meta.file) continue;

    const filePath = path.join(dataDir, meta.file);
    if (!fs.existsSync(filePath)) {
      if (meta.required) throw new Error(`Missing: ${meta.file}`);
      continue;
    }

    // 关键点：将绝对路径转换为 file:// URL 以支持 Windows 和 dynamic import
    const fileUrl = pathToFileURL(filePath).href;

    if (filePath.endsWith('.mjs')) {
      const module = await import(fileUrl);
      result[key] = module.default;
    } else {
      // JSON 文件处理
      const raw = fs.readFileSync(filePath, 'utf8');
      result[key] = JSON.parse(raw);
    }
  }

  // TODO: remove debug log before production
  // console.log('✅', 'result', result);
  return result;
}
