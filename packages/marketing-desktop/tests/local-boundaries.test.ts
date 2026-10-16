import { afterEach, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { LocalAssets, parseRange } from '../src/main/assets'
import { nativeEnvironment } from '../src/main/native-client'
import { runRequestSchema } from '../src/shared/contracts'

const cleanup: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const clean of cleanup.splice(0)) await clean()
})

describe('limites locais', () => {
  test('não transfere credenciais de API ou variáveis de execução para o cliente', () => {
    expect(
      nativeEnvironment({
        PATH: 'tools',
        APPDATA: 'profile',
        OPENAI_API_KEY: 'secret',
        ANTHROPIC_API_KEY: 'secret',
        NODE_OPTIONS: '--require untrusted',
        ELECTRON_RUN_AS_NODE: '1',
      }),
    ).toEqual({ PATH: 'tools', APPDATA: 'profile' })
  })
  test('rejeita imagem pelo provedor errado, campo extra e edição sem origem', () => {
    expect(
      runRequestSchema.safeParse({ provider: 'claude', kind: 'image', prompt: 'x' }).success,
    ).toBe(false)
    expect(
      runRequestSchema.safeParse({ provider: 'codex', kind: 'edit-image', prompt: 'x' }).success,
    ).toBe(false)
    expect(
      runRequestSchema.safeParse({ provider: 'codex', kind: 'copy', prompt: 'x', command: 'run' })
        .success,
    ).toBe(false)
  })
  test('intervalos de vídeo inválidos não expõem leitura arbitrária', () => {
    expect(parseRange('bytes=3-5', 10)).toEqual({ start: 3, end: 5 })
    expect(parseRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 })
    expect(parseRange('bytes=99-', 10)).toBeNull()
    expect(parseRange('bytes=5-2', 10)).toBeNull()
    expect(parseRange('bytes=0-1,3-4', 10)).toBeNull()
  })
  test('servidor só entrega assets registrados e mantém o original', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-assets-'))
    const store = new LocalAssets(path.join(directory, 'assets'))
    cleanup.push(async () => {
      store.close()
      if (
        path.dirname(directory) !== path.resolve(os.tmpdir()) ||
        !path.basename(directory).startsWith('marketing-assets-')
      )
        throw new Error('Diretório temporário inesperado.')
      await rm(directory, { recursive: true, force: true })
    })
    await store.start()
    const original = path.join(directory, 'gravação com espaço.mp4')
    await writeFile(original, '0123456789')
    const asset = await store.importFile(original)
    expect(await (await fetch(asset.url, { headers: { Range: 'bytes=2-5' } })).text()).toBe('2345')
    expect((await fetch(asset.url.replace(asset.id, 'unknown'))).status).toBe(404)
    expect((await fetch(new URL('/outside', asset.url))).status).toBe(404)
    expect(store.ownsUrl(asset.url)).toBe(true)
    expect(store.ownsUrl('https://example.com/video.mp4')).toBe(false)
    expect(await store.bytes(asset.id)).toEqual(Buffer.from('0123456789'))
    expect(() => store.get('../outside')).toThrow()
    await expect(store.addImage(Buffer.from('not an image'))).rejects.toThrow()
    const beforeRejected = await readdir(store.directory)
    const invalid = path.join(directory, 'original-incompleto.png'),
      bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    await writeFile(invalid, bytes)
    await expect(store.importFile(invalid)).rejects.toThrow()
    await expect(store.addImage(bytes)).rejects.toThrow()
    expect(await readdir(store.directory)).toEqual(beforeRejected)
    expect(await readFile(invalid)).toEqual(bytes)
  })
  test('metadados e JSON original sobrevivem ao reinício; alteração do arquivo é detectada', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-assets-'))
    let store = new LocalAssets(path.join(directory, 'assets'))
    cleanup.push(async () => {
      store.close()
      if (
        path.dirname(directory) !== path.resolve(os.tmpdir()) ||
        !path.basename(directory).startsWith('marketing-assets-')
      )
        throw new Error('Pasta inválida')
      await rm(directory, { recursive: true, force: true })
    })
    await store.start()
    const source = path.join(directory, 'receita.json'),
      content = JSON.stringify({ texto: 'Original' })
    await writeFile(source, content)
    const asset = await store.importFile(source)
    store.close()
    store = new LocalAssets(path.join(directory, 'assets'))
    await store.start()
    expect(store.diagnostics()).toEqual([])
    expect(await store.bytes(asset.id)).toEqual(Buffer.from(content))
    expect(store.get(asset.id).asset.sha256).toBe(asset.sha256)
    expect(store.get(asset.id).asset.url).not.toBe(asset.url)
    await store.verify(asset.id)
    await writeFile(store.get(asset.id).path, JSON.stringify({ texto: 'Alterado' }))
    await rejects(() => store.verify(asset.id), /mudou|danificado/)
  })
})
