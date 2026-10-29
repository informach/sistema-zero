/**
 * Os jogos do Poder "O baú dos símbolos" (Faísca): o Farol 2D e a Ilha 3D já concluídos, com três
 * pedras de símbolos (o sol, a lua e a estrela), a placa da ordem e o baú das Moedas. A equipe
 * prepara as artes, as posições, a placa e o reinício; a criança constrói, uma etapa por parte, a
 * variável `passo` (começa em 0), o sol que começa a sequência, a lua que pergunta se é a vez dela
 * (se `passo` = 1) e a estrela que abre o baú (se `passo` = 2). Um símbolo fora da vez recomeça a
 * tentativa: `passo` volta a 0 e os acesos apagam.
 *
 * As três pedras ficam na ordem da placa, da esquerda para a direita, no gramado de baixo (2D) e no
 * gramado da frente (3D), com o baú no fim: a sequência inteira se faz em poucos passos, e cada
 * objetivo cabe no prazo do executor. As pedras não são sólidas (o personagem encosta nelas).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FAROL_ASSETS,
  type FarolAssetName,
  farolSvg,
} from '../../../packages/studio/src/arte/farol-assets'
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
import { normalizeSZIR } from '../../../packages/studio/src/ir'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { gameTwoDManifest } from '../../../packages/studio/src/official-extensions/game-2d/manifest'
import { gameThreeDManifest } from '../../../packages/studio/src/official-extensions/game-3d/manifest'
import { parseJS } from '../../../packages/studio/src/parsers/js'
import { ASSETS_FAROL, montarProjetoFarol } from './desafio-farol-projeto'
import { ILHA_ASSETS } from './ilha-do-farol-assets'
import { ilhaSource } from './ilha-do-farol-projeto'
import { MOEDAS_MODELOS, moedasModeloAsset } from './moedas-projeto'

export const SIMBOLOS_CURSO = 'jornada-faisca-poder-4'
export const SIMBOLOS_ETAPAS = ['inicio', 'sol', 'lua', 'estrela'] as const
export type SimbolosEtapa = (typeof SIMBOLOS_ETAPAS)[number]
export type SimbolosDimensao = '2d' | '3d'
/** Os símbolos, na ordem da placa. */
export const SIMBOLOS = ['sol', 'lua', 'estrela'] as const
export type Simbolo = (typeof SIMBOLOS)[number]
export const SIMBOLOS_AVISO = {
  inicio: 'Toque os símbolos na ordem da placa para abrir o baú.',
  sol: 'O sol acendeu! Agora a lua.',
  lua: 'A lua acendeu! Agora a estrela.',
  abriu: 'Na ordem certa! O baú abriu.',
  errou: 'Fora da ordem. Comece de novo pelo sol.',
} as const

const art = resolve(import.meta.dirname, '../../design/o-bau-dos-simbolos')
export const SIMBOLOS_MODELOS = JSON.parse(
  readFileSync(resolve(art, 'modelos.json'), 'utf8'),
) as Record<
  'pedra-sol' | 'pedra-lua' | 'pedra-estrela' | 'placa-da-ordem',
  { sha: string; size: number; center: [number, number, number]; clips: string[] }
>

