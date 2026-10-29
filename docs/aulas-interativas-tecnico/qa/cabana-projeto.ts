/**
 * Os jogos do Poder "O segredo da cabana" (Faísca): o Farol 2D e a Ilha 3D já concluídos, com o
 * emblema do farol e a cabana do faroleiro. A equipe prepara as artes, as posições, o desenho e o
 * reinício; a criança constrói, uma etapa por parte, a variável `temEmblema` (começa falsa), a
 * coleta do emblema (some, guarda verdadeiro, avisa) e a pergunta da cabana: se `temChave` e
 * `temEmblema`, abre e avisa; senão, avisa que ela pede as duas peças.
 *
 * As duas peças ficam em lados opostos do caminho (a chave no gramado de cima, o emblema no de
 * baixo), e a cabana longe das duas: a criança testa sem nenhuma, com uma de cada vez e com as
 * duas, em qualquer ordem. O farol continua pedindo só a chave.
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

export const CABANA_CURSO = 'jornada-faisca-poder-2'
export const CABANA_ETAPAS = ['inicio', 'emblema', 'porta'] as const
export type CabanaEtapa = (typeof CABANA_ETAPAS)[number]
export type CabanaDimensao = '2d' | '3d'
export const CABANA_AVISO = {
  inicio: 'Ache a chave e o emblema para abrir a cabana.',
  emblema: 'Você pegou o emblema!',
  abriu: 'A cabana abriu! Você tinha as duas peças.',
  falta: 'A cabana pede a chave e o emblema.',
} as const

const art = resolve(import.meta.dirname, '../../design/o-segredo-da-cabana')
export const CABANA_MODELOS = JSON.parse(
  readFileSync(resolve(art, 'modelos.json'), 'utf8'),
) as Record<
  'emblema-do-farol' | 'cabana-do-faroleiro',
  { sha: string; size: number; center: [number, number, number]; clips: string[] }
>

// ── 2D ───────────────────────────────────────────────────────────────────────
/** As áreas de contato, em frações da imagem: a da cabana é o corpo, sem o telhado. */
const HITBOX_2D: Partial<Record<FarolAssetName, { x: number; y: number; w: number; h: number }>> = {
  emblema: { x: 4 / 32, y: 2 / 32, w: 24 / 32, h: 28 / 32 },
  'cabana-fechada': { x: 8 / 96, y: 30 / 96, w: 80 / 96, h: 60 / 96 },
  'cabana-aberta': { x: 8 / 96, y: 30 / 96, w: 80 / 96, h: 60 / 96 },
}
function imagem(name: FarolAssetName): ProjectAsset {
  const { width, height } = FAROL_ASSETS[name]
  const hitbox = HITBOX_2D[name]
  return {
    id: `cabana-${name}`,
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
export const CABANA_ASSETS_2D: ProjectAsset[] = [
  ...ASSETS_FAROL,
  imagem('emblema'),
  imagem('cabana-fechada'),
  imagem('cabana-aberta'),
]
/** O emblema no gramado de baixo, do lado oposto da chave (que fica no de cima). */
export const EMBLEMA_2D = { x: 196, y: 276, w: 32, h: 32 } as const
/** A cabana no canto do gramado de baixo, debaixo do começo, longe das duas peças. */
export const CABANA_2D = { x: 4, y: 236, w: 96, h: 96 } as const

const str = (value: string): JSExpr => ({ type: 'str', value })
const aviso = (value: string): JSStatement => ({ type: 'assign', name: 'aviso', value: str(value) })

function ir2d(etapa: CabanaEtapa): SZIRV2 {
  const n = CABANA_ETAPAS.indexOf(etapa)
  const ir = structuredClone(montarProjetoFarol('concluido').ir) as SZIRV2
  for (const s of ir.behavior.start)
    if (s.type === 'var' && s.name === 'aviso') s.value = str(CABANA_AVISO.inicio)
  ir.behavior.start.push(
    { type: 'g2d:createImageSprite', varName: 'emblema', ...EMBLEMA_2D, image: 'emblema' },
    { type: 'g2d:createImageSprite', varName: 'cabana', ...CABANA_2D, image: 'cabana-fechada' },
    ...(n >= 1
      ? [
          {
            type: 'var' as const,
            name: 'temEmblema',
            value: { type: 'bool' as const, value: false },
          },
        ]
      : []),
  )
  // A Chave do Farol não tinha nova partida; aqui ela é parte do jogo (as peças voltam).
  ir.behavior.events.push(...parseJS('SZGame2D.onKey("r",()=>{SZGame2D.restart();});'))
  if (n >= 1)
    ir.behavior.events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'emblema',
      body: [
        { type: 'g2d:destroySprite', spriteVar: 'emblema' },
        { type: 'assign', name: 'temEmblema', value: { type: 'bool', value: true } },
        aviso(CABANA_AVISO.emblema),
      ],
    })
  if (n >= 2)
    ir.behavior.events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'cabana',
      body: [
        {
          type: 'if',
          cond: {
            type: 'logical',
            op: '&&',
            left: { type: 'var', name: 'temChave' },
            right: { type: 'var', name: 'temEmblema' },
          },
          then: [
            { type: 'g2d:setImage', spriteVar: 'cabana', image: 'cabana-aberta' },
            aviso(CABANA_AVISO.abriu),
          ],
          else: [aviso(CABANA_AVISO.falta)],
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
      { type: 'g2d:drawSprite', spriteVar: 'cabana', ctxVar: 'ctx' },
      { type: 'g2d:drawSprite', spriteVar: 'emblema', ctxVar: 'ctx' },
    )
    loop.body.push({
      type: 'g2d:drawLabel',
      ctxVar: 'ctx',
      text: str('Setas: andar. R: recomeçar.'),
      x: 126,
      y: 350,
      color: '#ffffff',
      size: 13,
      align: 'left',
    })
  }
  return normalizeSZIR(ir) as SZIRV2
}

