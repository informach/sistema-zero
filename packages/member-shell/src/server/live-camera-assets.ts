import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Fixed local assets only. No credentials, remote URL proxy or user-supplied paths. */
const assets: Record<string, { mime: string }> = {
  'vision_wasm_internal.js': {
    mime: 'text/javascript',
  },
  'vision_wasm_internal.wasm': {
    mime: 'application/wasm',
  },
  'vision_wasm_module_internal.js': {
    mime: 'text/javascript',
  },
  'vision_wasm_module_internal.wasm': {
    mime: 'application/wasm',
  },
  'vision_wasm_nosimd_internal.js': {
    mime: 'text/javascript',
  },
  'vision_wasm_nosimd_internal.wasm': {
    mime: 'application/wasm',
  },
  'selfie_segmenter_landscape.tflite': {
    mime: 'application/octet-stream',
  },
}

export async function serveLiveCameraAsset(asset: string): Promise<Response> {
  const item = Object.hasOwn(assets, asset) ? assets[asset] : undefined
  if (!item) return new Response('Not found', { status: 404 })
  const data = await readFile(join(process.cwd(), 'public', 'live-camera', asset))
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': item.mime,
      'Content-Length': String(data.length),
      'Cache-Control': 'public, max-age=3600',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
