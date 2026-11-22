/**
 * "Você está enviando o projeto INICIAL da aula?" — o aviso anti-sobrescrita.
 *
 * O caso real (incidente de 08/2026): a criança termina o jogo num computador, e noutro o editor
 * abre semeado do TEMPLATE (o GET do envio salvo é best-effort — num soluço de rede cai no projeto
 * do professor). Ela clica "Reenviar" sem perceber e o template passa POR CIMA do jogo entregue.
 * O upsert do members é último-vence: sem o backup de versão anterior, era perda total.
 *
 * Esta função decide se o projeto que está PRESTES a ser reenviado é byte a byte o projeto
 * inicial da aula — aí o confirm mostra o aviso (não bloqueia; reenviar o template pode ser
 * intencional, ex.: recomeçar).
 *
 * Regras deliberadas:
 * - Compara SÓ os 3 arquivos canônicos (ausente = `''`). É onde o trabalho da criança mora no
 *   projeto clássico; ir/blocksState são derivados deles e mudam de forma entre versões.
 * - `kind: 'pro'` em QUALQUER lado → false: no Pro os 3 canônicos são `''` dos dois lados
 *   (o código vive na `tree`), então a comparação daria falso positivo GARANTIDO.
 * - `assets` inteiros diferentes → false: a criança que só editou/trocou imagens/sons também já
 *   trabalhou (a quantidade pode continuar igual e os 3 arquivos podem seguir intactos).
 * - Entrada nula/torta → false: sem certeza, sem aviso (aviso errado ensina a ignorar avisos).
 * - Projeto de BLOCOS compara os blocos, não o script (22/11/2026): o projeto inicial dos
 *   manifestos guarda os blocos sem id, e o código dele usa nomes de evento escritos à mão. Ao
 *   abrir, o Blockly sorteia os ids e o código regerado os leva, então o `script.js` nunca batia e
 *   o aviso não aparecia em nenhuma aula montada por manifesto. Os blocos são comparados sem o que
 *   o editor põe sozinho (id e posição de cada bloco, o `szBehaviorAreasVersion`), junto com a
 *   página e o estilo; o script é derivado deles. Com código ainda sendo lido pela Ponte
 *   (`bridgeCodeAhead`) não há certeza, e blocos com variável do Blockly (referência por id) ou
 *   sem `blocks` seguem a régua dos arquivos.
 * - O desenho da vaga de arte (`source: 'lesson-art'`) NÃO conta (22/11/2026): o host o põe nos
 *   materiais a cada abertura (`applyLessonArt`), como a impressão do conteúdo do core já trata.
 *   Contá-lo calava o aviso em toda aula com vaga. Sai só do lado da criança, junto com a imagem
 *   do projeto inicial que ele substitui (vaga `replace`, mesmo nome).
 */

import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'

const CANONICAL_FILES = ['index.html', 'style.css', 'script.js'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function canonicalFile(files: Record<string, unknown>, name: string): string {
  const content = files[name]
  return typeof content === 'string' ? content : ''
}

function projectAssets(project: Record<string, unknown>): readonly unknown[] | null {
  if (project.assets === undefined) return []
  return Array.isArray(project.assets) ? project.assets : null
}

/** Igualdade estrutural dos valores JSON dos assets, sem depender da ordem das chaves. */
function jsonValueEqual(
  left: unknown,
  right: unknown,
  activeLeft = new WeakSet<object>(),
  activeRight = new WeakSet<object>(),
): boolean {
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return Object.is(left, right)
  }
  if (activeLeft.has(left) || activeRight.has(right)) return false

  const leftIsArray = Array.isArray(left)
  const rightIsArray = Array.isArray(right)
  if (leftIsArray !== rightIsArray) return false

  activeLeft.add(left)
  activeRight.add(right)
  try {
    if (leftIsArray && rightIsArray) {
      if (left.length !== right.length) return false
      return left.every((value, index) =>
        jsonValueEqual(value, right[index], activeLeft, activeRight),
      )
    }

    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const leftKeys = Object.keys(leftRecord)
    if (leftKeys.length !== Object.keys(rightRecord).length) return false
    return leftKeys.every(
      (key) =>
        Object.hasOwn(rightRecord, key) &&
        jsonValueEqual(leftRecord[key], rightRecord[key], activeLeft, activeRight),
    )
  } finally {
    activeLeft.delete(left)
    activeRight.delete(right)
  }
}

const isLessonArt = (asset: unknown): boolean => isRecord(asset) && asset.source === 'lesson-art'

