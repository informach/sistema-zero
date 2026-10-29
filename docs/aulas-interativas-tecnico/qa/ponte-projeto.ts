/**
 * Os jogos do Poder "A ponte apressada" (Faísca): o Farol 2D e a Ilha 3D já concluídos, com um
 * laguinho, a pedra do sino no meio da água, a ponte levadiça e a alavanca. A equipe prepara as
 * artes, as posições, o desenho e o reinício; a criança constrói, uma etapa por parte, a variável
 * `ponteAberta` (começa falsa), a alavanca que baixa a ponte, o "depois de 4 segundos" que a sobe
 * de novo (dentro do evento da alavanca) e a travessia: se `ponteAberta`, o personagem vai à
 * pedra e o sino toca; senão, o aviso diz que a ponte está levantada.
 *
 * A ponte sai da margem da direita do laguinho até a pedra, e a alavanca fica ao lado da entrada:
 * puxar e atravessar logo dá tempo; passear antes, não. No 3D a área de andar contorna a água e
 * tem um pedaço só na pedra (a travessia é sempre pela regra da ponte); no 2D, como no mar do
 * Farol, nada segura o personagem na água, mas andar até a pedra não toca o sino.
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
import { ILHA_OBSTACULOS, recortarObstaculos } from './ilha-do-farol-observacao'
import { ilhaSource } from './ilha-do-farol-projeto'

export const PONTE_CURSO = 'jornada-faisca-poder-3'
export const PONTE_ETAPAS = ['inicio', 'alavanca', 'sobe', 'atravessar'] as const
export type PonteEtapa = (typeof PONTE_ETAPAS)[number]
export type PonteDimensao = '2d' | '3d'
/** Quantos segundos a ponte fica baixada. */
export const PONTE_SEGUNDOS = 4
export const PONTE_AVISO = {
  inicio: 'Puxe a alavanca e atravesse a ponte antes que ela suba.',
  baixou: 'A ponte baixou! Atravesse antes que ela suba.',
  subiu: 'A ponte subiu. Puxe a alavanca de novo.',
  atravessou: 'Você atravessou e tocou o sino!',
  levantada: 'A ponte está levantada. Puxe a alavanca primeiro.',
} as const

const art = resolve(import.meta.dirname, '../../design/a-ponte-apressada')
export const PONTE_MODELOS = JSON.parse(
  readFileSync(resolve(art, 'modelos.json'), 'utf8'),
) as Record<
  'ponte-levadica' | 'alavanca' | 'pedra-do-sino' | 'laguinho',
  { sha: string; size: number; center: [number, number, number]; clips: string[] }
>

// ── 2D ───────────────────────────────────────────────────────────────────────
/**
 * As áreas de contato, em frações da imagem. A da ponte é só a ENTRADA (a ponta da direita, com os
 * postes da margem), igual em pé e deitada: quem está na pedra do outro lado não encosta nela.
 */
