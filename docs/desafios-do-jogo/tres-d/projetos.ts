/** Autoria de documentos. Não é runtime, currículo, nem parte importada pelo jogo. */
import { readFileSync } from 'node:fs'
import type { IlhaId } from '../../../packages/arquipelago-contracts/src/ilhas'
import {
  EXECUTION_LIMITS,
  type ExecutionExpectation,
  type ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  COURSE_MODEL_LIB_PREFIX,
  courseModelStub,
} from '../../../packages/studio/src/core/courseModels'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { ilhaModelo } from '../../aulas-interativas-tecnico/qa/ilha-do-farol-assets'

/**
 * Os desafios 3D das ilhas (lacunas, 01/11/2026; a proposta: um desafio 3D por posto, como desafio
 * do dia). Os blocos 3D da trilha são os da Ilha do Farol (o 3D do Faísca), então cada desafio
 * aplica a aventura de chave e porta no tema da ilha: o personagem do curso anda pela ilha, pega o
 * item ao encostar (o item some e a informação fica guardada) e leva ao morador, que só recebe com o
 * item; sem ele, o morador pede. O extra é a tecla R recomeçar. O personagem vem da biblioteca de
 * modelos dos cursos; o morador e o item são os do jogo; o chão é um disco na cor da ilha
 * (`arte/chaos.py`). Só os blocos `sz_g3d_*` da trilha, mais os de informação e decisão do Faísca.
 */
export interface DesafioTresD {
  ilha: IlhaId
  slug: string
  titulo: string
  /** `artigo` é "o" ou "a", para os critérios ("encostar no Nico", "na Capi"). */
  /** `asset` é o nome do modelo no projeto (o do arquivo do jogo). */
  morador: {
    nome: string
    artigo: 'o' | 'a'
    asset: string
    arquivo: string
    tamanho: number
    y: number
  }
  item: { nome: string; artigo: 'o' | 'a'; asset: string; arquivo: string; tamanho: number }
  cor: string
  textos: { pedido: string; aviso: string; pegou: string; entregue: string; pede: string }
}

