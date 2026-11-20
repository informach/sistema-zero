import { createHash } from 'node:crypto'

/**
 * A conferência de cada arte do acervo de cenários (`arte:cenarios`): identificador por conteúdo
 * (SHA-256), tamanho, cabeçalho PNG ou GLB, e GLB com imagens e buffers embutidos. Morava no
 * Admin, junto do piloto antigo dos cenários; ficou aqui, ao lado do único script que a usa.
 */

export const ARTE_CENARIO_MAX_BYTES = 64 * 1024 * 1024
export function descreverArteCenario(nome: string) {
  const m = /^([a-f0-9]{64})\.(glb|png)$/.exec(nome)
  if (!m) throw Error('Identificador de arte inválido')
  return {
    digest: m[1]!,
    extensao: m[2]!,
    key: `molda-cenarios/arte/${nome}`,
    maxBytes: m[2] === 'png' ? 1024 * 1024 : ARTE_CENARIO_MAX_BYTES,
    contentType: m[2] === 'png' ? 'image/png' : 'model/gltf-binary',
  }
}
export function validarArteCenario(nome: string, bytes: Uint8Array) {
  const d = descreverArteCenario(nome),
    v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (!bytes.length || bytes.length > d.maxBytes) throw Error('Tamanho de arte inválido')
  if (createHash('sha256').update(bytes).digest('hex') !== d.digest)
    throw Error('SHA-256 diferente do identificador')
  if (d.extensao === 'png') {
    if (bytes.length < 24 || v.getUint32(0) !== 0x89504e47 || v.getUint32(4) !== 0x0d0a1a0a)
      throw Error('PNG inválido')
    const w = v.getUint32(16),
      h = v.getUint32(20)
    if (w < 1 || h < 1 || w > 1024 || h > 1024)
      throw Error('Miniatura acima das dimensões permitidas')
  } else {
    if (
      bytes.length < 20 ||
      v.getUint32(0, true) !== 0x46546c67 ||
      v.getUint32(4, true) !== 2 ||
      v.getUint32(8, true) !== bytes.length ||
      v.getUint32(16, true) !== 0x4e4f534a
    )
      throw Error('GLB inválido')
    const tamanho = v.getUint32(12, true)
    if (tamanho > bytes.length - 20) throw Error('Chunk JSON inválido')
    const gltf = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, 20 + tamanho)),
    ) as { buffers?: { uri?: string }[]; images?: { uri?: string }[] }
    for (const r of [...(gltf.buffers ?? []), ...(gltf.images ?? [])])
      if (r.uri && !r.uri.startsWith('data:'))
        throw Error('GLB deve incorporar suas imagens e buffers')
  }
  return d
}
