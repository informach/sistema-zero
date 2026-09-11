/**
 * A família de cada comando do registro: é por aqui que o portão por nível de carreira chega
 * ao trilho, aos atalhos e à tela de ajuda de uma vez.
 *
 * Mapa IRMÃO do registro, e não um campo nele, de propósito: `tier` responde "onde e quanto se
 * vê" e a família responde "a criança pode usar". São perguntas diferentes, com donos
 * diferentes (a casca é da outra sessão; o portão, deste plano), e juntar as duas numa linha
 * faria toda mudança de layout parecer mudança de portão.
 *
 * `'always'` = fora do portão, sempre: sair, desfazer, guardar, baixar o projeto, escolher,
 * isolar, grade, vistas, enquadrar e ver os apoios. Ler nunca é trancado.
 *
 * ⚠️ Exaustivo por tipo: comando novo no registro não compila até ganhar a família dele aqui.
 */
import type { MoldaToolFamilyId } from '../../../core/toolFamilies'
import type { SceneCommandId } from './sceneCommandRegistry'

export type SceneCommandFamily = MoldaToolFamilyId | 'always'

/** O `can` do `useMoldaToolAccess()`. */
export type SceneToolCheck = (family: MoldaToolFamilyId) => boolean

/**
 * O que mora em "Mais jeitos de pintar". Aqui, e não no painel (que carrega sob demanda), para a
 * casca saber sem baixar o módulo que, no nível de entrada, o painel ficaria vazio.
 */
export const SCENE_PAINT_ADVANCED_FAMILIES = [
  'paint.shapes',
  'paint.sheet',
  'paint.flipbook',
  'paint.layers',
] as const satisfies readonly MoldaToolFamilyId[]

export const SCENE_COMMAND_ACCESS: Readonly<Record<SceneCommandId, SceneCommandFamily>> = {
  'app.exit': 'always',
  'app.undo': 'always',
  'app.redo': 'always',
  'app.export': 'files.export',
  'app.save': 'always',
  'app.backup': 'always',
  'app.import': 'files.interop',
  'add.box': 'model.pieces',
  'add.wedge': 'model.pieces',
  'add.cylinder': 'model.pieces',
  'add.sphere': 'model.pieces',
  'add.locator': 'model.locator',
  'tool.select': 'always',
  'tool.box': 'model.area-select',
  'tool.lasso': 'model.area-select',
  // Em Animar as mesmas alças posam a peça: `animate.create` está na mesma faixa (a básica).
  'tool.move': 'model.pieces',
  'tool.rotate': 'model.pieces',
  'tool.scale': 'model.pieces',
  'node.duplicate': 'model.pieces',
  'node.remove': 'model.pieces',
  'node.group': 'model.pieces',
  'node.ungroup': 'model.pieces',
  'node.convert-mesh': 'model.mesh',
  'mode.mesh': 'model.mesh',
  'select.additive': 'always',
  'view.isolate': 'always',
  'view.frame': 'always',
  'view.grid': 'always',
  'view.supports': 'always',
  'view.reference': 'model.reference',
  'mesh.extrude': 'model.mesh',
  'mesh.inset': 'model.mesh',
  'mesh.plane-cut': 'model.mesh-pro',
  'mesh.uv': 'paint.uv',
  'paint.pencil': 'paint.brush',
  'paint.eraser': 'paint.brush',
  'paint.fill': 'paint.brush',
  'paint.picker': 'paint.brush',
  'paint.rotate': 'paint.brush',
  'paint.closeup': 'paint.brush',
  'paint.mirror': 'paint.brush',
  'paint.dress': 'paint.brush',
  'paint.width-1': 'paint.brush',
  'paint.width-2': 'paint.brush',
  'paint.width-3': 'paint.brush',
}

/** Sem `can`, tudo liberado: é o mesmo padrão do host que não manda `toolAccess`. */
export function sceneCommandAllowed(id: SceneCommandId, can?: SceneToolCheck): boolean {
  const family = SCENE_COMMAND_ACCESS[id]
  return family === 'always' || !can || can(family)
}
