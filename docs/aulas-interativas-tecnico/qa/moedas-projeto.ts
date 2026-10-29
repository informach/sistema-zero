/**
 * Os jogos do Poder "Moedas no caminho" (Faísca): o Farol 2D e a Ilha 3D já concluídos, com seis
 * moedas num grupo e um baú. A equipe prepara as moedas, o baú, o desenho e o giro; a criança
 * constrói, uma etapa por parte, o contador (`moedas` = 0), a coleta (some + soma 1), o número na
 * tela e o baú (se `moedas` ≥ 5, abre; senão, avisa).
 *
 * Cinco moedas ficam na TRILHA (a linha reta do começo até o farol) e uma fora dela: o caminho do
 * farol junta cinco, e a sexta é para quem explora. No 3D isso também é o que deixa o executor
 * conferir a coleta: as cópias de um grupo não têm nome, então o robô as recolhe indo ao farol.
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

export const MOEDAS_CURSO = 'jornada-faisca-poder-1'
export const MOEDAS_ETAPAS = ['inicio', 'contador', 'coleta', 'placar', 'bau'] as const
export type MoedasEtapa = (typeof MOEDAS_ETAPAS)[number]
export type MoedasDimensao = '2d' | '3d'
/** A meta do baú: "pelo menos" este número. */
export const MOEDAS_META = 5
export const MOEDAS_AVISO = {
  inicio: 'Junte moedas para o baú. Leve a chave ao farol.',
  abriu: 'O baú abriu! Você juntou moedas suficientes.',
  falta: 'O baú pede pelo menos 5 moedas.',
} as const

const art = resolve(import.meta.dirname, '../../design/moedas-no-caminho')
export const MOEDAS_MODELOS = JSON.parse(
  readFileSync(resolve(art, 'modelos.json'), 'utf8'),
) as Record<
  'moeda-de-ouro' | 'bau-do-tesouro',
  { sha: string; size: number; center: [number, number, number]; clips: string[] }
>