// ── 2D ───────────────────────────────────────────────────────────────────────
/** As áreas de contato, em frações da imagem: o corpo da pedra (sem o pé de espuma). */
const PEDRA = { x: 5 / 48, y: 10 / 48, w: 38 / 48, h: 34 / 48 }
const HITBOX_2D: Partial<Record<FarolAssetName, { x: number; y: number; w: number; h: number }>> = {
  'pedra-sol': PEDRA,
  'pedra-sol-acesa': PEDRA,
  'pedra-lua': PEDRA,
  'pedra-lua-acesa': PEDRA,
  'pedra-estrela': PEDRA,
  'pedra-estrela-acesa': PEDRA,
  'bau-fechado': { x: 7 / 64, y: 14 / 64, w: 50 / 64, h: 44 / 64 },
  'bau-aberto': { x: 7 / 64, y: 14 / 64, w: 50 / 64, h: 44 / 64 },
}
function imagem(name: FarolAssetName): ProjectAsset {
  const { width, height } = FAROL_ASSETS[name]
  const hitbox = HITBOX_2D[name]
  return {
    id: `simbolos-${name}`,
    name,
    kind: 'image',
    source: 'library',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(farolSvg(name)).toString('base64')}`,
    width,
    height,
    ...(hitbox
      ? {
          sprite: {
            frameW: width,
            frameH: height,
            animations: [{ name: 'parado', from: 0, to: 0, fps: 1, loop: false }],
            hitbox,
          },
        }
      : {}),
  }
}
export const SIMBOLOS_ASSETS_2D: ProjectAsset[] = [
  ...ASSETS_FAROL,
  ...SIMBOLOS.flatMap((s) => [imagem(`pedra-${s}`), imagem(`pedra-${s}-acesa`)]),
  imagem('placa-da-ordem'),
  imagem('bau-fechado'),
  imagem('bau-aberto'),
]
/**
 * As pedras no gramado de baixo, numa fileira na ordem da placa (48 × 48). Entre duas pedras cabe
 * o corpo do personagem (30 px) com folga: o robô do executor passa de uma a outra sem encostar na
 * do meio, e a criança também.
 */
export const PEDRAS_2D: Record<Simbolo, { x: number; y: number; w: number; h: number }> = {
  sol: { x: 20, y: 250, w: 48, h: 48 },
  lua: { x: 100, y: 250, w: 48, h: 48 },
  estrela: { x: 180, y: 250, w: 48, h: 48 },
}
/** A placa da ordem embaixo da lua, no meio da fileira: a ordem fica à vista. */
export const PLACA_2D = { x: 92, y: 304, w: 64, h: 48 } as const
/** O baú no fim da fileira, na areia (só a estrela o abre: ninguém precisa encostar nele). */
export const BAU_2D = { x: 262, y: 254, w: 48, h: 48 } as const

const str = (value: string): JSExpr => ({ type: 'str', value })
const num = (value: number): JSExpr => ({ type: 'num', value })
const aviso = (value: string): JSStatement => ({ type: 'assign', name: 'aviso', value: str(value) })
const passoVale = (value: number): JSStatement => ({
  type: 'assign',
  name: 'passo',
  value: num(value),
})
const imagemDe = (spriteVar: string, image: FarolAssetName): JSStatement => ({
  type: 'g2d:setImage',
  spriteVar,
  image,
})
/** O senão de cada pedra: a tentativa recomeça (o passo volta a 0 e os acesos apagam). */
const recomeca2d = (): JSStatement[] => [
  passoVale(0),
  imagemDe('sol', 'pedra-sol'),
  imagemDe('lua', 'pedra-lua'),
  aviso(SIMBOLOS_AVISO.errou),
]
const vezDe = (n: number): JSExpr => ({
  type: 'binop',
  op: '===',
  left: { type: 'var', name: 'passo' },
  right: num(n),
})
const encontro2d = (com: Simbolo, body: JSStatement[]): JSStatement => ({
  type: 'g2d:onOverlap',
  aVar: 'personagem',
  bVar: com,
  body,
})

function ir2d(etapa: SimbolosEtapa): SZIRV2 {
  const n = SIMBOLOS_ETAPAS.indexOf(etapa)
  const ir = structuredClone(montarProjetoFarol('concluido').ir) as SZIRV2
  for (const s of ir.behavior.start)
    if (s.type === 'var' && s.name === 'aviso') s.value = str(SIMBOLOS_AVISO.inicio)
  ir.behavior.start.push(
    { type: 'g2d:createImageSprite', varName: 'placa', ...PLACA_2D, image: 'placa-da-ordem' },
    ...SIMBOLOS.map(
      (s): JSStatement => ({
        type: 'g2d:createImageSprite',
        varName: s,
        ...PEDRAS_2D[s],
        image: `pedra-${s}`,
      }),
    ),
    { type: 'g2d:createImageSprite', varName: 'bau', ...BAU_2D, image: 'bau-fechado' },
    ...(n >= 1 ? [{ type: 'var' as const, name: 'passo', value: num(0) }] : []),
  )
  // A Chave do Farol não tinha nova partida; aqui ela é parte do jogo (a tentativa recomeça).
  ir.behavior.events.push(...parseJS('SZGame2D.onKey("r",()=>{SZGame2D.restart();});'))
  if (n >= 1)
    ir.behavior.events.push(
      encontro2d('sol', [
        passoVale(1),
        imagemDe('sol', 'pedra-sol-acesa'),
        aviso(SIMBOLOS_AVISO.sol),
      ]),
    )
  if (n >= 2)
    ir.behavior.events.push(
      encontro2d('lua', [
        {
          type: 'if',
          cond: vezDe(1),
          then: [passoVale(2), imagemDe('lua', 'pedra-lua-acesa'), aviso(SIMBOLOS_AVISO.lua)],
          else: recomeca2d(),
        },
      ]),
    )
  if (n >= 3)
    ir.behavior.events.push(
      encontro2d('estrela', [
        {
          type: 'if',
          cond: vezDe(2),
          then: [
            imagemDe('estrela', 'pedra-estrela-acesa'),
            imagemDe('bau', 'bau-aberto'),
            aviso(SIMBOLOS_AVISO.abriu),
          ],
          else: recomeca2d(),
        },
      ]),
    )
  for (const loop of ir.behavior.loops) {
    if (loop.type !== 'g2d:updateEachFrame') continue
    const i = loop.body.findIndex(
      (s) => s.type === 'g2d:drawSprite' && s.spriteVar === 'personagem',
    )
    loop.body.splice(
      i,
      0,
      ...['placa', ...SIMBOLOS, 'bau'].map(
        (spriteVar): JSStatement => ({ type: 'g2d:drawSprite', spriteVar, ctxVar: 'ctx' }),
      ),
    )
    loop.body.push({
      type: 'g2d:drawLabel',
      ctxVar: 'ctx',
      text: str('Setas: andar. R: recomeçar.'),
      x: 300,
      y: 350,
      color: '#ffffff',
      size: 13,
      align: 'left',
    })
  }
  return normalizeSZIR(ir) as SZIRV2
}

// ── 3D ───────────────────────────────────────────────────────────────────────
/** O asset de biblioteca de um modelo dos símbolos (a referência; o Estúdio carrega o arquivo). */
export function simbolosModeloAsset(name: keyof typeof SIMBOLOS_MODELOS): ProjectAsset {
  const m = SIMBOLOS_MODELOS[name]
  return {
    id: `simbolos-modelo-${name}`,
    name,
    kind: 'model3d',
    source: 'library',
    libId: COURSE_MODEL_LIB_PREFIX + m.sha,
    dataUrl: courseModelStub(m.sha, m.clips),
    originalFileName: `${name}.glb`,
  }
}
export const SIMBOLOS_ASSETS_3D: ProjectAsset[] = [
  ...ILHA_ASSETS,
  simbolosModeloAsset('placa-da-ordem'),
  ...SIMBOLOS.map((s) => simbolosModeloAsset(`pedra-${s}`)),
  moedasModeloAsset('bau-do-tesouro'),
]
/** O chão da Ilha no gramado da frente (medido no cenário do Blender). */
const CHAO = 0.05
/**
 * As pedras no gramado da frente, na ordem da placa da esquerda para a direita, de frente para a
 * câmera (x e z do centro no chão). A lua fica um passo mais para a frente: do sol à estrela o
 * caminho passa reto atrás dela, sem encostar (numa fileira reta, a volta em torno da lua raspava
 * nela, e o robô do executor também). O vão entre as colunas deixa folga para a caixa REAL do
 * personagem, que cresce quando ele vira e balança os braços andando: com o sol a 1,8 da lua, o
 * robô indo à lua pela frente raspava no sol. A fileira fica perto do começo e a lua só um
 * passo à frente: as idas do robô cabem nos prazos do executor com folga.
 */
export const PEDRAS_3D: Record<Simbolo, readonly [number, number]> = {
  sol: [-6.4, 2.5],
  lua: [-4.2, 3.6],
  estrela: [-2, 2.5],
}
/** A placa da ordem à esquerda da fileira, como uma legenda lida antes das pedras. */
export const PLACA_3D = [-7.9, 2.6] as const
/** O baú no fim da fileira, à direita da estrela. */
export const BAU_3D = [-0.6, 2.5] as const

const em = (name: keyof typeof SIMBOLOS_MODELOS, [x, z]: readonly [number, number]) => {
  const c = SIMBOLOS_MODELOS[name].center
  return [+(x + c[0]).toFixed(3), +(CHAO + c[1]).toFixed(3), +(z + c[2]).toFixed(3)].join(',')
}

function source3d(etapa: SimbolosEtapa): string {
  const n = SIMBOLOS_ETAPAS.indexOf(etapa)
  const m = SIMBOLOS_MODELOS,
    bau = MOEDAS_MODELOS['bau-do-tesouro']
  let s = ilhaSource('personalizar').replace(
    '"Encontre a chave e leve o personagem até o farol."',
    JSON.stringify(SIMBOLOS_AVISO.inicio),
  )
  const preparo = `
const placa=SZGame3D.createModelFile(cena,"placa-da-ordem",${m['placa-da-ordem'].size});
SZGame3D.setPosition(placa,${em('placa-da-ordem', PLACA_3D)});
${SIMBOLOS.map(
  (
    simbolo,
  ) => `const ${simbolo}=SZGame3D.createModelFile(cena,"pedra-${simbolo}",${m[`pedra-${simbolo}`].size});
SZGame3D.setPosition(${simbolo},${em(`pedra-${simbolo}`, PEDRAS_3D[simbolo])});`,
).join('\n')}
const bau=SZGame3D.createModelFile(cena,"bau-do-tesouro",${bau.size});
SZGame3D.setPosition(bau,${BAU_3D[0]},${+(CHAO + bau.center[1]).toFixed(2)},${BAU_3D[1]});
${n >= 1 ? 'let passo=0;' : ''}`
  s = s.replace(
    'SZGame3D.walkArea(personagem,-11,1,-5,5);',
    `${preparo.trim()}\nSZGame3D.walkArea(personagem,-11,1,-5,5);`,
  )
  const recomeca = `passo=0;SZGame3D.playAnimation(sol,"apagar","uma-vez");SZGame3D.playAnimation(lua,"apagar","uma-vez");aviso=${JSON.stringify(SIMBOLOS_AVISO.errou)};`
  const regras = [
    n >= 1
      ? `SZGame3D.onTouch(personagem,sol,()=>{passo=1;SZGame3D.playAnimation(sol,"acender","uma-vez");aviso=${JSON.stringify(SIMBOLOS_AVISO.sol)};});`
      : '',
    n >= 2
      ? `SZGame3D.onTouch(personagem,lua,()=>{if(passo===1){passo=2;SZGame3D.playAnimation(lua,"acender","uma-vez");aviso=${JSON.stringify(SIMBOLOS_AVISO.lua)};}else{${recomeca}}});`
      : '',
    n >= 3
      ? `SZGame3D.onTouch(personagem,estrela,()=>{if(passo===2){SZGame3D.playAnimation(estrela,"acender","uma-vez");SZGame3D.playAnimation(bau,"abrir","uma-vez");aviso=${JSON.stringify(SIMBOLOS_AVISO.abriu)};}else{${recomeca}}});`
      : '',
  ].join('\n')
  return s.replace('SZGame3D.animate(cena,()=>{', `${regras}\nSZGame3D.animate(cena,()=>{`)
}

export function montarProjetoSimbolos(
  dimensao: SimbolosDimensao,
  etapa: SimbolosEtapa = 'inicio',
): Project {
  const ir =
      dimensao === '2d'
        ? ir2d(etapa)
        : normalizeSZIR({
            html: [],
            css: [],
            js: parseJS(source3d(etapa)),
            extensions: [{ extensionId: 'game-3d' }],
          }),
    name = `O baú dos símbolos — ${dimensao.toUpperCase()}`
  return {
    ...createEmptyProject(`manifest-simbolos-${dimensao}`, name),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: dimensao === '2d' ? SIMBOLOS_ASSETS_2D : SIMBOLOS_ASSETS_3D,
    installedExtensions: [
      {
        id: `game-${dimensao}`,
        version: dimensao === '3d' ? gameThreeDManifest.version : gameTwoDManifest.version,
        installedAt: 0,
      },
    ],
  }
}
