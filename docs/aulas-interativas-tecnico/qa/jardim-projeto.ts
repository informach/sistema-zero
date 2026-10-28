import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
import type { JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { gameTwoDManifest } from '../../../packages/studio/src/official-extensions/game-2d/manifest'
import { gameThreeDManifest } from '../../../packages/studio/src/official-extensions/game-3d/manifest'
import { parseJS } from '../../../packages/studio/src/parsers/js'
import { ASSETS_FAROL } from './desafio-farol-projeto'
import { ilhaModelo } from './ilha-do-farol-assets'

export const JARDIM_CURSO = 'jornada-faisca-missao'
export const JARDIM_ETAPAS = [
  'inicio',
  'movimento',
  'limite',
  'coleta',
  'decisao',
  'posicao',
] as const
export type JardimEtapa = (typeof JARDIM_ETAPAS)[number]
export type JardimDimensao = '2d' | '3d'
const art = resolve(import.meta.dirname, '../../design/jardim-secreto')
export const JARDIM_MODELOS = JSON.parse(
  readFileSync(resolve(art, 'modelos.json'), 'utf8'),
) as Record<
  string,
  { sha: string; size: number; center: [number, number, number]; clips: string[] }
>
const images = JSON.parse(readFileSync(resolve(art, 'imagens.json'), 'utf8')) as Record<
  string,
  { width: number; height: number; svg: string }
>
export const JARDIM_ASSETS_2D: ProjectAsset[] = [
  ...Object.entries(images).map(([name, im]) => ({
    id: `jardim-${name}`,
    name,
    kind: 'image' as const,
    source: 'library' as const,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(im.svg).toString('base64')}`,
    width: im.width,
    height: im.height,
  })),
  ...ASSETS_FAROL.filter((a) => ['aventureiro', 'menina-de-laco'].includes(a.name)),
]
/** Os modelos que o jogo usa (a `pedra-do-jardim` é só da pergunta do ponto de vista do quiz). */
export const JARDIM_MODELOS_DO_JOGO = [
  'jardim-acolhedor',
  'regador-azul',
  'flor-do-jardim',
] as const
/** O asset de biblioteca de um modelo do Jardim (a referência; o Estúdio carrega o arquivo). */
export function jardimModeloAsset(name: string): ProjectAsset {
  const m = JARDIM_MODELOS[name]
  if (!m) throw Error(`Modelo do Jardim ausente: ${name}`)
  return {
    id: `jardim-modelo-${name}`,
    name,
    kind: 'model3d' as const,
    source: 'library' as const,
    libId: COURSE_MODEL_LIB_PREFIX + m.sha,
    dataUrl: courseModelStub(m.sha, m.clips),
    originalFileName: `${name}.glb`,
  }
}
export const JARDIM_ASSETS_3D: ProjectAsset[] = [
  ...JARDIM_MODELOS_DO_JOGO.map(jardimModeloAsset),
  ilhaModelo('aventureiro').asset,
  ilhaModelo('menina-de-laco').asset,
]
function ir2d(etapa: JardimEtapa): SZIRV2 {
  const n = JARDIM_ETAPAS.indexOf(etapa)
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 960, height: 600, bg: '#a4c98a' },
    {
      type: 'g2d:createImageSprite',
      varName: 'personagem',
      x: 130,
      y: 310,
      w: 72,
      h: 72,
      image: 'aventureiro',
    },
    {
      type: 'g2d:createImageSprite',
      varName: 'regador',
      x: n >= 5 ? 390 : 300,
      y: 190,
      w: 60,
      h: 53,
      image: 'regador-azul',
    },
    {
      type: 'g2d:createImageSprite',
      varName: 'flor',
      x: 740,
      y: 265,
      w: 96,
      h: 120,
      image: 'flor-fechada',
    },
    {
      type: 'g2d:createSprite',
      varName: 'fundoAviso',
      x: 12,
      y: 12,
      w: 936,
      h: 38,
      color: '#264e45',
    },
    {
      type: 'var',
      name: 'aviso',
      value: { type: 'str', value: 'Recolha o regador e leve o personagem até a flor.' },
    },
    ...(n >= 1
      ? [{ type: 'g2d:enableClassicControls' as const, mode: 'directions' as const }]
      : []),
    ...(n >= 3
      ? [
          {
            type: 'var' as const,
            name: 'temRegador',
            value: { type: 'bool' as const, value: false },
          },
        ]
      : []),
  ]
  const message = (value: string): JSStatement => ({
    type: 'assign',
    name: 'aviso',
    value: { type: 'str', value },
  })
  const events: JSStatement[] = [...parseJS('SZGame2D.onKey("r",()=>{SZGame2D.restart();});')]
  if (n >= 3)
    events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'regador',
      body: [
        { type: 'g2d:destroySprite', spriteVar: 'regador' },
        { type: 'assign', name: 'temRegador', value: { type: 'bool', value: true } },
        message('Você pegou o regador! Agora vá até a flor.'),
      ],
    })
  if (n >= 4)
    events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'flor',
      body: [
        {
          type: 'if',
          cond: { type: 'var', name: 'temRegador' },
          then: [
            { type: 'g2d:setImage', spriteVar: 'flor', image: 'flor-aberta' },
            message('A flor abriu! Você fez o jardim florescer.'),
          ],
          else: [message('Busque o regador primeiro. A flor espera por você.')],
        },
      ],
    })
  return normalizeSZIR({
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start,
      events,
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'jardim-acolhedor' },
            ...(n >= 1
              ? [{ type: 'g2d:topDown' as const, spriteVar: 'personagem', speed: 5 }]
              : []),
            ...(n >= 2
              ? [{ type: 'g2d:clampToScreen' as const, spriteVar: 'personagem', ctxVar: 'ctx' }]
              : []),
            ...['regador', 'flor', 'personagem', 'fundoAviso'].map((spriteVar) => ({
              type: 'g2d:drawSprite' as const,
              spriteVar,
              ctxVar: 'ctx',
            })),
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: { type: 'var', name: 'aviso' },
              x: 28,
              y: 38,
              color: '#ffffff',
              size: 19,
              align: 'left',
            },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'Setas: andar. R: nova partida.' },
              x: 480,
              y: 585,
              color: '#264e45',
              size: 17,
              align: 'center',
            },
          ],
        },
      ],
    },
  })
}
function ir3d(etapa: JardimEtapa): SZIRV2 {
  const n = JARDIM_ETAPAS.indexOf(etapa)
  const place = (id: string, name: string, x: number, z: number) => {
    const m = JARDIM_MODELOS[name]
    return `const ${id}=SZGame3D.createModelFile(cena,"${name}",${Number(m.size.toFixed(2))});SZGame3D.setPosition(${id},${x},${Number(m.center[1].toFixed(2))},${z});`
  }
  return normalizeSZIR({
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d' }],
    js: parseJS(`
const cena=SZGame3D.createFullscreenScene("#c4e2df");
SZGame3D.frameScene(cena,25,2,16);
${place('jardim', 'jardim-acolhedor', 0, 0)}
${place('regador', 'regador-azul', n >= 5 ? -2 : -4, -2)}
${place('flor', 'flor-do-jardim', 5, 1)}
const personagem=SZGame3D.createModelFile(cena,"aventureiro",${ilhaModelo('aventureiro').size});
SZGame3D.setPosition(personagem,-7,0.8,1);
SZGame3D.walkArea(personagem,-9,9,-4,4);
SZGame3D.walkAnimations(personagem,"parado","andando");
let aviso="Recolha o regador e leve o personagem até a flor.";
${n >= 3 ? 'let temRegador=false;' : ''}
SZGame3D.hudText("bottom-center","Setas ou WASD: andar. R: nova partida.");
SZGame3D.onKey("KeyR",()=>{SZGame3D.restart();});
${n >= 3 ? `SZGame3D.onTouch(personagem,regador,()=>{SZGame3D.setVisible(regador,"hide");temRegador=true;aviso="Você pegou o regador! Agora vá até a flor.";});` : ''}
${n >= 4 ? `SZGame3D.onTouch(personagem,flor,()=>{if(temRegador){SZGame3D.playAnimation(flor,"florescer","uma-vez");aviso="A flor abriu! Você fez o jardim florescer.";}else{aviso="Busque o regador primeiro. A flor espera por você.";}});` : ''}
SZGame3D.animate(cena,()=>{${n >= 1 ? 'SZGame3D.topDown(personagem,4);' : ''}SZGame3D.hudText("top-center",aviso);});`),
  })
}
export function montarProjetoJardim(
  dimensao: JardimDimensao,
  etapa: JardimEtapa = 'inicio',
): Project {
  const ir = dimensao === '2d' ? ir2d(etapa) : ir3d(etapa),
    name = `O Jardim Secreto — ${dimensao.toUpperCase()}`
  return {
    ...createEmptyProject(`manifest-jardim-${dimensao}`, name),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: dimensao === '2d' ? JARDIM_ASSETS_2D : JARDIM_ASSETS_3D,
    installedExtensions: [
      {
        id: `game-${dimensao}`,
        version: dimensao === '3d' ? gameThreeDManifest.version : gameTwoDManifest.version,
        installedAt: 0,
      },
    ],
  }
}
