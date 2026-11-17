/**
 * Matriz de compatibilidade dos cursos protegidos: Cadê Todo Mundo? e A Chave do Farol.
 *
 * Os dois cursos foram gravados com o Estúdio Clássico e os blocos do Jogo 2D. A criança que
 * assiste à aula precisa achar o mesmo bloco, com o mesmo texto e os mesmos valores, no mesmo
 * caminho da paleta. Este módulo tira um RETRATO do que o Estúdio oferece hoje a cada aula
 * (blocos, paleta, projetos) a partir das fontes de verdade (manifestos, roteiros, catálogo) e o
 * compara com o retrato guardado em `matriz-compatibilidade.json`.
 *
 * Mudou o retrato? O teste reprova e mostra a diferença. Se a mudança for intencional E não
 * alterar o que foi ensinado, regrave com `bun matriz-compatibilidade.ts --gravar` e explique no
 * commit. Mudança no texto, nos campos, nos padrões ou no caminho de um bloco ensinado NÃO é
 * regravável: a regra do Estúdio é criar um bloco novo ao lado.
 *
 * O que este retrato NÃO vê: os vídeos e o PDF de passo a passo. Ele afirma o que está nos
 * roteiros e nos manifestos versionados.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '../../../packages/core/src/learning'
import { SERVER_BLOCK_CATALOG } from '../../../packages/studio/src/blockly/blockCatalog'
import { materializeBlockDefinition } from '../../../packages/studio/src/blockly/blockContracts'
import { CORE_BLOCKS } from '../../../packages/studio/src/blockly/blocks'
import type { BlockDefinition } from '../../../packages/studio/src/blockly/blocks/types'
import { buildCoreToolbox } from '../../../packages/studio/src/blockly/toolbox'
import { projectBlockTypes } from '../../../packages/studio/src/core/projectDocumentGuards'
import {
  gameTwoDBlocks,
  gameTwoDToolboxCategory,
} from '../../../packages/studio/src/official-extensions/game-2d/blocks'
import { sanitizeImportedBlocksState } from '../../../packages/studio/src/state/projectValidation'

const FAISCA = resolve(import.meta.dir, '../../aulas-interativas/faisca')
export const ARQUIVO_DA_MATRIZ = resolve(import.meta.dir, 'matriz-compatibilidade.json')
export const ARQUIVO_LEGIVEL = resolve(import.meta.dir, 'matriz-compatibilidade.md')

export interface CursoProtegido {
  id: string
  nome: string
  pasta: string
  /** Prefixo dos arquivos de aula (`<prefixo>-<aula>.manifesto.json`). */
  prefixo: string
  aulas: readonly string[]
}

export const CURSOS_PROTEGIDOS: readonly CursoProtegido[] = [
  {
    id: 'cade-todo-mundo',
    nome: 'Cadê Todo Mundo?',
    pasta: 'cade-todo-mundo',
    prefixo: 'cade-todo-mundo',
    aulas: ['aula-1', 'aula-2'],
  },
  {
    id: 'desafio-primeiro-jogo',
    nome: 'Desafio do Primeiro Jogo: A Chave do Farol',
    pasta: 'desafio-primeiro-jogo',
    prefixo: 'desafio',
    aulas: ['dia-1', 'dia-2', 'dia-3'],
  },
]

const ler = (caminho: string) => readFileSync(caminho, 'utf8')
const sha = (texto: string) => createHash('sha256').update(texto).digest('hex').slice(0, 16)

export function manifestoDe(curso: CursoProtegido, aula: string): LearningManifest {
  const valor = JSON.parse(
    ler(resolve(FAISCA, curso.pasta, `${curso.prefixo}-${aula}.manifesto.json`)),
  )
  if (!isLearningManifest(valor)) throw new Error(`Manifesto inválido: ${curso.id}/${aula}`)
  return valor
}

export function blocosDoCurso(curso: CursoProtegido): string[] {
  return (JSON.parse(ler(resolve(FAISCA, curso.pasta, 'blocos.json'))) as { blocks: string[] })
    .blocks
}

/** Todos os tipos de bloco que algum dos dois cursos usa. */
export function tiposEnsinados(): string[] {
  return [...new Set(CURSOS_PROTEGIDOS.flatMap(blocosDoCurso))].sort()
}

