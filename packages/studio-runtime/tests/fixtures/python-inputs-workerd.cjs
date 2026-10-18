const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { randomUUID, createHash } = require('node:crypto')
const { createRequire } = require('node:module')
const localRequire = createRequire(
  require.resolve('wrangler/package.json', { paths: [process.cwd()] }),
)
const { unstable_dev } = localRequire('wrangler')

async function main() {
  const seed = JSON.parse(await fs.readFile(process.argv[3], 'utf8'))
  const worker = await unstable_dev(process.argv[2], {
    config: process.argv[4],
    ip: '127.0.0.1',
    port: 0,
    local: true,
    persist: false,
    envFiles: [],
    logLevel: 'error',
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
      watch: false,
      forceLocal: true,
      enableContainers: false,
    },
  })
  async function send(path, body, reference, file) {
    return fetch(`http://${worker.address}:${worker.port}/${path}`, {
      method: 'POST',
      headers: reference
        ? { 'x-input': JSON.stringify(reference), ...(file ? { 'x-file': file } : {}) }
        : {},
      body,
      ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
    })
  }
  async function open(request) {
    const opened = await send('begin', JSON.stringify(request))
    const reference = await opened.json()
    assert.equal(opened.status, 200, JSON.stringify(reference))
    return reference
  }
  async function roundtrip(item, path = 'main.py') {
    const bytes = item.bytes ? new Uint8Array(item.bytes) : undefined
    const reference = await open(item.request)
    const size = bytes ? bytes.byteLength : item.size
    function body() {
      if (bytes) return bytes
      let offset = 0
      return new ReadableStream({
        pull(controller) {
          if (offset === size) return controller.close()
          const chunk = new Uint8Array(Math.min(64 * 1024, size - offset)).fill(item.byte)
          offset += chunk.byteLength
          controller.enqueue(chunk)
        },
      })
    }
    for (let retry = 0; retry < 2; retry++) {
      const uploaded = await send(`files/${item.fileHash}`, body(), reference)
      const result = await uploaded.json()
      assert.equal(uploaded.status, 200, JSON.stringify(result))
      assert.deepEqual(result, { sha256: item.fileHash, bytes: size })
    }
    const read = await send('read', undefined, reference, path)
    assert.equal(read.status, 200)
    const hash = createHash('sha256')
    let length = 0
    for await (const chunk of read.body) {
      length += chunk.byteLength
      hash.update(chunk)
    }
    assert.equal(length, size)
    assert.equal(hash.digest('hex'), item.fileHash)
    const removed = await send('remove', undefined, reference)
    assert.equal(removed.status, 200)
    await removed.body.cancel()
    const closed = await send('read', undefined, reference, path)
    assert.notEqual(closed.status, 200)
    await closed.body.cancel()
  }
  try {
    await roundtrip(seed.binary)
    await roundtrip(seed.empty)
    const bytes = new Uint8Array(seed.binary.bytes)
    const wrongHash = new Uint8Array(bytes)
    wrongHash[0] ^= 1
    const over = new Uint8Array(bytes.byteLength + 1)
    over.set(bytes)
    for (const corrupted of [bytes.subarray(0, -1), over, wrongHash]) {
      const request = { ...seed.binary.request, requestId: randomUUID() }
      const reference = await open(request)
      const rejected = await send(`files/${seed.binary.fileHash}`, corrupted, reference)
      assert.notEqual(rejected.status, 200)
      await rejected.body.cancel()
      const absent = await send('read', undefined, reference)
      assert.notEqual(absent.status, 200, 'An invalid upload must not leave a stored object')
      await absent.body.cancel()
      const recovered = await send(`files/${seed.binary.fileHash}`, bytes, reference)
      assert.equal(recovered.status, 200)
      await recovered.body.cancel()
      const read = await send('read', undefined, reference)
      assert.equal(read.status, 200)
      assert.deepEqual(new Uint8Array(await read.arrayBuffer()), bytes)
      const removed = await send('remove', undefined, reference)
      assert.equal(removed.status, 200)
      await removed.body.cancel()
    }
    await roundtrip(seed.quota, 'sound.bin')
    console.log(
      JSON.stringify({
        verified: true,
        cases: ['binary', 'empty', 'short', 'over', 'hash', 'quota'],
      }),
    )
  } finally {
    await worker.stop()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