export const DESAFIOS_3D: readonly DesafioTresD[] = [
  {
    ilha: 'sua-ilha',
    slug: 'a-concha-do-nico',
    titulo: 'A concha do Nico',
    morador: {
      nome: 'Nico',
      artigo: 'o',
      asset: 'nico',
      arquivo: 'personagens/nico.glb',
      tamanho: 2,
      y: 0.72,
    },
    item: {
      nome: 'concha',
      artigo: 'a',
      asset: 'concha-vieira',
      arquivo: 'itens/concha-vieira.glb',
      tamanho: 0.8,
    },
    cor: '#bfe6f2',
    textos: {
      pedido: 'O Nico perdeu a concha mais bonita da praia. Ache a concha e leve até ele.',
      aviso: 'Ache a concha e leve até o Nico.',
      pegou: 'Você pegou a concha. Agora leve até o Nico.',
      entregue: 'O Nico ficou feliz com a concha.',
      pede: 'O Nico pede a concha. Ela está na areia.',
    },
  },
  {
    ilha: 'bosque',
    slug: 'o-coelhinho-da-capi',
    titulo: 'O coelhinho da Capi',
    morador: {
      nome: 'Capi',
      artigo: 'a',
      asset: 'capi',
      arquivo: 'personagens/capi.glb',
      tamanho: 1.6,
      y: 0.8,
    },
    item: {
      nome: 'coelhinho',
      artigo: 'o',
      asset: 'coelho-filhote',
      arquivo: 'bichos/coelho-filhote.glb',
      tamanho: 0.9,
    },
    cor: '#cfe8c4',
    textos: {
      pedido: 'Um coelhinho fugiu do cercado da Capi. Ache o coelhinho e leve de volta para ela.',
      aviso: 'Ache o coelhinho e leve até a Capi.',
      pegou: 'Você achou o coelhinho. Agora leve até a Capi.',
      entregue: 'A Capi ficou feliz com o coelhinho de volta.',
      pede: 'A Capi pede o coelhinho. Ele está escondido no bosque.',
    },
  },
  {
    ilha: 'vila-doce',
    slug: 'o-bolo-do-bento',
    titulo: 'O bolo do Bento',
    morador: {
      nome: 'Bento',
      artigo: 'o',
      asset: 'bento',
      arquivo: 'personagens/bento.glb',
      tamanho: 1.8,
      y: 0.8,
    },
    item: {
      nome: 'bolo',
      artigo: 'o',
      asset: 'bolo-de-fuba',
      arquivo: 'itens/bolo-de-fuba.glb',
      tamanho: 0.9,
    },
    cor: '#f7e7d4',
    textos: {
      pedido: 'Um bolo saiu da fornada e rolou pela praça. Ache o bolo e leve de volta ao Bento.',
      aviso: 'Ache o bolo e leve até o Bento.',
      pegou: 'Você pegou o bolo. Agora leve até o Bento.',
      entregue: 'O Bento ficou feliz com o bolo.',
      pede: 'O Bento pede o bolo. Ele está na praça.',
    },
  },
  {
    ilha: 'recife',
    slug: 'a-estrela-da-mare',
    titulo: 'A estrela da Maré',
    morador: {
      nome: 'Maré',
      artigo: 'a',
      asset: 'mare',
      arquivo: 'personagens/mare.glb',
      tamanho: 1.8,
      y: 0.8,
    },
    item: {
      nome: 'estrela',
      artigo: 'a',
      asset: 'estrela-do-mar',
      arquivo: 'itens/estrela-do-mar.glb',
      tamanho: 0.8,
    },
    cor: '#c6eff3',
    textos: {
      pedido:
        'A maré levou uma estrela-do-mar para longe da lagoa. Ache a estrela e leve até a Maré.',
      aviso: 'Ache a estrela-do-mar e leve até a Maré.',
      pegou: 'Você pegou a estrela. Agora leve até a Maré.',
      entregue: 'A Maré ficou feliz com a estrela.',
      pede: 'A Maré pede a estrela-do-mar. Ela está na areia.',
    },
  },
  {
    ilha: 'pico',
    slug: 'o-cristal-do-floco',
    titulo: 'O cristal do Floco',
    morador: {
      nome: 'Floco',
      artigo: 'o',
      asset: 'floco',
      arquivo: 'personagens/floco.glb',
      tamanho: 1.8,
      y: 0.8,
    },
    item: {
      nome: 'cristal',
      artigo: 'o',
      asset: 'cristal-verde',
      arquivo: 'itens/cristal-verde.glb',
      tamanho: 0.8,
    },
    cor: '#dcebf7',
    textos: {
      pedido: 'O Floco deixou cair um cristal na neve. Ache o cristal e leve até ele.',
      aviso: 'Ache o cristal e leve até o Floco.',
      pegou: 'Você pegou o cristal. Agora leve até o Floco.',
      entregue: 'O Floco ficou feliz com o cristal.',
      pede: 'O Floco pede o cristal. Ele está na neve.',
    },
  },
  {
    ilha: 'vale-dos-dinos',
    slug: 'o-ovo-da-jade',
    titulo: 'O ovo da Jade',
    morador: {
      nome: 'Jade',
      artigo: 'a',
      asset: 'jade',
      arquivo: 'personagens/jade.glb',
      tamanho: 1.8,
      y: 0.8,
    },
    item: { nome: 'ovo', artigo: 'o', asset: 'ovo', arquivo: 'itens/ovo.glb', tamanho: 0.8 },
    cor: '#e3eccf',
    textos: {
      pedido: 'Um ovo rolou para fora do ninho. Ache o ovo e leve de volta para a Jade.',
      aviso: 'Ache o ovo e leve até a Jade.',
      pegou: 'Você pegou o ovo. Agora leve até a Jade.',
      entregue: 'A Jade ficou feliz com o ovo de volta.',
      pede: 'A Jade pede o ovo. Ele rolou pelo vale.',
    },
  },
  {
    ilha: 'nuvens',
    slug: 'a-semente-da-irie',
    titulo: 'A semente da Iriê',
    morador: {
      nome: 'Iriê',
      artigo: 'a',
      asset: 'irie',
      arquivo: 'personagens/irie.glb',
      tamanho: 1.8,
      y: 0.8,
    },
    item: {
      nome: 'semente',
      artigo: 'a',
      asset: 'semente-flor-de-nuvem',
      arquivo: 'itens/semente-flor-de-nuvem.glb',
      tamanho: 0.8,
    },
    cor: '#efe8ff',
    textos: {
      pedido: 'O vento levou uma semente de flor de nuvem. Ache a semente e leve até a Iriê.',
      aviso: 'Ache a semente e leve até a Iriê.',
      pegou: 'Você pegou a semente. Agora leve até a Iriê.',
      entregue: 'A Iriê ficou feliz com a semente.',
      pede: 'A Iriê pede a semente. Ela caiu no jardim.',
    },
  },
]