const DEFINICOES = new Map<string, BlockDefinition>(
  [...CORE_BLOCKS, ...(gameTwoDBlocks as unknown as BlockDefinition[])].map((d) => [d.type, d]),
)
const CATALOGO = new Map(SERVER_BLOCK_CATALOG.map((entrada) => [entrada.type, entrada]))

type Json = null | boolean | number | string | Json[] | { [chave: string]: Json }

/** Tira funções e `undefined` e ordena as chaves: o retrato é comparado como texto. */
function canonico(valor: unknown): Json {
  if (valor === null || typeof valor === 'boolean' || typeof valor === 'string') return valor
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : String(valor)
  if (Array.isArray(valor)) return valor.map(canonico)
  if (typeof valor === 'object') {
    const saida: { [chave: string]: Json } = {}
    for (const chave of Object.keys(valor as object).sort()) {
      const item = (valor as Record<string, unknown>)[chave]
      if (item === undefined || typeof item === 'function') continue
      saida[chave] = canonico(item)
    }
    return saida
  }
  return null
}

/**
 * O retrato de um bloco: tudo o que a criança vê e tudo o que os projetos salvos e as
 * verificações das aulas leem dele.
 */
export function retratoDoBloco(tipo: string): Json {
  const bruta = DEFINICOES.get(tipo)
  if (!bruta) throw new Error(`Bloco ensinado sem definição no Estúdio: ${tipo}`)
  const definicao = materializeBlockDefinition(bruta) as unknown as Record<string, unknown>
  const catalogo = CATALOGO.get(tipo)
  const mensagens: Record<string, unknown> = {}
  const argumentos: Record<string, unknown> = {}
  for (let i = 0; i <= 9; i += 1) {
    if (definicao[`message${i}`] !== undefined) mensagens[`message${i}`] = definicao[`message${i}`]
    if (definicao[`args${i}`] !== undefined) argumentos[`args${i}`] = definicao[`args${i}`]
  }
  return canonico({
    ...mensagens,
    ...argumentos,
    cor: definicao.colour,
    anterior: definicao.previousStatement,
    seguinte: definicao.nextStatement,
    saida: definicao.output,
    emLinha: definicao.inputsInline,
    mutador: definicao.mutator,
    extensoes: definicao.extensions,
    dica: definicao.tooltip,
    oculto: bruta.hidden === true ? true : undefined,
    caminhoNaPaleta: catalogo?.palettePath ?? null,
    nivel: catalogo?.level ?? null,
    area: catalogo?.area ?? null,
    encaixe: catalogo?.placement ?? null,
  })
}

interface BlocoDeEstudio {
  chave: string
  conteudo: Extract<NonNullable<LearningManifest['blocks'][number]['content']>, { kind: 'studio' }>
}

export function estudiosDaAula(manifesto: LearningManifest): BlocoDeEstudio[] {
  return manifesto.blocks.flatMap((bloco) =>
    bloco.content?.kind === 'studio' ? [{ chave: bloco.key, conteudo: bloco.content }] : [],
  )
}

interface NoDaPaleta {
  kind?: string
  name?: string
  type?: string
  colour?: string
  contents?: NoDaPaleta[]
  [chave: string]: unknown
}

/**
 * A paleta que a aula mostra, como o `BlocklyPanel` a monta: nível e lista da aula, mais a
 * categoria "Blocos deste jogo" a partir dos blocos que já estão no projeto.
 */
export function paletaDaAula(
  conteudo: BlocoDeEstudio['conteudo'],
  blocksState: unknown,
): NoDaPaleta[] {
  const paleta = buildCoreToolbox([gameTwoDToolboxCategory], {
    level: conteudo.level ?? 'iniciante-2d',
    allowBlocks: conteudo.allowBlocks,
    allowCategories: conteudo.allowCategories,
    currentBlockTypes: projectBlockTypes(blocksState),
  } as Parameters<typeof buildCoreToolbox>[1])
  return paleta.contents as unknown as NoDaPaleta[]
}

