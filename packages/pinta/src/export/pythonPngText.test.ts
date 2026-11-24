import { expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createCanvas } from '@napi-rs/canvas'
import { deflateSync, gzipSync, zlibSync } from 'fflate'
import { readPintaPngText } from './pintaPngText'
import { insertPngChunkAfterIhdr, iTxtChunkData, pngChunk, pngWithPintaJson } from './pngText'
import { pngBytes, readPngDimensions } from './portableImageRender'
import { pythonPngText } from './pythonPngText'
import { PINTA_REGION_IMAGE_PNG_LIMITS as limits } from './regionImageLimits'

const python = [process.env.PYTHON, 'python3', 'python'].find(
  (name) => name && spawnSync(name, ['-I', '-c', 'import zlib, json']).status === 0,
)
function run(body: string, data: unknown): unknown {
  const result = spawnSync(
    python!,
    [
      '-I',
      '-c',
      `import sys,json,hashlib
sys.stdin.reconfigure(encoding='utf-8')
class NoGraphics:
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in ('pygame','pgzero','pyray','raylib'):
            raise ImportError('PNG admission must not import graphics: '+fullname)
sys.meta_path.insert(0,NoGraphics())
${pythonPngText}\n${body}`,
    ],
    {
      input: JSON.stringify(data),
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  )
  expect(result.status, result.stderr || result.error?.message).toBe(0)
  return JSON.parse(result.stdout)
}
function cover() {
  const canvas = createCanvas(32, 16)
  const context = canvas.getContext('2d')
  context.fillStyle = '#e04020'
  context.fillRect(0, 0, 32, 16)
  context.fillStyle = '#1234ef'
  context.fillRect(4, 3, 8, 6)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const encoded = (payload: Uint8Array, compressed = true) => {
  const body = iTxtChunkData('pinta', payload)
  if (!compressed) body[6] = 0
  return insertPngChunkAfterIhdr(cover(), pngChunk('iTXt', body))
}
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const inspect = `
results=[]
for item in json.load(sys.stdin):
    try:
        read=ler_texto_png(base64.b64decode(item['png']),item.get('limit',_PINTA_PNG_MAX_TEXT))
        results.append({'text':read['text'],'width':read['width'],'height':read['height'],'sha256':hashlib.sha256(read['png']).hexdigest()})
    except ValueError:
        results.append(None)
print(json.dumps(results))
`
function expected(source: Uint8Array, limit?: number): unknown {
  try {
    const result = readPintaPngText(source, limit)
    return {
      text: result.text,
      width: result.width,
      height: result.height,
      sha256: digest(result.png),
    }
  } catch {
    return null
  }
}

it.skipIf(!python)(
  'the common Python reader captures actual writer bytes without graphics or mutable aliases',
  async () => {
    const text = JSON.stringify({ format: 'pinta', version: 5, name: 'Bosque 🌳' })
    const png = await pngWithPintaJson(cover(), text)
    expect(
      run(
        `f=json.load(sys.stdin)
raw=bytearray(base64.b64decode(f['png']))
padded=bytearray(b'1234567')+raw+bytearray(b'12345')
read=ler_texto_png(memoryview(padded)[7:-5])
padded[:]=bytes(len(padded))
assert read['png'][:8]==_PINTA_PNG_SIGNATURE
print(json.dumps({'text':read['text'],'width':read['width'],'height':read['height'],'sha256':hashlib.sha256(read['png']).hexdigest()}))`,
        { png: b64(png) },
      ),
    ).toEqual(expected(png))
  },
)

it.skipIf(!python)(
  'UTF-8, BOM, chunk boundaries and exact byte budgets agree with the JS reader',
  () => {
    const texts = [
      '',
      '🌳 á',
      '\ufeff',
      '\ufeff\ufeffBosque',
      'a'.repeat(16383) + '🌳'.repeat(6000),
    ]
    const inputs: { png: Uint8Array; limit: number }[] = []
    for (const text of texts) {
      const bytes = new TextEncoder().encode(text)
      for (const compressed of [false, true]) {
        const png = encoded(compressed ? zlibSync(bytes) : bytes, compressed)
        inputs.push({ png, limit: bytes.length })
        if (bytes.length) inputs.push({ png, limit: bytes.length - 1 })
      }
    }
    for (const bytes of [
      new Uint8Array([0xc3, 0x28]),
      new Uint8Array([0xf0, 0x9f, 0x8c]),
      new Uint8Array([0xef, 0xbb]),
    ])
      for (const compressed of [false, true])
        inputs.push({ png: encoded(compressed ? zlibSync(bytes) : bytes, compressed), limit: 100 })
    expect(
      run(
        inspect,
        inputs.map((f) => ({ png: b64(f.png), limit: f.limit })),
      ),
    ).toEqual(inputs.map((f) => expected(f.png, f.limit)))
  },
)

it.skipIf(!python)(
  'zlib checksum, exact consumption and supported wrappers agree with the JS reader',
  () => {
    const bytes = new TextEncoder().encode('{"name":"Vila"}')
    const good = zlibSync(bytes),
      corrupt = good.slice()
    corrupt[corrupt.length - 1]! ^= 1
    const append = (a: Uint8Array, b: Uint8Array) => new Uint8Array([...a, ...b])
    const boundary = zlibSync(new Uint8Array(16373).fill(97), { level: 0 })
    expect(boundary.length).toBe(16384)
    const payloads = [
      good,
      corrupt,
      append(good, new Uint8Array([0])),
      append(good, good.subarray(-4)),
      append(good, good),
      good.subarray(0, -1),
      gzipSync(bytes),
      deflateSync(bytes),
      boundary,
      append(boundary, new Uint8Array([0])),
    ]
    const pngs = payloads.map((payload) => encoded(payload))
    expect(
      run(
        inspect,
        pngs.map((png) => ({ png: b64(png) })),
      ),
    ).toEqual(pngs.map((png) => expected(png)))
    expect(pngs.filter((png) => expected(png))).toHaveLength(2)
  },
)

it.skipIf(!python)(
  'CRC, duplicate Pinta metadata and static PNG controls all precede decompression',
  () => {
    const source = encoded(zlibSync(new TextEncoder().encode('x'.repeat(1000))))
    const crc = source.slice()
    crc[crc.length - 1]! ^= 1
    const pngs = [
      crc,
      source.subarray(0, -1),
      cover(),
      insertPngChunkAfterIhdr(
        source,
        pngChunk('iTXt', iTxtChunkData('pinta', zlibSync(new TextEncoder().encode('second')))),
      ),
    ]
    for (const type of ['acTL', 'fcTL', 'fdAT', 'EVIL', 'IHDR'])
      pngs.push(insertPngChunkAfterIhdr(source, pngChunk(type, new Uint8Array(13))))
    for (const [index, value] of [
      [6, 2],
      [7, 1],
      [8, 101],
      [9, 101],
    ]) {
      const body = iTxtChunkData('pinta', zlibSync(new TextEncoder().encode('{}')))
      body[index!] = value!
      pngs.push(insertPngChunkAfterIhdr(cover(), pngChunk('iTXt', body)))
    }
    expect(
      run(
        `items=json.load(sys.stdin)
original=zlib.decompressobj
calls=[]
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
zlib.decompressobj=watched
for item in items[:-1]:
    try:
        ler_texto_png(base64.b64decode(item),0)
        raise AssertionError('Invalid PNG admitted')
    except ValueError:
        pass
assert calls==[]
assert ler_texto_png(base64.b64decode(items[-1]),1000)['text']=='x'*1000 and len(calls)==1
print(json.dumps({'invalid':len(items)-1,'controlCalls':len(calls)}))`,
        [...pngs.map(b64), b64(source)],
      ),
    ).toEqual({ invalid: pngs.length, controlCalls: 1 })
    expect(
      run(
        inspect,
        pngs.map((png) => ({ png: b64(png) })),
      ),
    ).toEqual(pngs.map((png) => expected(png)))
  },
)

it.skipIf(!python)(
  'both compressed-input and output windows stay bounded, including an expansion bomb',
  () => {
    let seed = 1234
    const text = Array.from({ length: 256 * 1024 }, () => {
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      return String.fromCharCode(32 + ((seed >>> 0) % 95))
    }).join('')
    const ordinary = encoded(zlibSync(new TextEncoder().encode(text)))
    const bomb = encoded(zlibSync(new Uint8Array(2 * 1024 * 1024).fill(97)))
    expect(
      run(
        `f=json.load(sys.stdin)
original=zlib.decompressobj
windows=[]
class Watched:
    def __init__(self,*args,**kwargs):
        self.inner=original(*args,**kwargs)
    def __getattr__(self,key):
        return getattr(self.inner,key)
    def decompress(self,data,maximum=0):
        windows.append((len(data),maximum))
        return self.inner.decompress(data,maximum)
zlib.decompressobj=Watched
try:
    ler_texto_png(base64.b64decode(f['bomb']),128)
    raise AssertionError('Expansion budget ignored')
except ValueError as error:
    assert 'ultrapassam' in str(error)
assert windows and all(0<maximum<=129 and size<=16384 for size,maximum in windows)
windows.clear()
read=ler_texto_png(base64.b64decode(f['ordinary']))
assert len(windows)>4 and all(size<=16384 and 0<maximum<=16384 for size,maximum in windows)
print(json.dumps({'sha256':hashlib.sha256(read['text'].encode('utf-8')).hexdigest(),'bounded':True}))`,
        { ordinary: b64(ordinary), bomb: b64(bomb) },
      ),
    ).toEqual({ sha256: digest(text), bounded: true })
  },
)

it.skipIf(!python)(
  'inline URLs and pixel/header limits agree with the existing encoded-file profile',
  () => {
    const pngs = [cover()]
    for (const [width, height] of [
      [0, 1],
      [4097, 1],
      [2048, 2048],
      [2048, 2049],
      [4096, 1],
    ]) {
      const png = cover()
      new DataView(png.buffer, png.byteOffset, png.byteLength).setUint32(16, width!)
      new DataView(png.buffer, png.byteOffset, png.byteLength).setUint32(20, height!)
      const replacement = pngChunk('IHDR', png.subarray(16, 29))
      png.set(replacement, 8)
      pngs.push(png)
    }
    const urls = pngs.map((png) => `data:image/png;base64,${b64(png)}`)
    urls.push(
      'https://example.com/image.png',
      '../image.png',
      urls[0]!.replace('image/png', 'image/jpeg'),
      urls[0]!.replace('base64,', 'base64,\n'),
    )
    let padded = cover()
    while (padded.length % 3 === 0)
      padded = insertPngChunkAfterIhdr(padded, pngChunk('aaAA', new Uint8Array(1)))
    const original = b64(padded),
      at = original.length - (original.endsWith('==') ? 3 : 2)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    urls.push(
      `data:image/png;base64,${original.slice(0, at)}${alphabet[alphabet.indexOf(original[at]!) + 1]}${original.slice(at + 1)}`,
    )
    const expectedUrls = urls.map((url) => {
      try {
        const png = pngBytes(url, limits)
        return { ...readPngDimensions(png, limits), sha256: digest(png) }
      } catch {
        return null
      }
    })
    expect(
      run(
        `results=[]
for url in json.load(sys.stdin):
    try:
        read=png_da_url(url)
        results.append({'width':read['width'],'height':read['height'],'sha256':hashlib.sha256(read['png']).hexdigest()})
    except ValueError:
        results.append(None)
print(json.dumps(results))`,
        urls,
      ),
    ).toEqual(expectedUrls)
  },
)

it.skipIf(!python)(
  'invalid budgets cannot widen the target or allocate a copy of an oversized source',
  () => {
    const png = encoded(zlibSync(new TextEncoder().encode('{}')))
    expect(
      run(
        `source=base64.b64decode(json.load(sys.stdin))
for maximum in (-1,float('nan'),float('inf'),1.5,True,_PINTA_PNG_MAX_TEXT+1):
    try:
        ler_texto_png(source,maximum)
        raise AssertionError('Invalid budget admitted')
    except ValueError:
        pass
for raw in ([],memoryview(bytes(64)).cast('H')):
    try:
        capturar_png(raw)
        raise AssertionError('Invalid source admitted')
    except ValueError:
        pass
import tracemalloc
oversized=bytearray(_PINTA_PNG_MAX_BYTES+1)
tracemalloc.start()
try:
    capturar_png(oversized)
    raise AssertionError('Oversized PNG admitted')
except ValueError:
    pass
current,peak=tracemalloc.get_traced_memory()
assert peak<65536,(current,peak)
assert ler_texto_png(source,2.0)['text']=='{}'
print(json.dumps({'bounded':True}))`,
        b64(png),
      ),
    ).toEqual({ bounded: true })
  },
)
