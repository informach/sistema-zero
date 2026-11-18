/**
 * C0 da evolução do Estúdio: quanto custa CADA etapa do que o Clássico em JavaScript faz a cada
 * edição de bloco (`BlocklyPanel`, o agrupador de 120 ms), em projetos de tamanhos diferentes.
 *
 *   bun scripts/profile-js-classic.ts [--json]
 *
 * Roda num Blockly SEM TELA: mede serializar o espaço, virar texto, ler a IR, os diagnósticos e
 * gerar os três arquivos. NÃO mede desenhar os blocos, o arrasto, a Ponte nem a gravação no
 * IndexedDB: isso é do navegador (ver o registro em `docs/estudio-evolucao/`).
 *
 * O projeto de base é o jogo final de A Chave do Farol. Os tamanhos maiores repetem os eventos
 * dele dentro de "Quando acontecer" (blocos de verdade, encaixados, com ids novos), o que mantém
 * a forma de um jogo de criança: muitos eventos curtos, não um bloco gigante.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../src/blockly/blocks'
import { markLifecycleBlocksState } from '../src/blockly/blocksStateVersion'
import { buildIRFromWorkspace } from '../src/blockly/buildIR'
import { applySemanticDiagnostics } from '../src/blockly/semanticDiagnostics'
import { ensureBlocklyInitialized } from '../src/blockly/setup'
import { generateProjectFilesWithMap } from '../src/generators/project'
import { gameTwoDBlocks } from '../src/official-extensions/game-2d/blocks'

const FAROL = resolve(
  import.meta.dir,
  '../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/projeto-final.szproject.json',
)
// `SZ_PROFILE_BLOCKS=5000` mede um tamanho só (para tirar um perfil de CPU: `bun --cpu-prof`).
const ALVOS = process.env.SZ_PROFILE_BLOCKS
  ? [Number(process.env.SZ_PROFILE_BLOCKS)]
  : [0, 500, 2000, 5000, 10000]
const REPETICOES = 7

interface Bloco {
  type: string
  id?: string
  next?: { block: Bloco }
  inputs?: Record<string, { block?: Bloco; shadow?: Bloco }>
  [chave: string]: unknown
}

let contador = 0
function comIdsNovos(bloco: Bloco): Bloco {
  const copia: Bloco = { ...bloco, id: `p${(contador++).toString(36)}` }
  if (bloco.inputs)
    copia.inputs = Object.fromEntries(
      Object.entries(bloco.inputs).map(([nome, entrada]) => [
        nome,
        {
          ...(entrada.block ? { block: comIdsNovos(entrada.block) } : {}),
          ...(entrada.shadow ? { shadow: comIdsNovos(entrada.shadow) } : {}),
        },
      ]),
    )
  if (bloco.next) copia.next = { block: comIdsNovos(bloco.next.block) }
  return copia
}

/** O estado do Farol com os eventos de "Quando acontecer" repetidos até passar de `alvo` blocos. */
function estadoCom(alvo: number): { blocks: { blocks: Bloco[] } } {
  const projeto = JSON.parse(readFileSync(FAROL, 'utf8')) as {
    blocksState: { blocks: { blocks: Bloco[] } }
  }
  const estado = structuredClone(projeto.blocksState)
  const eventos = estado.blocks.blocks.find((bloco) => bloco.type === 'sz_frame_events')
  const primeiro = eventos?.inputs?.CHILDREN?.block
  if (!eventos || !primeiro) throw new Error('O projeto do Farol mudou de forma.')
  const molde = structuredClone(primeiro)
  let fim = primeiro
  while (fim.next) fim = fim.next.block
  const contar = () => JSON.stringify(estado).split('"type":"sz_').length - 1
  while (contar() < alvo) {
    const copia = comIdsNovos(molde)
    fim.next = { block: copia }
    fim = copia
    while (fim.next) fim = fim.next.block
  }
  return estado
}

const mediana = (valores: number[]) => [...valores].sort((a, b) => a - b)[valores.length >> 1] ?? 0
const ms = (valor: number) => Math.round(valor * 100) / 100

// Alguns campos dos blocos criam elementos ao nascer: o mesmo DOM de mentira dos testes.
GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
ensureBlocklyInitialized()
registerExtensionBlocks(gameTwoDBlocks)

const linhas = []
for (const alvo of ALVOS) {
  const workspace = new Blockly.Workspace()
  const t0 = performance.now()
  Blockly.serialization.workspaces.load(estadoCom(alvo), workspace)
  const carregar = performance.now() - t0
  const blocos = workspace.getAllBlocks(false).length
  const etapas: Record<string, number[]> = {
    serializar: [],
    texto: [],
    ir: [],
    diagnosticos: [],
    gerar: [],
  }
  let bytes = 0
  let linhasDeCodigo = 0
  for (let vez = 0; vez < REPETICOES; vez++) {
    let t = performance.now()
    const estado = markLifecycleBlocksState(Blockly.serialization.workspaces.save(workspace))
    etapas.serializar?.push(performance.now() - t)
    t = performance.now()
    bytes = JSON.stringify(estado).length
    etapas.texto?.push(performance.now() - t)
    t = performance.now()
    const ir = buildIRFromWorkspace(workspace)
    etapas.ir?.push(performance.now() - t)
    t = performance.now()
    applySemanticDiagnostics(workspace, ir, () => {})
    etapas.diagnosticos?.push(performance.now() - t)
    t = performance.now()
    const { files } = generateProjectFilesWithMap({ ir, projectName: 'Perfil' })
    etapas.gerar?.push(performance.now() - t)
    linhasDeCodigo = files['script.js'].split('\n').length
  }
  const medianas = Object.fromEntries(
    Object.entries(etapas).map(([nome, valores]) => [nome, ms(mediana(valores))]),
  )
  const total = Object.values(medianas).reduce((soma, valor) => soma + valor, 0)
  linhas.push({
    blocos,
    estadoKB: Math.round(bytes / 1024),
    linhasDeCodigo,
    carregarMs: ms(carregar),
    ...medianas,
    porEdicaoMs: ms(total),
    piorMs: ms(
      Math.max(
        ...Array.from({ length: REPETICOES }, (_, vez) =>
          Object.values(etapas).reduce((soma, valores) => soma + (valores[vez] ?? 0), 0),
        ),
      ),
    ),
  })
  workspace.dispose()
}
if (process.argv.includes('--json')) console.log(JSON.stringify(linhas, null, 1))
else console.table(linhas)