// ── 2D ───────────────────────────────────────────────────────────────────────
/** As áreas de contato, em frações da imagem (como as do Farol). */
const HITBOX_2D: Partial<Record<FarolAssetName, { x: number; y: number; w: number; h: number }>> = {
  moeda: { x: 3 / 32, y: 3 / 32, w: 26 / 32, h: 28 / 32 },
  'bau-fechado': { x: 7 / 64, y: 14 / 64, w: 50 / 64, h: 44 / 64 },
  'bau-aberto': { x: 7 / 64, y: 14 / 64, w: 50 / 64, h: 44 / 64 },
}
function imagem(name: FarolAssetName): ProjectAsset {
  const { width, height } = FAROL_ASSETS[name]
  const hitbox = HITBOX_2D[name]
  return {
    id: `moedas-${name}`,
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
export const MOEDAS_ASSETS_2D: ProjectAsset[] = [
  ...ASSETS_FAROL,
  imagem('moeda'),
  imagem('bau-fechado'),
  imagem('bau-aberto'),
]
/**
 * As moedas 2D (canto de cima, 24 × 24): as cinco primeiras na linha do personagem até a porta do
 * farol (o centro do corpo dele fica em y 178), a sexta no gramado de cima, perto do coqueiro.
 */
export const MOEDAS_2D = [
  { x: 95, y: 166 },
  { x: 150, y: 166 },
  { x: 205, y: 166 },
  { x: 260, y: 166 },
  { x: 332, y: 166 },
  { x: 100, y: 62 },
] as const
/**
 * O baú escondido no gramado de baixo, debaixo do começo: o caminho até ele não passa perto de
 * moeda nenhuma (o robô do executor desvia com folga de poucos pixels; aqui ele nem precisa).
 */
export const BAU_2D = { x: 28, y: 270, w: 48, h: 48 } as const

const num = (value: number): JSExpr => ({ type: 'num', value })
const str = (value: string): JSExpr => ({ type: 'str', value })
const aviso = (value: string): JSStatement => ({ type: 'assign', name: 'aviso', value: str(value) })

function ir2d(etapa: MoedasEtapa): SZIRV2 {
  const n = MOEDAS_ETAPAS.indexOf(etapa)
  const ir = structuredClone(montarProjetoFarol('concluido').ir) as SZIRV2
  for (const s of ir.behavior.start)
    if (s.type === 'var' && s.name === 'aviso') s.value = str(MOEDAS_AVISO.inicio)
  ir.behavior.start.push(
    { type: 'g2d:createGroup', varName: 'moedasDoCaminho' },
    ...MOEDAS_2D.map(
      (m, i): JSStatement => ({
        type: 'g2d:spawnImageInGroup',
        groupVar: 'moedasDoCaminho',
        varName: `moeda${i + 1}`,
        x: num(m.x),
        y: num(m.y),
        w: 24,
        h: 24,
        image: 'moeda',
        vx: num(0),
        vy: num(0),
      }),
    ),
    { type: 'g2d:createImageSprite', varName: 'bau', ...BAU_2D, image: 'bau-fechado' },
    {
      type: 'g2d:createImageSprite',
      varName: 'iconeMoeda',
      x: 10,
      y: 42,
      w: 22,
      h: 22,
      image: 'moeda',
    },
    ...(n >= 1 ? [{ type: 'var' as const, name: 'moedas', value: num(0) }] : []),
  )
  // A Chave do Farol não tinha nova partida; aqui ela é parte do jogo (o contador zera).
  ir.behavior.events.push(...parseJS('SZGame2D.onKey("r",()=>{SZGame2D.restart();});'))
  if (n >= 2)
    ir.behavior.events.push({
      type: 'g2d:onTouchGroup',
      spriteVar: 'personagem',
      groupVar: 'moedasDoCaminho',
      itemName: 'moeda',
      body: [
        { type: 'g2d:removeFromGroup', groupVar: 'moedasDoCaminho', spriteVar: 'moeda' },
        {
          type: 'assign',
          name: 'moedas',
          value: { type: 'binop', op: '+', left: { type: 'var', name: 'moedas' }, right: num(1) },
        },
      ],
    })
  if (n >= 4)
    ir.behavior.events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'bau',
      body: [
        {
          type: 'if',
          cond: {
            type: 'binop',
            op: '>=',
            left: { type: 'var', name: 'moedas' },
            right: num(MOEDAS_META),
          },
          then: [
            { type: 'g2d:setImage', spriteVar: 'bau', image: 'bau-aberto' },
            aviso(MOEDAS_AVISO.abriu),
          ],
          else: [aviso(MOEDAS_AVISO.falta)],
        },
      ],
    })
  for (const loop of ir.behavior.loops) {
    if (loop.type !== 'g2d:updateEachFrame') continue
    const i = loop.body.findIndex(
      (s) => s.type === 'g2d:drawSprite' && s.spriteVar === 'personagem',
    )
    loop.body.splice(
      i,
      0,
      { type: 'g2d:drawGroup', groupVar: 'moedasDoCaminho', ctxVar: 'ctx' },
      { type: 'g2d:drawSprite', spriteVar: 'bau', ctxVar: 'ctx' },
    )
    loop.body.push(
      { type: 'g2d:drawSprite', spriteVar: 'iconeMoeda', ctxVar: 'ctx' },
      {
        type: 'g2d:drawLabel',
        ctxVar: 'ctx',
        text: str('Setas: andar. R: recomeçar.'),
        x: 12,
        y: 350,
        color: '#ffffff',
        size: 13,
        align: 'left',
      },
    )
    if (n >= 3)
      loop.body.push({
        type: 'g2d:drawScore',
        ctxVar: 'ctx',
        label: 'Moedas:',
        value: { type: 'var', name: 'moedas' },
        x: 38,
        y: 60,
        color: '#ffffff',
        size: 20,
      })
  }
  return normalizeSZIR(ir) as SZIRV2
}