/** A árvore de categorias, com a cor de cada uma e os blocos na ordem em que aparecem. */
export function arvoreDaPaleta(nos: readonly NoDaPaleta[]): Json {
  return nos.flatMap((no): Json[] => {
    if (no.kind === 'category') {
      return [
        canonico({
          categoria: no.name ?? '',
          cor: no.colour,
          conteudo: arvoreDaPaleta(no.contents ?? []),
        }),
      ]
    }
    if (no.kind === 'block' && no.type) {
      // O bloco como sai da paleta: campos e valores que ele traz encaixados (os padrões).
      const { kind: _kind, type, ...preset } = no
      return [canonico(Object.keys(preset).length ? { bloco: type, ...preset } : { bloco: type })]
    }
    return [canonico({ outro: no.kind ?? '?' })]
  })
}

/** O caminho de categorias até a primeira vez em que o bloco aparece na paleta da aula. */
export function caminhosNaPaleta(nos: readonly NoDaPaleta[]): Map<string, string[][]> {
  const caminhos = new Map<string, string[][]>()
  const andar = (lista: readonly NoDaPaleta[], trilha: string[]) => {
    for (const no of lista) {
      if (no.kind === 'category') andar(no.contents ?? [], [...trilha, no.name ?? ''])
      else if (no.kind === 'block' && no.type)
        caminhos.set(no.type, [...(caminhos.get(no.type) ?? []), trilha])
    }
  }
  andar(nos, [])
  return caminhos
}