const HITBOX_2D: Partial<Record<FarolAssetName, { x: number; y: number; w: number; h: number }>> = {
  'alavanca-cima': { x: 4 / 32, y: 4 / 32, w: 24 / 32, h: 26 / 32 },
  'alavanca-baixo': { x: 4 / 32, y: 4 / 32, w: 24 / 32, h: 26 / 32 },
  'ponte-levantada': { x: 52 / 96, y: 8 / 48, w: 44 / 96, h: 40 / 48 },
  'ponte-baixada': { x: 52 / 96, y: 8 / 48, w: 44 / 96, h: 40 / 48 },
  'pedra-do-sino': { x: 4 / 64, y: 10 / 64, w: 56 / 64, h: 50 / 64 },
  'pedra-do-sino-tocando': { x: 4 / 64, y: 10 / 64, w: 56 / 64, h: 50 / 64 },
}
function imagem(name: FarolAssetName): ProjectAsset {
  const { width, height } = FAROL_ASSETS[name]
  const hitbox = HITBOX_2D[name]
  return {
    id: `ponte-${name}`,
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
export const PONTE_ASSETS_2D: ProjectAsset[] = [
  ...ASSETS_FAROL,
  imagem('laguinho'),
  imagem('alavanca-cima'),
  imagem('alavanca-baixo'),
  imagem('ponte-levantada'),
  imagem('ponte-baixada'),
  imagem('pedra-do-sino'),
  imagem('pedra-do-sino-tocando'),
]
/** O laguinho no gramado de baixo (o barco do Farol para no canto de baixo do mar). */
export const LAGUINHO_2D = { x: 96, y: 258, w: 128, h: 80 } as const
/** A pedra do sino na água, do lado de lá da ponte. */
export const SINO_2D = { x: 108, y: 256, w: 64, h: 64 } as const
/** A ponte da margem da direita até a pedra (a entrada é a ponta da direita). */
export const PONTE_2D = { x: 128, y: 282, w: 96, h: 48 } as const
/**
 * A alavanca na areia, ao lado da entrada da ponte, com espaço para o personagem entre as duas:
 * quem puxa a alavanca não está encostando na ponte.
 */
export const ALAVANCA_2D = { x: 260, y: 292, w: 32, h: 32 } as const
/** Onde o personagem fica quando atravessa: na pedra, ao lado do sino. */
export const NA_PEDRA_2D = { x: 96, y: 240 } as const

const str = (value: string): JSExpr => ({ type: 'str', value })
const num = (value: number): JSExpr => ({ type: 'num', value })
const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const aviso = (value: string): JSStatement => ({ type: 'assign', name: 'aviso', value: str(value) })
const imagemDe = (spriteVar: string, image: FarolAssetName): JSStatement => ({
  type: 'g2d:setImage',
  spriteVar,
  image,
})

function ir2d(etapa: PonteEtapa): SZIRV2 {
  const n = PONTE_ETAPAS.indexOf(etapa)
  const ir = structuredClone(montarProjetoFarol('concluido').ir) as SZIRV2
  for (const s of ir.behavior.start)
    if (s.type === 'var' && s.name === 'aviso') s.value = str(PONTE_AVISO.inicio)
  ir.behavior.start.push(
    { type: 'g2d:createImageSprite', varName: 'laguinho', ...LAGUINHO_2D, image: 'laguinho' },
    { type: 'g2d:createImageSprite', varName: 'sino', ...SINO_2D, image: 'pedra-do-sino' },
    { type: 'g2d:createImageSprite', varName: 'ponte', ...PONTE_2D, image: 'ponte-levantada' },
    { type: 'g2d:createImageSprite', varName: 'alavanca', ...ALAVANCA_2D, image: 'alavanca-cima' },
    ...(n >= 1 ? [{ type: 'var' as const, name: 'ponteAberta', value: bool(false) }] : []),
  )
  // A Chave do Farol não tinha nova partida; aqui ela é parte do jogo (a ponte volta a subir).
  ir.behavior.events.push(...parseJS('SZGame2D.onKey("r",()=>{SZGame2D.restart();});'))
  if (n >= 1)
    ir.behavior.events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'alavanca',
      body: [
        imagemDe('alavanca', 'alavanca-baixo'),
        imagemDe('ponte', 'ponte-baixada'),
        { type: 'assign', name: 'ponteAberta', value: bool(true) },
        aviso(PONTE_AVISO.baixou),
        ...(n >= 2
          ? [
              {
                type: 'setTimeoutSeconds' as const,
                delay: num(PONTE_SEGUNDOS),
                body: [
                  imagemDe('alavanca', 'alavanca-cima'),
                  imagemDe('ponte', 'ponte-levantada'),
                  { type: 'assign' as const, name: 'ponteAberta', value: bool(false) },
                  aviso(PONTE_AVISO.subiu),
                ],
              },
            ]
          : []),
      ],
    })
  if (n >= 3)
    ir.behavior.events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'ponte',
      body: [
        {
          type: 'if',
          cond: { type: 'var', name: 'ponteAberta' },
          then: [
            {
              type: 'g2d:setPosition',
              spriteVar: 'personagem',
              x: num(NA_PEDRA_2D.x),
              y: num(NA_PEDRA_2D.y),
            },
            imagemDe('sino', 'pedra-do-sino-tocando'),
            aviso(PONTE_AVISO.atravessou),
          ],
          else: [aviso(PONTE_AVISO.levantada)],
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
      { type: 'g2d:drawSprite', spriteVar: 'laguinho', ctxVar: 'ctx' },
      { type: 'g2d:drawSprite', spriteVar: 'sino', ctxVar: 'ctx' },
      { type: 'g2d:drawSprite', spriteVar: 'ponte', ctxVar: 'ctx' },
      { type: 'g2d:drawSprite', spriteVar: 'alavanca', ctxVar: 'ctx' },
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
/** O asset de biblioteca de um modelo da Ponte (a referência; o Estúdio carrega o arquivo). */
export function ponteModeloAsset(name: keyof typeof PONTE_MODELOS): ProjectAsset {
  const m = PONTE_MODELOS[name]
  return {
    id: `ponte-modelo-${name}`,
    name,
    kind: 'model3d',
    source: 'library',
    libId: COURSE_MODEL_LIB_PREFIX + m.sha,
    dataUrl: courseModelStub(m.sha, m.clips),
    originalFileName: `${name}.glb`,
  }
}
export const PONTE_ASSETS_3D: ProjectAsset[] = [
  ...ILHA_ASSETS,
  ponteModeloAsset('laguinho'),
  ponteModeloAsset('pedra-do-sino'),
  ponteModeloAsset('ponte-levadica'),
  ponteModeloAsset('alavanca'),
]
/** O chão da Ilha no gramado da frente (medido no cenário do Blender). */
const CHAO = 0.05
/** O laguinho no gramado da frente, à direita do coqueiro (centro no chão do jogo, x e z). */
export const LAGUINHO_3D = [-3.1, 3.5] as const
/** A pedra do sino dentro da água, do lado de lá da ponte. */
export const SINO_3D = [-3.9, 3.5] as const
/** A dobradiça da ponte, na margem da direita (o tabuleiro vai para a esquerda). */
export const PONTE_3D_DOBRADICA = [-1.3, 3.5] as const
/** A alavanca na areia, ao lado da entrada da ponte (um passo para a direita de quem está nela). */
export const ALAVANCA_3D = [0.9, 3] as const
/** Onde o personagem fica quando atravessa: em cima da pedra, na frente do sino. */
export const NA_PEDRA_3D = [-3.9, 1.42, 3.8] as const
/**
 * As áreas de andar: a ilha da Ilha do Farol com um buraco no lugar do laguinho (três retângulos
 * em volta dele) e um pedaço só na pedra, que não encosta em nenhum outro. Os dois caminhos do
 * cais e do farol seguem os da Ilha.
 */
export const PONTE_AREAS_3D = [
  // Até a beira da água (z 2): entre a pedra, que é sólida, e o laguinho o corredor ficava estreito
  // demais para o robô do executor passar.
  { minX: -11, maxX: 1, minZ: -5, maxZ: 2 },
  { minX: -11, maxX: -5.3, minZ: 1.8, maxZ: 5 },
  { minX: -0.9, maxX: 1, minZ: 1.8, maxZ: 5 },
  { minX: -4.35, maxX: -3.45, minZ: 3.3, maxZ: 4.05 },
  { minX: 0.6, maxX: 4.1, minZ: 0.4, maxZ: 1.1 },
  { minX: 4, maxX: 6.1, minZ: -0.5, maxZ: 1.7 },
]
/** Por onde o robô do executor anda: as áreas, sem a pedra e os troncos (sólidos no jogo). */
export const PONTE_CAMINHOS_3D = recortarObstaculos(PONTE_AREAS_3D, ILHA_OBSTACULOS)

const em = (name: keyof typeof PONTE_MODELOS, x: number, z: number, dx = 0) => {
  const c = PONTE_MODELOS[name].center
  return [+(x + dx + c[0]).toFixed(3), +(CHAO + c[1]).toFixed(3), +(z + c[2]).toFixed(3)].join(',')
}

function source3d(etapa: PonteEtapa): string {
  const n = PONTE_ETAPAS.indexOf(etapa)
  const m = PONTE_MODELOS
  let s = ilhaSource('personalizar').replace(
    '"Encontre a chave e leve o personagem até o farol."',
    JSON.stringify(PONTE_AVISO.inicio),
  )
  const preparo = `
const laguinho=SZGame3D.createModelFile(cena,"laguinho",${m.laguinho.size});
SZGame3D.setPosition(laguinho,${em('laguinho', ...LAGUINHO_3D)});
const sino=SZGame3D.createModelFile(cena,"pedra-do-sino",${m['pedra-do-sino'].size});
SZGame3D.setPosition(sino,${em('pedra-do-sino', ...SINO_3D)});
const ponte=SZGame3D.createModelFile(cena,"ponte-levadica",${m['ponte-levadica'].size});
SZGame3D.setPosition(ponte,${em('ponte-levadica', ...PONTE_3D_DOBRADICA)});
const alavanca=SZGame3D.createModelFile(cena,"alavanca",${m.alavanca.size});
SZGame3D.setPosition(alavanca,${em('alavanca', ...ALAVANCA_3D)});
${PONTE_AREAS_3D.slice(0, 4)
  .map((a) => `SZGame3D.walkArea(personagem,${a.minX},${a.maxX},${a.minZ},${a.maxZ});`)
  .join('\n')}
${n >= 1 ? 'let ponteAberta=false;' : ''}`
  s = s.replace('SZGame3D.walkArea(personagem,-11,1,-5,5);', preparo.trim())
  const sobe =
    n >= 2
      ? `setTimeout(()=>{SZGame3D.playAnimation(alavanca,"soltar","uma-vez");SZGame3D.playAnimation(ponte,"subir","uma-vez");ponteAberta=false;aviso=${JSON.stringify(PONTE_AVISO.subiu)};},${PONTE_SEGUNDOS}*1000);`
      : ''
  const regras = [
    n >= 1
      ? `SZGame3D.onTouch(personagem,alavanca,()=>{SZGame3D.playAnimation(alavanca,"puxar","uma-vez");SZGame3D.playAnimation(ponte,"baixar","uma-vez");ponteAberta=true;aviso=${JSON.stringify(PONTE_AVISO.baixou)};${sobe}});`
      : '',
    n >= 3
      ? `SZGame3D.onTouch(personagem,ponte,()=>{if(ponteAberta){SZGame3D.setPosition(personagem,${NA_PEDRA_3D.join(',')});SZGame3D.playAnimation(sino,"tocar","uma-vez");aviso=${JSON.stringify(PONTE_AVISO.atravessou)};}else{aviso=${JSON.stringify(PONTE_AVISO.levantada)};}});`
      : '',
  ].join('\n')
  return s.replace('SZGame3D.animate(cena,()=>{', `${regras}\nSZGame3D.animate(cena,()=>{`)
}

export function montarProjetoPonte(dimensao: PonteDimensao, etapa: PonteEtapa = 'inicio'): Project {
  const ir =
      dimensao === '2d'
        ? ir2d(etapa)
        : normalizeSZIR({
            html: [],
            css: [],
            js: parseJS(source3d(etapa)),
            extensions: [{ extensionId: 'game-3d' }],
          }),
    name = `A ponte apressada — ${dimensao.toUpperCase()}`
  return {
    ...createEmptyProject(`manifest-ponte-${dimensao}`, name),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: dimensao === '2d' ? PONTE_ASSETS_2D : PONTE_ASSETS_3D,
    installedExtensions: [
      {
        id: `game-${dimensao}`,
        version: dimensao === '3d' ? gameThreeDManifest.version : gameTwoDManifest.version,
        installedAt: 0,
      },
    ],
  }
}