/** O lugar de cada peça: o personagem à esquerda, o item afastado do caminho, o morador à direita. */
export const LUGARES = {
  personagem: { x: -4, y: 0.8, z: 0 },
  item: { x: -1.5, z: -1.5 },
  morador: { x: 3, z: 0.5 },
  /** A área de andar (um retângulo dentro do chão). */
  area: { minX: -8, maxX: 8, minZ: -4.5, maxZ: 4.5 },
} as const

const num = (value: number): JSExpr => ({ type: 'num', value })
const str = (value: string): JSExpr => ({ type: 'str', value })
const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const modelo = (varName: string, asset: string, size: number): JSStatement => ({
  type: 'g3d:createModelFile',
  varName,
  worldVar: 'cena',
  asset,
  size: num(size),
})
const posicao = (objVar: string, x: number, y: number, z: number): JSStatement => ({
  type: 'g3d:setPosition',
  objVar,
  x: num(x),
  y: num(y),
  z: num(z),
})

/** Os modelos publicados na biblioteca dos cursos (`publicar-modelos.ts` grava este arquivo). */
function modeloDaBiblioteca(name: string): ProjectAsset {
  const modelos = JSON.parse(
    readFileSync(new URL('./modelos.json', import.meta.url), 'utf8'),
  ) as Record<string, { sha: string; clips: string[] }>
  const m = modelos[name]
  if (!m) throw new Error(`Modelo ausente da biblioteca: ${name}. Rode publicar-modelos.ts.`)
  return {
    id: `tres-d-${name}`,
    name,
    kind: 'model3d',
    source: 'library',
    libId: COURSE_MODEL_LIB_PREFIX + m.sha,
    dataUrl: courseModelStub(m.sha, m.clips),
    originalFileName: `${name}.glb`,
  }
}
/** O personagem da criança: o aventureiro da biblioteca de modelos dos cursos (só a referência). */
const personagemDoCurso = (): ProjectAsset => ilhaModelo('aventureiro').asset

function fonte(d: DesafioTresD, pronto: boolean): SZIRV2 {
  const t = d.textos
  const { personagem, item, morador, area } = LUGARES
  return {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d' }],
    behavior: {
      start: [
        { type: 'g3d:createFullscreenScene', varName: 'cena', bg: d.cor },
        {
          type: 'g3d:frameScene',
          worldVar: 'cena',
          width: num(18),
          height: num(5),
          depth: num(10),
        },
        modelo('chao', `chao-${d.ilha}`, 19),
        posicao('chao', 0, -0.48, 0),
        modelo('personagem', 'aventureiro', 1.66),
        posicao('personagem', personagem.x, personagem.y, personagem.z),
        modelo('item', d.item.asset, d.item.tamanho),
        posicao('item', item.x, 0.3, item.z),
        modelo('morador', d.morador.asset, d.morador.tamanho),
        posicao('morador', morador.x, d.morador.y, morador.z),
        {
          type: 'g3d:walkArea',
          objVar: 'personagem',
          minX: num(area.minX),
          maxX: num(area.maxX),
          minZ: num(area.minZ),
          maxZ: num(area.maxZ),
        },
        { type: 'g3d:walkAnimations', objVar: 'personagem', idle: 'parado', walking: 'andando' },
        { type: 'var', name: 'temItem', value: bool(false) },
        { type: 'var', name: 'entregue', value: bool(false) },
        { type: 'var', name: 'pediu', value: bool(false) },
        { type: 'var', name: 'aviso', value: str(t.aviso) },
        {
          type: 'g3d:cornerText',
          corner: 'bottom-center',
          text: str('Setas ou WASD: andar. R: recomeçar.'),
        },
      ],
      events: [
        {
          type: 'g3d:onGame',
          event: 'tecla',
          key: 'KeyR',
          body: pronto ? [{ type: 'g3d:restart' }] : [],
        },
        {
          type: 'g3d:onTouch',
          objVar: 'personagem',
          otherVar: 'item',
          body: pronto
            ? [
                { type: 'g3d:setVisible', objVar: 'item', mode: 'hide' },
                set('temItem', bool(true)),
                set('aviso', str(t.pegou)),
              ]
            : [],
        },
        {
          type: 'g3d:onTouch',
          objVar: 'personagem',
          otherVar: 'morador',
          body: pronto
            ? [
                iff({ type: 'logicalNot', value: v('entregue') }, [
                  iff(
                    v('temItem'),
                    [
                      set('entregue', bool(true)),
                      {
                        type: 'g3d:modelAnimation',
                        op: 'tocar',
                        objVar: 'morador',
                        clip: 'feliz',
                        mode: 'uma-vez',
                      },
                      set('aviso', str(t.entregue)),
                    ],
                    [set('pediu', bool(true)), set('aviso', str(t.pede))],
                  ),
                ]),
              ]
            : [],
        },
      ],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            { type: 'g3d:topDown', objVar: 'personagem', speed: num(4) },
            { type: 'g3d:cornerText', corner: 'top-center', text: v('aviso') },
          ],
        },
      ],
    },
  }
}

