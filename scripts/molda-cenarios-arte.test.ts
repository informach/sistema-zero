import { expect, test } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  glb as criarGlb,
  exemplo,
} from '../packages/molda-cenarios-motor/tests/fixtures/glb-compilacao'
import { descreverArteCenario, validarArteCenario } from './molda-cenarios-arte'

test('um checkout novo só cataloga modelos cujos binários foram realmente materializados', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'sz-cenarios-acervo-'))
  if (
    dirname(resolve(pasta)) !== resolve(tmpdir()) ||
    !basename(pasta).startsWith('sz-cenarios-acervo-')
  )
    throw Error('Recusada pasta temporária fora do diretório do ensaio')
  const repo = join(pasta, 'fontes')
  const biblioteca = join(repo, 'biblioteca_aventura/qa')
  mkdirSync(biblioteca, { recursive: true })
  try {
    const fonte = exemplo()
    new Float32Array(fonte.bin.buffer).set([0, 0, 0, 1, 0, 0, 0, 1, 1])
    fonte.j.accessors[0]!.max = [1, 1, 1]
    const bytes = criarGlb(fonte.j, fonte.bin)
    writeFileSync(join(biblioteca, 'peca.glb'), bytes)
    writeFileSync(
      join(biblioteca, 'catalogo.json'),
      JSON.stringify({ itens: [{ id: 'peca', rotulo: 'Peça', arquivo: 'peca.glb', tris: 2 }] }),
    )
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        cwd: repo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
    git('init')
    git('add', '.')
    git(
      '-c',
      'user.name=Teste',
      '-c',
      'user.email=teste@example.invalid',
      'commit',
      '-m',
      'acervo mínimo',
    )
    const commit = git('rev-parse', 'HEAD')
    const resultado = spawnSync(
      process.execPath,
      [
        '--no-env-file',
        fileURLToPath(new URL('./molda-cenarios-acervo.ts', import.meta.url)),
        commit,
      ],
      {
        cwd: pasta,
        env: { ...process.env, ARQUIPELAGO_ARTE_REPO: repo },
        encoding: 'utf8',
        timeout: 45_000,
      },
    )
    expect(resultado.status, resultado.stderr).toBe(0)
    const destino = join(pasta, 'output/molda-cenarios/acervo')
    const catalogo = JSON.parse(readFileSync(join(destino, 'catalogo.json'), 'utf8'))
    expect(catalogo.modelos).toHaveLength(1)
    for (const modelo of catalogo.modelos) {
      const guardado = readFileSync(join(destino, modelo.arquivo))
      expect(createHash('sha256').update(guardado).digest('hex')).toBe(modelo.digest)
      expect(guardado.length).toBe(modelo.bytes)
    }
    const pendencias = JSON.parse(readFileSync(join(destino, 'dependencias.json'), 'utf8'))
    expect(pendencias.dependencias.length).toBeGreaterThan(0)
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}, 60_000)

test('arte privada exige identificador por conteúdo e GLB sem dependências externas', () => {
  const glb = (uri?: string) => {
    let json = JSON.stringify({ asset: { version: '2.0' }, buffers: uri ? [{ uri }] : [] })
    json = json.padEnd(Math.ceil(json.length / 4) * 4, ' ')
    const b = Buffer.alloc(20 + json.length)
    b.writeUInt32LE(0x46546c67, 0)
    b.writeUInt32LE(2, 4)
    b.writeUInt32LE(b.length, 8)
    b.writeUInt32LE(json.length, 12)
    b.writeUInt32LE(0x4e4f534a, 16)
    b.write(json, 20)
    return b
  }
  const nome = (b: Uint8Array) => `${createHash('sha256').update(b).digest('hex')}.glb`
  const b = glb()
  expect(validarArteCenario(nome(b), b).key).toStartWith('molda-cenarios/arte/')
  expect(() => descreverArteCenario('../avatar.glb')).toThrow()
  expect(() => validarArteCenario(`${'0'.repeat(64)}.glb`, b)).toThrow('SHA-256')
  const externo = glb('https://example.com/segredo')
  expect(() => validarArteCenario(nome(externo), externo)).toThrow('incorporar')
})