/** Tira os desenhos da vaga de arte do projeto e, do projeto inicial, as imagens que eles trocam. */
function withoutLessonArt(
  own: readonly unknown[],
  original: readonly unknown[],
): { own: readonly unknown[]; original: readonly unknown[] } {
  const drawn = own.filter(isLessonArt)
  if (drawn.length === 0) return { own, original }
  const replaced = new Set(drawn.map((asset) => (isRecord(asset) ? asset.name : undefined)))
  replaced.delete(undefined)
  return {
    own: own.filter((asset) => !isLessonArt(asset)),
    original: original.filter(
      (asset) => !(isRecord(asset) && !isLessonArt(asset) && replaced.has(asset.name)),
    ),
  }
}

/** O que o editor põe sozinho num bloco ao abrir: não é trabalho da criança. */
const EDITOR_BLOCK_KEYS = new Set(['id', 'x', 'y'])

const BLOCKS_NOT_COMPARABLE = Symbol('blocos não comparáveis')

/** Os blocos sem id e posição. `null` quando a régua não se aplica (variável referida por id). */
function blocksContent(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(blocksContent)
    return items.includes(BLOCKS_NOT_COMPARABLE) ? BLOCKS_NOT_COMPARABLE : items
  }
  if (!isRecord(value)) return value
  const isBlock = typeof value.type === 'string'
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (isBlock && EDITOR_BLOCK_KEYS.has(key)) continue
    // Campo com objeto é referência por id (variável do Blockly): sem id, não dá para comparar.
    if (isBlock && key === 'fields' && isRecord(child)) {
      if (Object.values(child).some((field) => typeof field === 'object' && field !== null))
        return BLOCKS_NOT_COMPARABLE
    }
    const content = blocksContent(child)
    if (content === BLOCKS_NOT_COMPARABLE) return BLOCKS_NOT_COMPARABLE
    out[key] = content
  }
  return out
}

/** `true`/`false` quando os dois lados têm blocos comparáveis; `null` para seguir os arquivos. */
function sameBlocks(own: unknown, original: unknown): boolean | null {
  if (!isRecord(own) || !isRecord(original)) return null
  if (!isRecord(own.blocks) || !isRecord(original.blocks)) return null
  if (own.variables !== undefined || original.variables !== undefined) return null
  const { szBehaviorAreasVersion: _ownAreas, ...ownRest } = own
  const { szBehaviorAreasVersion: _originalAreas, ...originalRest } = original
  const left = blocksContent(ownRest)
  const right = blocksContent(originalRest)
  if (left === BLOCKS_NOT_COMPARABLE || right === BLOCKS_NOT_COMPARABLE) return null
  return jsonValueEqual(left, right)
}

export function isInitialTemplateProject(project: unknown, template: unknown): boolean {
  if (!isRecord(project) || !isRecord(template)) return false
  if (project.programmingLanguage === 'python' || template.programmingLanguage === 'python') {
    if (studioProjectContinuityIssue(project, template)) return false
    const source = project.kind === 'pro' ? 'tree' : 'files'
    if (!isRecord(project[source]) || !isRecord(template[source])) return false
    const own = projectAssets(project)
    const original = projectAssets(template)
    return Boolean(
      own &&
        original &&
        jsonValueEqual(own, original) &&
        jsonValueEqual(project[source], template[source]) &&
        jsonValueEqual(project.python, template.python) &&
        jsonValueEqual(project.installedExtensions, template.installedExtensions),
    )
  }
  if (project.kind === 'pro' || template.kind === 'pro') return false
  const projectFiles = project.files
  const templateFiles = template.files
  if (!isRecord(projectFiles) || !isRecord(templateFiles)) return false
  const projectAssetList = projectAssets(project)
  const templateAssetList = projectAssets(template)
  if (!projectAssetList || !templateAssetList) return false
  const compared = withoutLessonArt(projectAssetList, templateAssetList)
  if (!jsonValueEqual(compared.own, compared.original)) return false
  const blocks = sameBlocks(project.blocksState, template.blocksState)
  if (blocks !== null) {
    if (!blocks || project.bridgeCodeAhead === true) return false
    return (['index.html', 'style.css'] as const).every(
      (name) => canonicalFile(projectFiles, name) === canonicalFile(templateFiles, name),
    )
  }
  return CANONICAL_FILES.every(
    (name) => canonicalFile(projectFiles, name) === canonicalFile(templateFiles, name),
  )
}
