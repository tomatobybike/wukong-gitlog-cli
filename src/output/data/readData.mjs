import fs from 'fs'
import path from 'path'

/* ---------------- validation ---------------- */

function validateSchema(schema) {
  if (!schema.schemaVersion) {
    throw new Error('Invalid data schema: missing schemaVersion')
  }

  if (!schema.data?.commits) {
    throw new Error('Invalid data schema: commits missing')
  }
}


export function readServeData(dir) {
  const dataDir = path.join(dir, 'data')
  const schemaFile = path.join(dataDir, 'data.schema.json')

  if (!fs.existsSync(schemaFile)) {
    throw new Error('Missing data.schema.json')
  }

  const schema = JSON.parse(
    fs.readFileSync(schemaFile, 'utf8')
  )

  validateSchema(schema)

  const result = {}

  for (const [key, meta] of Object.entries(schema.data)) {
    if (!meta.file) continue

    const file = path.join(dataDir, meta.file)
    if (!fs.existsSync(file)) {
      if (meta.required) {
        throw new Error(`Missing required data file: ${meta.file}`)
      }
      continue
    }

    result[key] = JSON.parse(
      fs.readFileSync(file, 'utf8')
    )
  }

  return result
}

