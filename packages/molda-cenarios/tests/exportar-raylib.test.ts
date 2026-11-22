import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { readZipFiles } from '@sistemazero/molda/arquivos'
import { lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import { arquivosDoPacoteRaylib, exportarPacoteRaylib } from '../src/exportar/raylib'

const pacote = () => ({
  cena: lerCenaCompilada({
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: "Praça'); __import__('os').abort() #",
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'ilha', revisao: 12, digest: 'a'.repeat(64) },
    arquivos: [],
    entidades: [],
    nos: [],
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }),
  arquivos: new Map<string, Uint8Array>(),
})

test('Raylib distribui a fonte oficial e dados separados, sem transformar nome autoral em código', async () => {
  const p = pacote(),
    antes = JSON.stringify(p.cena),
    r = await arquivosDoPacoteRaylib(p, new AbortController().signal),
    ler = (nome: string) => new TextDecoder().decode(r.arquivos.get(nome)!)
  expect(r.modulo).toMatch(/^cenario_[a-z0-9_]+$/)
  expect(ler('requisitos-raylib.txt')).toBe('raylib==6.0.1.0\n')
  expect(ler('cenario.py')).toContain('class Cenario:')
  expect(JSON.parse(ler('cenario.json')).nome).toBe(p.cena.nome)
  expect(ler(`${r.modulo}.py`)).not.toContain(p.cena.nome)
  expect(ler('main.py')).not.toContain(p.cena.nome)
  // Com regiões, o cenário carrega pela posição da câmera: o exemplo chama o atualizar a cada
  // quadro (revisão do lote 7b; sem isso, as regiões longe do início nunca apareciam).
  expect(ler('main.py')).toContain('lugar.atualizar(camera.position.x, camera.position.z)')
  expect(ler('LEIA-ME.txt')).toContain('caixas')
  expect(ler('LEIA-ME.txt')).toContain('estática')
  expect(JSON.stringify(p.cena)).toBe(antes)
  expect(p.arquivos.size).toBe(0)
  const pasta = mkdtempSync(join(tmpdir(), 'sz-raylib-fonte-'))
  try {
    for (const [path, bytes] of r.arquivos) {
      const destino = join(pasta, path)
      mkdirSync(dirname(destino), { recursive: true })
      writeFileSync(destino, bytes)
    }
    // compile() lê os arquivos de verdade sem executar o código de jogo nem criar pyc.
    const python = spawnSync(
      'python',
      [
        '-I',
        '-B',
        '-c',
        'import pathlib,sys; [compile(p.read_bytes(), str(p), "exec") for p in pathlib.Path(sys.argv[1]).glob("*.py")]',
        pasta,
      ],
      { encoding: 'utf8' },
    )
    expect(python.stderr).toBe('')
    expect(python.status).toBe(0)
    expect(readFileSync(join(pasta, 'main.py'), 'utf8')).toContain(r.modulo)
  } finally {
    if (resolve(pasta).startsWith(`${resolve(tmpdir())}${sep}sz-raylib-fonte-`))
      rmSync(pasta, { recursive: true, force: true })
  }
})

test('Raylib baixa ZIP íntegro, mede saída e cancela sem alterar a revisão de origem', async () => {
  const p = pacote(),
    c = new AbortController(),
    progresso: number[] = [],
    r = await exportarPacoteRaylib(p, c.signal, { progresso: (n) => progresso.push(n) }),
    zip = await readZipFiles(new File([r.blob], 'cenario.zip'), {
      maxBytes: 1024 * 1024,
      maxEntries: 16,
    })
  expect(zip.ok).toBe(true)
  if (!zip.ok) throw Error('ZIP recusado')
  expect(zip.files.some((f) => f.path === 'cenario.py')).toBe(true)
  expect(r.medidas.malhas).toBe(0)
  expect(progresso.at(-1)).toBe(zip.files.length)
  const cancelar = new AbortController()
  await expect(
    exportarPacoteRaylib(p, cancelar.signal, { progresso: () => cancelar.abort() }),
  ).rejects.toThrow()
  expect(p.cena.fonte.revisao).toBe(12)
})