/** Os gestos entre colchetes do "Na tela" de cada clipe do roteiro, na ordem. */
export function gestosDoRoteiro(curso: CursoProtegido, aula: string): Record<string, string[]> {
  const texto = ler(resolve(FAISCA, curso.pasta, `${curso.prefixo}-${aula}.roteiro.md`))
  const saida: Record<string, string[]> = {}
  let clipe: string | null = null
  for (const linha of texto.split('\n')) {
    const marca = /^\*\*Clipe:\*\*\s*`([^`]+)`/.exec(linha)
    if (marca) {
      clipe = marca[1] ?? null
      continue
    }
    if (clipe && linha.startsWith('**Na tela:**')) {
      const gestos = [...linha.matchAll(/\[([^\]]+)\]/g)]
        .map((m) => (m[1] ?? '').trim())
        // O que a EDIÇÃO faz por cima do vídeo não é gesto da criança no Estúdio.
        .filter((gesto) => gesto && !gesto.startsWith('na edição'))
      if (gestos.length) saida[clipe] = gestos
      clipe = null
    }
  }
  return saida
}

/**
 * O que cada verificação de "Verificar projeto" lê do projeto ou do jogo rodando. É a lista do
 * que não pode mudar de nome no Estúdio sem a aula deixar de aprovar quem fez certo:
 * tipo de bloco, chaves de campo, nomes de entrada e área (verificação de montagem) e os
 * valores observados no jogo, como `esconderijo2.opacity` (verificação de comportamento).
 */
function leiturasDasVerificacoes(valor: unknown, saida = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) for (const item of valor) leiturasDasVerificacoes(item, saida)
  else if (valor && typeof valor === 'object') {
    const registro = valor as Record<string, unknown>
    if (typeof registro.blockType === 'string') {
      const campos = Object.keys((registro.fields as object | undefined) ?? {}).sort()
      const entradas = Object.keys((registro.inputBlocks as object | undefined) ?? {}).sort()
      const area = typeof registro.area === 'string' ? ` em ${registro.area}` : ''
      saida.add(
        `bloco ${registro.blockType}${area}${campos.length ? ` campos {${campos.join(', ')}}` : ''}${entradas.length ? ` entradas {${entradas.join(', ')}}` : ''}`,
      )
      if (typeof registro.beforeBlock === 'string') saida.add(`bloco ${registro.beforeBlock}`)
    }
    if (typeof registro.path === 'string' && typeof registro.kind === 'string')
      saida.add(
        `jogo ${registro.kind} ${registro.path}${typeof registro.groupPath === 'string' ? ` do grupo ${registro.groupPath}` : ''}`,
      )
    if (typeof registro.action === 'string') saida.add(`gesto ${registro.action}`)
    for (const item of Object.values(registro)) leiturasDasVerificacoes(item, saida)
  }
  return saida
}

export interface ProjetoDaAula {
  curso: string
  origem: string
  projeto: {
    blocksState?: unknown
    installedExtensions?: { id: string; version?: string }[]
    [chave: string]: unknown
  }
}

/** Todo projeto que os cursos carregam: o inicial de cada aula e o jogo final. */
export function projetosDosCursos(): ProjetoDaAula[] {
  return CURSOS_PROTEGIDOS.flatMap((curso) => [
    ...curso.aulas.flatMap((aula) =>
      estudiosDaAula(manifestoDe(curso, aula)).map((estudio) => ({
        curso: curso.id,
        origem: `${aula}/${estudio.chave}/inicial`,
        projeto: estudio.conteudo.initialProject as ProjetoDaAula['projeto'],
      })),
    ),
    {
      curso: curso.id,
      origem: 'projeto-final',
      projeto: JSON.parse(
        ler(resolve(FAISCA, curso.pasta, 'projeto-final.szproject.json')),
      ) as ProjetoDaAula['projeto'],
    },
  ])
}

function contarTipos(blocksState: unknown): Record<string, number> {
  const contagem: Record<string, number> = {}
  const andar = (valor: unknown) => {
    if (Array.isArray(valor)) valor.forEach(andar)
    else if (valor && typeof valor === 'object') {
      const registro = valor as Record<string, unknown>
      if (typeof registro.type === 'string' && registro.type.startsWith('sz_'))
        contagem[registro.type] = (contagem[registro.type] ?? 0) + 1
      Object.values(registro).forEach(andar)
    }
  }
  andar(blocksState)
  return Object.fromEntries(Object.entries(contagem).sort())
}

export function montarMatriz(): Json {
  const blocos: Record<string, Json> = {}
  for (const tipo of tiposEnsinados()) blocos[tipo] = retratoDoBloco(tipo)

  const cursos = CURSOS_PROTEGIDOS.map((curso) => ({
    id: curso.id,
    nome: curso.nome,
    blocos: blocosDoCurso(curso),
    aulas: curso.aulas.map((aula) => {
      const manifesto = manifestoDe(curso, aula)
      const gestos = gestosDoRoteiro(curso, aula)
      const estudios = estudiosDaAula(manifesto)
      return {
        aula,
        estudios: estudios.map(({ chave, conteudo }) => {
          const inicial = conteudo.initialProject as ProjetoDaAula['projeto']
          const paleta = paletaDaAula(conteudo, inicial.blocksState)
          return {
            chave,
            nivel: conteudo.level ?? null,
            modos: conteudo.allowedModes ?? null,
            revelarNiveis: conteudo.allowLevelReveal ?? null,
            // A ordem das categorias de cima é o que a criança vê ao abrir a paleta.
            categorias: paleta.filter((no) => no.kind === 'category').map((no) => no.name ?? ''),
            paleta: arvoreDaPaleta(paleta),
          }
        }),
        partes: manifesto.sections.map((secao) => {
          const clipes = secao.blockKeys.filter((chave) => gestos[chave])
          return {
            parte: secao.key,
            titulo: secao.title ?? null,
            usaEstudio: secao.blockKeys.some((chave) => estudios.some((e) => e.chave === chave)),
            gestos: Object.fromEntries(clipes.map((chave) => [chave, gestos[chave] ?? []])),
            verificacoes: (secao.completion?.projectChecks ?? []).map((verificacao) => ({
              id: (verificacao as { id?: string }).id ?? null,
              rotulo: (verificacao as { label?: string }).label ?? null,
              tipo: (verificacao as { rule?: { type?: string } }).rule?.type ?? null,
              le: [...leiturasDasVerificacoes(verificacao)].sort(),
            })),
          }
        }),
      }
    }),
  }))

  const projetos = projetosDosCursos().map(({ curso, origem, projeto }) => {
    const extensoes = (projeto.installedExtensions ?? []).map((e) => `${e.id}@${e.version ?? '?'}`)
    // O mesmo portão por onde um projeto importado passa: tipo desconhecido derruba TODOS os blocos.
    const saneado = sanitizeImportedBlocksState(
      projeto.blocksState,
      (projeto.installedExtensions ?? []) as Parameters<typeof sanitizeImportedBlocksState>[1],
    )
    return {
      curso,
      origem,
      extensoes,
      sobreviveAoSaneamento: saneado !== null,
      saneamentoNaoMudaNada:
        saneado !== null && JSON.stringify(saneado) === JSON.stringify(projeto.blocksState),
      blocos: contarTipos(projeto.blocksState),
      impressaoDosBlocos: sha(JSON.stringify(projeto.blocksState ?? null)),
    }
  })

  return canonico({
    aviso:
      'Retrato gerado. Não edite à mão: rode `bun docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.ts --gravar`.',
    blocos,
    cursos,
    projetos,
  })
}

function textoLegivel(matriz: Json): string {
  const m = matriz as {
    blocos: Record<string, { message0?: string; caminhoNaPaleta: string[] | null; cor?: string }>
    cursos: {
      nome: string
      aulas: {
        aula: string
        estudios: { chave: string; categorias: string[] }[]
        partes: {
          parte: string
          titulo: string | null
          usaEstudio: boolean
          gestos: Record<string, string[]>
          verificacoes: { rotulo: string | null; tipo: string | null; le: string[] }[]
        }[]
      }[]
    }[]
  }
  const linhas: string[] = [
    '# Matriz de compatibilidade dos cursos protegidos',
    '',
    'Gerada por `matriz-compatibilidade.ts` a partir dos manifestos, dos roteiros e do catálogo de blocos do Estúdio. O retrato completo (campos, opções, padrões, paleta inteira de cada aula) está em `matriz-compatibilidade.json`.',
    '',
    'Limite: este documento afirma o que está nos roteiros e nos manifestos versionados. Os vídeos gravados e o PDF de passo a passo não são conferidos por máquina.',
    '',
    '## Blocos ensinados',
    '',
    '| Tipo | Texto do bloco | Caminho na paleta | Cor |',
    '|---|---|---|---|',
  ]
  for (const [tipo, bloco] of Object.entries(m.blocos))
    linhas.push(
      `| \`${tipo}\` | ${(bloco.message0 ?? '').replaceAll('|', '\\|')} | ${(bloco.caminhoNaPaleta ?? []).join(' → ') || '(área do projeto)'} | ${bloco.cor ?? ''} |`,
    )
  for (const curso of m.cursos) {
    linhas.push('', `## ${curso.nome}`)
    for (const aula of curso.aulas) {
      linhas.push('', `### ${aula.aula}`, '')
      for (const estudio of aula.estudios)
        linhas.push(
          `Paleta do Estúdio (\`${estudio.chave}\`): ${estudio.categorias.join(' · ')}`,
          '',
        )
      linhas.push(
        '| Parte | Gestos do roteiro (na ordem) | O que "Verificar projeto" lê |',
        '|---|---|---|',
      )
      for (const parte of aula.partes.filter((p) => p.usaEstudio || Object.keys(p.gestos).length)) {
        const gestos = Object.values(parte.gestos).flat()
        const le = parte.verificacoes.map(
          (v) => `${v.rotulo ?? v.tipo ?? ''}${v.le.length ? `: ${v.le.join('; ')}` : ''}`,
        )
        linhas.push(
          `| ${parte.titulo ?? parte.parte} | ${gestos.map((g) => `\`${g.replaceAll('|', '\\|')}\``).join('<br>') || 'sem gesto marcado'} | ${le.join('<br>').replaceAll('|', '\\|') || 'sem verificação'} |`,
        )
      }
    }
  }
  return `${linhas.join('\n')}\n`
}

export const textoDaMatriz = (matriz: Json) => `${JSON.stringify(matriz, null, 2)}\n`
export { textoLegivel }

if (import.meta.main) {
  const matriz = montarMatriz()
  if (process.argv.includes('--gravar')) {
    writeFileSync(ARQUIVO_DA_MATRIZ, textoDaMatriz(matriz))
    writeFileSync(ARQUIVO_LEGIVEL, textoLegivel(matriz))
    console.log('Matriz gravada.')
  } else {
    const igual = ler(ARQUIVO_DA_MATRIZ) === textoDaMatriz(matriz)
    console.log(igual ? 'Matriz em dia.' : 'A matriz mudou. Veja o teste para a diferença.')
    process.exit(igual ? 0 : 1)
  }
}