// ── 3D ───────────────────────────────────────────────────────────────────────
/** O asset de biblioteca de um modelo das Moedas (a referência; o Estúdio carrega o arquivo). */
export function moedasModeloAsset(name: keyof typeof MOEDAS_MODELOS): ProjectAsset {
  const m = MOEDAS_MODELOS[name]
  return {
    id: `moedas-modelo-${name}`,
    name,
    kind: 'model3d',
    source: 'library',
    libId: COURSE_MODEL_LIB_PREFIX + m.sha,
    dataUrl: courseModelStub(m.sha, m.clips),
    originalFileName: `${name}.glb`,
  }
}
export const MOEDAS_ASSETS_3D: ProjectAsset[] = [
  ...ILHA_ASSETS,
  moedasModeloAsset('moeda-de-ouro'),
  moedasModeloAsset('bau-do-tesouro'),
]
/**
 * A linha do personagem até a ponte e a ponte (z 0,75): as cinco da trilha; a sexta atrás.
 * As moedas 3D ficam paradas, de frente para a câmera: girar cada cópia de um grupo pede o
 * "Para cada objeto do grupo", que não é do iniciante.
 */
export const MOEDAS_3D = [
  [-4.4, 0.75],
  [-2.2, 0.75],
  [1.0, 0.75],
  [2.1, 0.75],
  [3.2, 0.75],
  [-8.6, -3.2],
] as const
/** O baú atrás do começo, na mesma linha: ir ao baú direto não passa por moeda nenhuma. */
export const BAU_3D = [-9.6, 0.75] as const

function source3d(etapa: MoedasEtapa): string {
  const n = MOEDAS_ETAPAS.indexOf(etapa)
  const moeda = MOEDAS_MODELOS['moeda-de-ouro'],
    bau = MOEDAS_MODELOS['bau-do-tesouro']
  const yMoeda = +moeda.center[1].toFixed(2)
  let s = ilhaSource('personalizar').replace(
    '"Encontre a chave e leve o personagem até o farol."',
    JSON.stringify(MOEDAS_AVISO.inicio),
  )
  const preparo = `
const moedaMolde=SZGame3D.createModelFile(cena,"moeda-de-ouro",${moeda.size});
SZGame3D.setPosition(moedaMolde,0,-20,0);
const moedasDoCaminho=SZGame3D.createGroup();
${MOEDAS_3D.map(([x, z]) => `SZGame3D.spawnCopy(moedasDoCaminho,moedaMolde,${x},${yMoeda},${z});`).join('\n')}
const bau=SZGame3D.createModelFile(cena,"bau-do-tesouro",${bau.size});
SZGame3D.setPosition(bau,${BAU_3D[0]},${+bau.center[1].toFixed(2)},${BAU_3D[1]});
${n >= 1 ? 'let moedas=0;' : ''}`
  s = s.replace(
    'SZGame3D.walkArea(personagem,-11,1,-5,5);',
    `${preparo.trim()}\nSZGame3D.walkArea(personagem,-11,1,-5,5);`,
  )
  const regras = [
    n >= 2
      ? 'SZGame3D.onTouchGroup(personagem,moedasDoCaminho,(moeda)=>{SZGame3D.remove(cena,moeda);moedas=moedas+1;});'
      : '',
    n >= 4
      ? `SZGame3D.onTouch(personagem,bau,()=>{if(moedas>=${MOEDAS_META}){SZGame3D.playAnimation(bau,"abrir","uma-vez");aviso=${JSON.stringify(MOEDAS_AVISO.abriu)};}else{aviso=${JSON.stringify(MOEDAS_AVISO.falta)};}});`
      : '',
  ].join('\n')
  s = s.replace(
    'SZGame3D.animate(cena,()=>{',
    `${regras}\nSZGame3D.animate(cena,()=>{${n >= 3 ? '\n  SZGame3D.hudText("top-left",moedas);' : ''}`,
  )
  return s
}

export function montarProjetoMoedas(
  dimensao: MoedasDimensao,
  etapa: MoedasEtapa = 'inicio',
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
    name = `Moedas no caminho — ${dimensao.toUpperCase()}`
  return {
    ...createEmptyProject(`manifest-moedas-${dimensao}`, name),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: dimensao === '2d' ? MOEDAS_ASSETS_2D : MOEDAS_ASSETS_3D,
    installedExtensions: [
      {
        id: `game-${dimensao}`,
        version: dimensao === '3d' ? gameThreeDManifest.version : gameTwoDManifest.version,
        installedAt: 0,
      },
    ],
  }
}
