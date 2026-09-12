const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { createRequire } = require('node:module')
const sharp = createRequire(path.join(__dirname, '../../../packages/community-kids/package.json'))(
  'sharp',
)

const root = path.resolve(__dirname, '../../..')
const manifest = require('./assets.json')
const hash = (data) => createHash('sha256').update(data).digest('hex')

async function verify(record, requireCutout = false) {
  const file = path.resolve(root, record.path)
  assert.ok(file.startsWith(root + path.sep), `Fora do repositório: ${record.path}`)
  const data = fs.readFileSync(file)
  assert.equal(hash(data), record.sha256, `Arquivo alterado: ${record.path}`)
  const meta = await sharp(data).metadata()
  assert.equal(meta.width, record.width, record.path)
  assert.equal(meta.height, record.height, record.path)
  assert.equal(meta.hasAlpha, record.alpha, record.path)
  assert.equal(data.length, record.bytes, record.path)
  if (record.previousSha256) assert.notEqual(record.sha256, record.previousSha256, record.path)
  if (record.alpha && requireCutout) {
    const { data: pixels, info } = await sharp(data)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let transparent = 0
    let opaque = 0
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++
      if (pixels[i] >= 250) opaque++
    }
    assert.ok(transparent > info.width * info.height * 0.03, `Falta recorte: ${record.path}`)
    assert.ok(opaque > info.width * info.height * 0.02, `Arte vazia: ${record.path}`)
    for (const i of [
      0,
      info.width - 1,
      info.width * (info.height - 1),
      info.width * info.height - 1,
    ]) {
      // PNGs mestres podem conter resíduo de antialias de até 2/255.
      assert.ok(pixels[i * 4 + 3] <= 2, `Canto sem transparência: ${record.path}`)
    }
  }
}

;(async () => {
  let runtimeFiles = 0
  for (const item of manifest.runtime) {
    await verify(item.master, true)
    const copies = new Map()
    for (const file of item.files) {
      await verify(file, true)
      const key = `${file.width}x${file.height}`
      if (copies.has(key))
        assert.equal(file.sha256, copies.get(key), `Cópias divergentes: ${item.id}`)
      copies.set(key, file.sha256)
      runtimeFiles++
    }
  }
  assert.equal(manifest.admin.length, 4)
  for (const item of manifest.admin) {
    await verify(item.original)
    await verify(item.master)
    await verify(item.upload)
    assert.ok(item.upload.bytes < 5_000_000, `Upload acima do limite: ${item.id}`)
    if (item.id.startsWith('certificado')) {
      assert.ok(
        Math.abs(item.upload.width / item.upload.height - Math.SQRT2) < 0.002,
        'Certificado fora de A4 paisagem',
      )
    } else {
      assert.equal(item.upload.width * 9, item.upload.height * 16, `Capa fora de 16:9: ${item.id}`)
    }
  }
  console.log(
    `OK: ${manifest.runtime.length} artes, ${runtimeFiles} arquivos públicos e 4 uploads; mestres, originais, hashes, dimensões, transparência e cópias conferidos.`,
  )
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
