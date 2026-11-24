/**
 * Prova de `trazer_modelos` e `exportar_cenario` com o Chrome local (sem tela), no host em memória
 * (sem servidor): traz modelos do computador para uma biblioteca pelo mesmo código da oficina,
 * monta uma ilha com eles e exporta nos três destinos. Guarda os pacotes em
 * output/cenarios-reforma/agente-trazer-exportar.
 *
 *   bun packages/molda-cenarios-agente/scripts/verificar-trazer-exportar.ts <modelo ou pasta>...
 *
 * Sem argumentos, traz três itens do Arquipélago que já estão no repositório.
 */
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { criarHostEmMemoria } from '@sistemazero/molda-cenarios/oficina/host-memoria'
import { capturarSemJanela } from '../src/oficina/captura'
import { criarIntencoes } from '../src/oficina/intencoes'
import { exportarCenario, trazerModelos } from '../src/oficina/trazer-e-exportar'

const raiz = resolve(import.meta.dirname, '../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/agente-trazer-exportar')
rmSync(saida, { recursive: true, force: true })
mkdirSync(saida, { recursive: true })
const caminhos = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['abobora', 'acai', 'alface'].map((n) =>
      resolve(raiz, `packages/arquipelago/src/assets/itens/${n}.glb`),
    )

const host = criarHostEmMemoria({ equipe: true })
const biblioteca = await host.criarBiblioteca('conta', { nome: 'Trazidos', licenca: 'propria' })
let inicio = performance.now()
const trazidos = await trazerModelos(host, biblioteca.id, caminhos)
console.log(
  JSON.stringify({ etapa: 'trazer', ms: Math.round(performance.now() - inicio), ...trazidos }),
)
if (!trazidos.trazidos.length) throw Error('Nenhum modelo foi trazido.')
const [primeiro] = trazidos.trazidos,
  [doHost] = (await host.listarModelos(biblioteca.id, {})).itens
if (!primeiro || !doHost?.miniatura) throw Error('O modelo trazido ficou sem retrato.')

const mundo = await host.criarMundo('conta', 'Ilha trazida')
await host.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
const cenario = await host.criarCenario(mundo.id, 'Ilha')
const a = criarIntencoes(host)
await a.gerarTerreno(cenario.id, { tipo: 'ilha', altura: 14, semente: 5 })
await a.encherAgua(cenario.id, { nome: 'Mar', intencao: { tipo: 'mar', nivel: 0 } })
await a.espalhar(cenario.id, {
  modelos: trazidos.trazidos.map((m) => ({
    bibliotecaId: biblioteca.id,
    modeloId: m.id,
    digest: m.digest,
  })),
  centro: { x: 0, z: 0 },
  raio: 30,
  densidade: 2,
  afastamento: 2,
  limite: 40,
  semente: 9,
})
const foto = await capturarSemJanela(host, cenario.id, { vista: 'livre', largura: 960 })
await Bun.write(resolve(saida, 'ilha-com-trazidos.webp'), foto.imagem)

for (const destino of ['three', 'glb', 'raylib'] as const) {
  inicio = performance.now()
  const r = await exportarCenario(host, cenario.id, {
    destino,
    juntar: destino !== 'three',
    tamanhoDaRegiao: 128,
    saida,
  })
  const cabeca = new TextDecoder().decode(readFileSync(r.arquivo).subarray(0, 4))
  const esperado = destino === 'glb' ? 'glTF' : 'PK\u0003\u0004'
  console.log(
    JSON.stringify({
      etapa: 'exportar',
      destino,
      ms: Math.round(performance.now() - inicio),
      arquivo: r.arquivo,
      bytes: r.bytes,
      medidas: r.medidas,
      avisos: r.avisos,
    }),
  )
  if (cabeca !== esperado) throw Error(`O pacote ${destino} não começa como ${esperado}.`)
}
console.log('PASS: trazer e exportar sem janela')
