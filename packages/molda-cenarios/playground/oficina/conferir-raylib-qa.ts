import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type CenaCompilada,
  criarFonteDeAlturasCompilada,
} from '@sistemazero/molda-cenarios-core/compilar'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/compilar'

const pasta = resolve(import.meta.dir, '../../../../output/cenarios-reforma/lote8-raylib'),
  pacote = resolve(pasta, 'pacote/extraido'),
  cena = JSON.parse(readFileSync(resolve(pacote, 'cenario.json'), 'utf8')) as CenaCompilada,
  arquivos = new Map(
    cena.arquivos.map((a) => [a.caminho, new Uint8Array(readFileSync(resolve(pacote, a.caminho)))]),
  ),
  conferido = await conferirConteudoCompilado(cena, arquivos),
  fonte = criarFonteDeAlturasCompilada(
    cena.terreno!,
    conferido.terreno!.alturas,
    conferido.terreno!.buracos,
  ),
  native = JSON.parse(readFileSync(resolve(pasta, 'native.json'), 'utf8')),
  studio = JSON.parse(readFileSync(resolve(pasta, 'studio-cpython.json'), 'utf8'))
let maiorErroDeAltura = 0,
  maiorErroDeAnimacao = 0
for (const r of [native, studio]) {
  assert.deepEqual(r.fonte, cena.fonte)
  assert.equal(r.descarteIdempotente, true)
  assert.equal(r.nos, cena.nos.length)
  assert.equal(r.alturas.length, 441)
  assert.equal(r.ciclos.length, 3)
  assert.ok(r.ciclos.every((c: { texturasDoCenario: number[] }) => c.texturasDoCenario.length > 0))
  for (const q of r.alturas) {
    const tem = fonte.temChao!({ x: q.x, z: q.z })
    assert.equal(q.chao, tem)
    if (!tem) assert.equal(q.altura, null)
    else {
      const erro = Math.abs(q.altura - fonte(q.x, q.z))
      maiorErroDeAltura = Math.max(maiorErroDeAltura, erro)
      assert.ok(erro < 1e-6, `Altura divergente em ${q.x},${q.z}: ${erro}`)
    }
  }
}
assert.equal(studio.studioTexturasDepoisDoDescarte, 0)
const log = readFileSync(resolve(pasta, 'native.log'), 'utf8'),
  contagens = (r: RegExp) => {
    const m = new Map<number, number>()
    for (const c of log.matchAll(r)) m.set(Number(c[1]), (m.get(Number(c[1])) ?? 0) + 1)
    return m
  },
  carregadas = contagens(/TEXTURE: \[ID (\d+)\] Texture loaded successfully/g),
  liberadas = contagens(/TEXTURE: \[ID (\d+)\] Unloaded texture data/g)
for (const ciclo of native.ciclos)
  for (const id of ciclo.texturasDoCenario)
    assert.equal(
      liberadas.get(id),
      carregadas.get(id),
      `Textura nativa ${id} retida ou liberada mais de uma vez`,
    )
assert.equal(studio.animacoes.length, native.animacoes.length)
for (const [i, n] of native.animacoes.entries()) {
  const s = studio.animacoes[i]
  assert.equal(s.no, n.no)
  assert.deepEqual(s.clipes, n.clipes)
  assert.equal(n.clipes.length, 4)
  assert.equal(s.ossos, n.ossos)
  for (let j = 0; j < n.matrizes.length; j++)
    for (let k = 0; k < 16; k++) {
      const erro = Math.abs(n.matrizes[j][k] - s.matrizes[j][k])
      maiorErroDeAnimacao = Math.max(maiorErroDeAnimacao, erro)
      assert.ok(erro < 1e-4, `Animação divergente em ${j}/${k}: ${erro}`)
    }
}
const resultado = {
  fonte: cena.fonte,
  consultasPorRuntime: 441,
  maiorErroDeAltura,
  maiorErroDeAnimacao,
  nos: native.nos,
  modelosCompartilhados: native.recursosVisuaisCompartilhados,
  clipes: native.animacoes.map((a: { no: string; clipes: string[]; ossos: number }) => ({
    no: a.no,
    clipes: a.clipes,
    ossos: a.ossos,
  })),
  aguaEstatica: true,
  ciclos: 3,
  texturasNativasLiberadas: native.ciclos.reduce(
    (n: number, c: { texturasDoCenario: number[] }) => n + c.texturasDoCenario.length,
    0,
  ),
  studioTexturasDepoisDoDescarte: studio.studioTexturasDepoisDoDescarte,
  descarteIdempotente: true,
  renderNative: 'Janela oculta no Windows, Raylib 6.0.1.0',
  studioCpython:
    'Módulo real de transporte/desenho/GLB do Estúdio em CPython; não é prova de execução Pyodide/WebGL no navegador.',
}
writeFileSync(resolve(pasta, 'comparacao.json'), JSON.stringify(resultado, null, 2))
console.log(JSON.stringify(resultado, null, 2))
