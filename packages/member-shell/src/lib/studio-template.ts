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
 */

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

export function isInitialTemplateProject(project: unknown, template: unknown): boolean {
  if (!isRecord(project) || !isRecord(template)) return false
  if (project.kind === 'pro' || template.kind === 'pro') return false
  const projectFiles = project.files
  const templateFiles = template.files
  if (!isRecord(projectFiles) || !isRecord(templateFiles)) return false
  const projectAssetList = projectAssets(project)
  const templateAssetList = projectAssets(template)
  if (!projectAssetList || !templateAssetList) return false
  if (!jsonValueEqual(projectAssetList, templateAssetList)) return false
  return CANONICAL_FILES.every(
    (name) => canonicalFile(projectFiles, name) === canonicalFile(templateFiles, name),
  )
}