// ── 3D ───────────────────────────────────────────────────────────────────────
/** O asset de biblioteca de um modelo da Cabana (a referência; o Estúdio carrega o arquivo). */
export function cabanaModeloAsset(name: keyof typeof CABANA_MODELOS): ProjectAsset {
  const m = CABANA_MODELOS[name]
  return {
    id: `cabana-modelo-${name}`,
    name,
    kind: 'model3d',
    source: 'library',
    libId: COURSE_MODEL_LIB_PREFIX + m.sha,
    dataUrl: courseModelStub(m.sha, m.clips),
    originalFileName: `${name}.glb`,
  }
}
export const CABANA_ASSETS_3D: ProjectAsset[] = [
  ...ILHA_ASSETS,
  cabanaModeloAsset('emblema-do-farol'),
  cabanaModeloAsset('cabana-do-faroleiro'),
]
/** Tamanho no jogo (o lado maior): a cabana um pouco mais alta que o personagem com o telhado. */
export const EMBLEMA_3D_TAMANHO = 0.9
export const CABANA_3D_TAMANHO = 3
/** O emblema na frente da trilha (a chave fica atrás dela, em z −2), flutuando como a chave. */
export const EMBLEMA_3D = [-4, 0.95, 3.3] as const
/**
 * A cabana no começo da trilha, atrás do personagem, com a porta para a câmera: as três paradas
 * ficam a poucos passos umas das outras (o robô do executor cabe no prazo da parte).
 */
export const CABANA_3D = [-9.3, 0.4] as const

function source3d(etapa: CabanaEtapa): string {
  const n = CABANA_ETAPAS.indexOf(etapa)
  const cabana = CABANA_MODELOS['cabana-do-faroleiro']
  const yCabana = +((cabana.center[1] * CABANA_3D_TAMANHO) / cabana.size).toFixed(2)
  let s = ilhaSource('personalizar').replace(
    '"Encontre a chave e leve o personagem até o farol."',
    JSON.stringify(CABANA_AVISO.inicio),
  )
  const preparo = `
const emblema=SZGame3D.createModelFile(cena,"emblema-do-farol",${EMBLEMA_3D_TAMANHO});
SZGame3D.setPosition(emblema,${EMBLEMA_3D.join(',')});
const cabana=SZGame3D.createModelFile(cena,"cabana-do-faroleiro",${CABANA_3D_TAMANHO});
SZGame3D.setPosition(cabana,${CABANA_3D[0]},${yCabana},${CABANA_3D[1]});
${n >= 1 ? 'let temEmblema=false;' : ''}`
  s = s.replace(
    'SZGame3D.walkArea(personagem,-11,1,-5,5);',
    `${preparo.trim()}\nSZGame3D.walkArea(personagem,-11,1,-5,5);`,
  )
  const regras = [
    n >= 1
      ? `SZGame3D.onTouch(personagem,emblema,()=>{SZGame3D.setVisible(emblema,"hide");temEmblema=true;aviso=${JSON.stringify(CABANA_AVISO.emblema)};});`
      : '',
    n >= 2
      ? `SZGame3D.onTouch(personagem,cabana,()=>{if(temChave&&temEmblema){SZGame3D.playAnimation(cabana,"abrir","uma-vez");aviso=${JSON.stringify(CABANA_AVISO.abriu)};}else{aviso=${JSON.stringify(CABANA_AVISO.falta)};}});`
      : '',
  ].join('\n')
  return s.replace('SZGame3D.animate(cena,()=>{', `${regras}\nSZGame3D.animate(cena,()=>{`)
}

export function montarProjetoCabana(
  dimensao: CabanaDimensao,
  etapa: CabanaEtapa = 'inicio',
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
    name = `O segredo da cabana — ${dimensao.toUpperCase()}`
  return {
    ...createEmptyProject(`manifest-cabana-${dimensao}`, name),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: dimensao === '2d' ? CABANA_ASSETS_2D : CABANA_ASSETS_3D,
    installedExtensions: [
      {
        id: `game-${dimensao}`,
        version: dimensao === '3d' ? gameThreeDManifest.version : gameTwoDManifest.version,
        installedAt: 0,
      },
    ],
  }
}
