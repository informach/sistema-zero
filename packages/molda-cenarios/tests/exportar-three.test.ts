import { expect, test } from 'bun:test'
import { readZipFiles } from '@sistemazero/molda/arquivos'
import { lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  RUNTIME_THREE_DEPENDENCIAS,
  RUNTIME_THREE_DIGEST,
  RUNTIME_THREE_FONTE,
} from '../src/exportar/runtime-three.generated'
import {
  arquivosDoPacoteThree,
  exportarPacoteThree,
  LIMITES_DO_PACOTE_THREE,
} from '../src/exportar/three'

const pacote = () => ({
  cena: lerCenaCompilada({
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: '</script><script>globalThis.indevido=true</script>',
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

test('distribuição usa JSON para nomes autorais e inclui runtime autocontido, exemplo e licenças', async () => {
  const p = pacote(),
    original = JSON.stringify(p.cena),
    r = await arquivosDoPacoteThree(p, new AbortController().signal),
    ler = (p: string) => new TextDecoder().decode(r.get(p)!)
  expect([...r.keys()].sort()).toEqual(
    [
      'LEIA-ME.txt',
      'carregar-cenario.js',
      'cenario.json',
      'explorar.css',
      'explorar.js',
      'index.html',
      'licencas-modelos.txt',
      'licencas-runtime.txt',
    ].sort(),
  )
  expect(JSON.parse(ler('cenario.json')).fonte.revisao).toBe(12)
  expect(JSON.parse(ler('cenario.json')).nome).toBe(p.cena.nome)
  expect(ler('index.html')).not.toContain(p.cena.nome)
  expect(ler('explorar.js')).not.toContain(p.cena.nome)
  expect(ler('explorar.js')).toContain('textContent=exploracao.nome')
  expect(ler('carregar-cenario.js')).toBe(RUNTIME_THREE_FONTE)
  expect(await digestDosBytes(r.get('carregar-cenario.js')!)).toBe(RUNTIME_THREE_DIGEST)
  const scan = new Bun.Transpiler({ loader: 'js' }).scan(ler('carregar-cenario.js'))
  expect(scan.imports).toHaveLength(0)
  expect(scan.exports.sort()).toEqual(
    [
      'carregarCenaDoEndereco',
      'carregarCenaNoThree',
      'iniciarExploracaoDoCenario',
      'lerPacoteDoEndereco',
    ].sort(),
  )
  expect(RUNTIME_THREE_DEPENDENCIAS.map((d) => d.nome)).toEqual(['three', 'three-mesh-bvh', 'zod'])
  expect(ler('licencas-runtime.txt')).toContain('Permission is hereby granted')
  expect(ler('LEIA-ME.txt')).toContain('python -m http.server')
  expect(JSON.stringify(p.cena)).toBe(original)
  expect(p.arquivos.size).toBe(0)
})

test('ZIP reabre pelo leitor existente, conserva bytes e cancela sem entregar resultado parcial', async () => {
  const p = pacote(),
    progresso: number[] = [],
    controller = new AbortController(),
    blob = await exportarPacoteThree(p, controller.signal, (n) => progresso.push(n)),
    lido = await readZipFiles(new File([blob], 'cenario.zip'), {
      maxBytes: LIMITES_DO_PACOTE_THREE.bytes,
      maxEntries: LIMITES_DO_PACOTE_THREE.arquivos,
    })
  expect(lido.ok).toBe(true)
  if (lido.ok) {
    expect(lido.files).toHaveLength(8)
    const arquivo = lido.files.find((f) => f.path === 'carregar-cenario.js')!
    expect(await digestDosBytes(arquivo.bytes)).toBe(RUNTIME_THREE_DIGEST)
  }
  expect(progresso.at(-1)).toBe(8)
  const c = new AbortController()
  await expect(
    exportarPacoteThree(p, c.signal, (n) => {
      if (n === 1) c.abort()
    }),
  ).rejects.toThrow(/cancelada/)
  expect(p.cena.fonte.revisao).toBe(12)
  controller.abort()
  await expect(exportarPacoteThree(p, controller.signal)).rejects.toThrow()
})