export function projetoTresD(d: DesafioTresD, pronto: boolean): Project {
  const ir = assignStableIdsToIR(fonte(d, pronto), `tres_d_${d.ilha.replaceAll('-', '_')}`)
  return {
    ...createEmptyProject(`tres-d-${d.slug}`, d.titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: d.titulo }),
    assets: [
      modeloDaBiblioteca(`chao-${d.ilha}`),
      personagemDoCurso(),
      modeloDaBiblioteca(d.morador.asset),
      modeloDaBiblioteca(d.item.asset),
    ],
    installedExtensions: [{ id: 'game-3d', version: '0.32.0', installedAt: 0 }],
  }
}

const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
/** O robô do executor anda pelo chão até encostar; sem o item, ele contorna o item. */
/**
 * O prazo é do robô, medido no executor sem placa de vídeo: do começo ao item (uns 2,9), do item
 * ao morador (uns 4,9) e do começo ao morador (7, o prazo máximo). A soma de um objetivo fica abaixo
 * do teto de 15 s, e a dos quatro, abaixo dos 40 s de uma parte.
 */
const PRAZO = { item: 7000, morador: 7500, direto: EXECUTION_LIMITS.maxApproachMs }
const ir = (alvo: 'item' | 'morador', timeoutMs: number, desviar?: 'item'): ExecutionStep => ({
  action: 'approachObject3d',
  actorPath: 'personagem',
  targetPath: alvo,
  walkable: [LUGARES.area],
  timeoutMs,
  ...(desviar ? { avoidPaths: [desviar] } : {}),
})
const val = (path: string, value: boolean): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
const check = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints: { afterStep: number; expect: ExecutionExpectation }[] = [],
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true } : {}),
  rule: { type: 'behavior', steps, expect, ...(checkpoints.length ? { checkpoints } : {}) },
})

export function objetivosTresD(d: DesafioTresD): SectionJavaScriptProjectCheck[] {
  const { nome, artigo } = d.morador
  const em = artigo === 'a' ? 'na' : 'no'
  return [
    check(
      'pegar',
      'Encostar no item guarda que o personagem está com ele.',
      [wait(300), ir('item', PRAZO.item)],
      val('temItem', true),
      [{ afterStep: 1, expect: val('temItem', false) }],
    ),
    check(
      'entregar',
      `Com o item, encostar ${em} ${nome} entrega.`,
      [wait(300), ir('item', PRAZO.item), ir('morador', PRAZO.morador)],
      val('entregue', true),
    ),
    check(
      'sem-item',
      `Sem o item, ${artigo} ${nome} pede e nada é entregue.`,
      [wait(300), ir('morador', PRAZO.direto, 'item')],
      val('pediu', true),
      [{ afterStep: 2, expect: val('entregue', false) }],
    ),
    check(
      'recomecar',
      'Extra: a tecla R recomeça a aventura.',
      [wait(300), ir('item', PRAZO.item), { action: 'press', key: 'r', holdMs: 80 }, wait(600)],
      val('temItem', false),
      [{ afterStep: 2, expect: val('temItem', true) }],
      true,
    ),
  ]
}
