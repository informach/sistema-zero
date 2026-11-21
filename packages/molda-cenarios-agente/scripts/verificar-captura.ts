/**
 * Prova da captura sem janela: uma ilha com lago no host em memória (sem servidor), fotografada
 * pelo Chromium local com o palco do motor. Salva as imagens em output/cenarios-reforma/lote9.
 *
 *   bun packages/molda-cenarios-agente/scripts/verificar-captura.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { criarHostEmMemoria } from '@sistemazero/molda-cenarios/oficina/host-memoria'
import { capturarSemJanela } from '../src/oficina/captura'
import { criarIntencoes } from '../src/oficina/intencoes'

const saida = resolve(import.meta.dirname, '../../../output/cenarios-reforma/lote9')
mkdirSync(saida, { recursive: true })

const host = criarHostEmMemoria({ equipe: true })
const mundo = await host.criarMundo('conta', 'Ilha da captura')
const cenario = await host.criarCenario(mundo.id, 'Ilha')
const a = criarIntencoes(host)
await a.gerarTerreno(cenario.id, { tipo: 'ilha', altura: 18, semente: 3 })
const bacia = { x: -14, z: -10 }
await a.esculpirTerreno(cenario.id, {
  parametros: { ferramenta: 'abaixar', raio: 8, forca: 1, metros: 5 },
  pontos: [bacia],
})
const [fundo] = await a.consultarPontos(cenario.id, [bacia])
await a.encherAgua(cenario.id, {
  nome: 'Lago',
  intencao: { tipo: 'lago', ponto: bacia, nivel: fundo!.altura! + 1.5 },
})
await a.encherAgua(cenario.id, { nome: 'Mar', intencao: { tipo: 'mar', nivel: 0 } })

const inicio = performance.now()
for (const vista of ['livre', 'cima'] as const) {
  const r = await capturarSemJanela(host, cenario.id, { vista, largura: 960 })
  const arquivo = resolve(saida, `captura-sem-janela-${vista}.webp`)
  writeFileSync(arquivo, r.imagem)
  console.log(JSON.stringify({ vista, bytes: r.imagem.byteLength, revisao: r.revisao, arquivo }))
  if (r.imagem.byteLength < 2000) throw Error('A imagem saiu pequena demais: provavelmente vazia.')
}
console.log(`PASS: captura sem janela em ${Math.round(performance.now() - inicio)} ms`)
