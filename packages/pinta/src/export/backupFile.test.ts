import { describe, expect, it } from 'bun:test'
import { strToU8, Zip, ZipPassThrough, zipSync } from 'fflate'
import { createPixelBackgroundAsset } from '../core/project'
import { readPintaBackupFile } from './backupFile'
import { PINTA_GALLERY_ZIP_ENTRY } from './backupFormat'
import { galleryToPintaJson } from './projectJson'
import { zipGallery } from './zip'

class TrackingFile extends File {
  readonly slices: Array<{ start: number; end: number }> = []

  override stream() {
    this.slices.push({ start: 0, end: this.size })
    return super.stream()
  }

  override slice(start?: number, end?: number, contentType?: string): Blob {
    const normalizedStart = start ?? 0
    const normalizedEnd = end ?? this.size
    this.slices.push({ start: normalizedStart, end: normalizedEnd })
    return super.slice(start, end, contentType)
  }
}

function zipBytes(files: Record<string, string | Uint8Array>): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, value]) => [
        name,
        typeof value === 'string' ? strToU8(value) : value,
      ]),
    ),
  )
}

/** Copia bytes possivelmente apoiados em SharedArrayBuffer para um BlobPart portável. */
function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function patchFirstSignature(
  bytes: Uint8Array,
  signature: number,
  patch: (view: DataView, offset: number) => void,
): Uint8Array {
  const patched = new Uint8Array(bytes)
  const view = new DataView(patched.buffer)
  for (let offset = 0; offset <= patched.length - 4; offset += 1) {
    if (view.getUint32(offset, true) !== signature) continue
    patch(view, offset)
    return patched
  }
  throw new Error(`Assinatura ZIP não encontrada: ${signature.toString(16)}`)
}

function zipWithDuplicateEntry(name: string, first: string, second: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    const archive = new Zip((error, chunk, final) => {
      if (error) {
        reject(error)
        return
      }
      chunks.push(chunk)
      if (!final) return
      const size = chunks.reduce((total, part) => total + part.length, 0)
      const joined = new Uint8Array(size)
      let offset = 0
      for (const part of chunks) {
        joined.set(part, offset)
        offset += part.length
      }
      resolve(joined)
    })
    for (const content of [first, second]) {
      const entry = new ZipPassThrough(name)
      archive.add(entry)
      entry.push(strToU8(content), true)
    }
    archive.end()
  })
}

describe('leitor de backup do Pinta', () => {
  const json = galleryToPintaJson([
    createPixelBackgroundAsset({ name: 'ceu', width: 16, height: 12 }),
  ])

  it('abre o ZIP e lê somente diretório, cabeçalho e JSON — nunca a entrada ignorada grande', async () => {
    const ignored = new Uint8Array(2 * 1024 * 1024)
    for (let index = 0; index < ignored.length; index += 1) {
      ignored[index] = (index * 131 + (index >>> 8)) & 0xff
    }
    const zip = zipSync(
      {
        'cenarios/ceu.png': ignored,
        [PINTA_GALLERY_ZIP_ENTRY]: strToU8(json),
        'LEIA-ME.txt': strToU8('olá'),
      },
      { level: 0 },
    )
    const file = new TrackingFile([zip.slice().buffer as ArrayBuffer], 'galeria.zip', {
      type: 'application/zip',
    })

    const result = await readPintaBackupFile(file)
    expect(result).toEqual({ ok: true, source: 'zip', text: json })
    const bytesRead = file.slices.reduce((total, range) => total + (range.end - range.start), 0)
    expect(bytesRead).toBeLessThan(256 * 1024)
  })

  it('abre de volta o ZIP realmente produzido por Baixar tudo', async () => {
    const bytes = await zipGallery([
      createPixelBackgroundAsset({ name: 'ceu-do-pinta', width: 16, height: 12 }),
    ])
    const result = await readPintaBackupFile(
      new File([bytes.slice().buffer as ArrayBuffer], 'meus-desenhos-pinta.zip', {
        type: 'application/zip',
      }),
    )
    expect(result.ok && result.source).toBe('zip')
    expect(result.ok && result.text).toContain('ceu-do-pinta')
  })

  it('o botão inteligente aceita também um .pinta.json solto', async () => {
    const result = await readPintaBackupFile(
      new File([json], 'ceu.pinta.json', { type: 'application/json' }),
    )
    expect(result).toEqual({ ok: true, source: 'json', text: json })
  })

  it('explica ZIP inválido, sem backup e com entrada duplicada', async () => {
    expect(
      await readPintaBackupFile(
        new File([strToU8('não é zip')], 'invalido.zip', { type: 'application/zip' }),
      ),
    ).toEqual({
      ok: false,
      reason: 'invalid-zip',
    })

    expect(
      await readPintaBackupFile(
        new File([ownedBuffer(zipBytes({ 'outro.json': json }))], 'sem-galeria.zip', {
          type: 'application/zip',
        }),
      ),
    ).toEqual({
      ok: false,
      reason: 'missing-backup',
    })

    const duplicate = await zipWithDuplicateEntry(PINTA_GALLERY_ZIP_ENTRY, json, json)
    expect(
      await readPintaBackupFile(
        new File([ownedBuffer(duplicate)], 'duplicado.zip', { type: 'application/zip' }),
      ),
    ).toEqual({
      ok: false,
      reason: 'duplicate-backup',
    })
  })

  it('interrompe a entrada descompactada assim que ela passa do teto', async () => {
    const zip = zipBytes({ [PINTA_GALLERY_ZIP_ENTRY]: '123456789' })
    // O limite público é grande; esta entrada altera o tamanho descompactado no diretório central
    // para provar que a recusa acontece antes de ler os dados.
    const patched = patchFirstSignature(zip, 0x02014b50, (view, offset) => {
      view.setUint32(offset + 24, 33 * 1024 * 1024, true)
    })
    expect(
      await readPintaBackupFile(
        new File([ownedBuffer(patched)], 'grande.zip', { type: 'application/zip' }),
      ),
    ).toEqual({ ok: false, reason: 'too-large' })
  })

  it('recusa a entrada canônica criptografada e marcadores ZIP64', async () => {
    const zip = zipBytes({ [PINTA_GALLERY_ZIP_ENTRY]: json })
    const encrypted = patchFirstSignature(zip, 0x02014b50, (view, offset) => {
      view.setUint16(offset + 8, view.getUint16(offset + 8, true) | 1, true)
    })
    expect(
      await readPintaBackupFile(
        new File([ownedBuffer(encrypted)], 'criptografado.zip', { type: 'application/zip' }),
      ),
    ).toEqual({ ok: false, reason: 'invalid-zip' })

    const zip64 = patchFirstSignature(zip, 0x06054b50, (view, offset) => {
      view.setUint16(offset + 10, 0xffff, true)
    })
    expect(
      await readPintaBackupFile(
        new File([ownedBuffer(zip64)], 'zip64.zip', { type: 'application/zip' }),
      ),
    ).toEqual({ ok: false, reason: 'invalid-zip' })
  })
})
