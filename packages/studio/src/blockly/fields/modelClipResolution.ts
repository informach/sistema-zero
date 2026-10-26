import type { ProjectAsset } from '#core'
import { readGlbSummary } from '../../core/glbSummary'

/**
 * Do bloco que pede um nome de animação (`CLIP`) até o MODELO 3D cujos clipes ele
 * deve listar. PURO: só lê campos e encadeamento de blocos pela forma mínima
 * abaixo (um `Blockly.Block` a satisfaz), então dá para testar sem DOM.
 *
 * Regras (uma por bloco):
 * - `sz_g3d_play_animation`: OBJ → `sz_g3d_create_model_file` com o mesmo NAME → MODEL.
 * - `sz_g3k_state_anim` / `sz_g3k_on_anim_end`: MOLD → `sz_g3k_define_mold` com o
 *   mesmo NAME → última peça `sz_g3k_part` com SHAPE "modelo" → MODEL.
 * - `sz_g3k_play_anim`: CHAR é uma variável de objeto (de qualquer molde) → a união dos
 *   modelos de TODOS os moldes.
 * - `sz_w3d_place_model`: o MODEL do próprio bloco.
 * - `sz_w3d_model_anim`: personagem → `sz_w3d_person_model`; amigo →
 *   `sz_w3d_npc_model` com o mesmo NAME.
 *
 * Nada resolvido (ou o modelo resolvido não existe no projeto) → a reserva:
 * TODOS os modelos do projeto, agrupados por modelo.
 */
export interface ClipBlockLike {
  type: string
  getFieldValue(name: string): unknown
  getInputTargetBlock(name: string): ClipBlockLike | null
  getNextBlock(): ClipBlockLike | null
}

/** Os blocos cujo campo `CLIP` é um `field_model_clip_picker`. */
export const MODEL_CLIP_BLOCK_TYPES: readonly string[] = [
  'sz_g3d_play_animation',
  'sz_g3k_state_anim',
  'sz_g3k_play_anim',
  'sz_g3k_on_anim_end',
  'sz_w3d_place_model',
  'sz_w3d_model_anim',
]

export interface ModelClipGroup {
  /** Nome do asset `model3d` (o que a criança vê na aba "Modelos 3D"). */
  model: string
  /**
   * Os clipes do modelo; `null` quando o arquivo não pôde ser lido (GLB quebrado ou acima dos
   * tetos do resumo). `[]` e `null` são frases diferentes no seletor: "não tem animações" é
   * uma afirmação sobre o modelo, e não dá para afirmar nada de um arquivo que não foi lido.
   */
  clips: readonly string[] | null
}

export interface ModelClipOptions {
  /** `true` quando o bloco levou a um modelo do projeto; `false` = reserva (todos os modelos). */
  resolved: boolean
  groups: ModelClipGroup[]
}

export type ReadClips = (asset: ProjectAsset) => readonly string[] | null

const defaultReadClips: ReadClips = (asset) =>
  readGlbSummary(asset.dataUrl, asset.id)?.clips ?? null

function text(block: ClipBlockLike, field: string): string {
  const value = block.getFieldValue(field)
  return typeof value === 'string' ? value.trim() : ''
}

function pushUnique(list: string[], name: string): void {
  if (name && !list.includes(name)) list.push(name)
}

/** Última peça "modelo importado" (com arquivo) dentro do corpo do molde. */
function moldModel(mold: ClipBlockLike): string {
  let model = ''
  let part = mold.getInputTargetBlock('BODY')
  // Teto contra um encadeamento circular de mentira (o Blockly não gera, mas é barato).
  for (let guard = 0; part && guard < 10_000; guard++) {
    if (part.type === 'sz_g3k_part' && text(part, 'SHAPE') === 'modelo') {
      const file = text(part, 'MODEL')
      if (file) model = file
    }
    part = part.getNextBlock()
  }
  return model
}

/**
 * Nomes dos modelos aos quais o bloco leva, na ordem em que aparecem. Lista vazia
 * quando nada resolve (bloco desconhecido, nome sem declaração, campo vazio).
 */
export function resolveClipModels(
  block: ClipBlockLike,
  allBlocks: readonly ClipBlockLike[],
): string[] {
  const models: string[] = []
  switch (block.type) {
    case 'sz_g3d_play_animation': {
      const obj = text(block, 'OBJ')
      if (!obj) break
      for (const other of allBlocks) {
        if (other.type === 'sz_g3d_create_model_file' && text(other, 'NAME') === obj) {
          pushUnique(models, text(other, 'MODEL'))
        }
      }
      break
    }
    case 'sz_g3k_state_anim':
    case 'sz_g3k_on_anim_end': {
      const mold = text(block, 'MOLD')
      if (!mold) break
      for (const other of allBlocks) {
        if (other.type === 'sz_g3k_define_mold' && text(other, 'NAME') === mold) {
          pushUnique(models, moldModel(other))
        }
      }
      break
    }
    case 'sz_g3k_play_anim': {
      for (const other of allBlocks) {
        if (other.type === 'sz_g3k_define_mold') pushUnique(models, moldModel(other))
      }
      break
    }
    case 'sz_w3d_place_model':
      pushUnique(models, text(block, 'MODEL'))
      break
    case 'sz_w3d_model_anim': {
      const who = text(block, 'WHO')
      const name = text(block, 'NAME')
      for (const other of allBlocks) {
        if (who === 'personagem' && other.type === 'sz_w3d_person_model') {
          pushUnique(models, text(other, 'MODEL'))
        } else if (
          who === 'amigo' &&
          other.type === 'sz_w3d_npc_model' &&
          text(other, 'NAME') === name
        ) {
          pushUnique(models, text(other, 'MODEL'))
        }
      }
      break
    }
  }
  return models
}

/**
 * As opções do seletor: os clipes dos modelos do bloco ou, se nenhum deles existe
 * no projeto, os de todos os `model3d`. Modelo ilegível (GLB fora dos tetos) entra
 * com `clips: null` — o seletor diz que não conseguiu ler as animações dele.
 */
export function resolveModelClipOptions(
  block: ClipBlockLike,
  allBlocks: readonly ClipBlockLike[],
  assets: readonly ProjectAsset[],
  readClips: ReadClips = defaultReadClips,
): ModelClipOptions {
  const models = assets.filter((asset) => asset.kind === 'model3d')
  const byName = new Map(models.map((asset) => [asset.name, asset]))
  const wanted = resolveClipModels(block, allBlocks).flatMap((name) => {
    const asset = byName.get(name)
    return asset ? [asset] : []
  })
  const resolved = wanted.length > 0
  const groups = (resolved ? wanted : models).map((asset) => ({
    model: asset.name,
    clips: readClips(asset),
  }))
  return { resolved, groups }
}
