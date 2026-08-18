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
 * - Contagem de `assets` diferente → false: a criança que só adicionou imagens/sons também já
 *   trabalhou (os 3 arquivos podem seguir intactos num projeto só-de-assets).
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

function assetsCount(project: Record<string, unknown>): number {
  return Array.isArray(project.assets) ? project.assets.length : 0
}

export function isInitialTemplateProject(project: unknown, template: unknown): boolean {
  if (!isRecord(project) || !isRecord(template)) return false
  if (project.kind === 'pro' || template.kind === 'pro') return false
  const projectFiles = project.files
  const templateFiles = template.files
  if (!isRecord(projectFiles) || !isRecord(templateFiles)) return false
  if (assetsCount(project) !== assetsCount(template)) return false
  return CANONICAL_FILES.every(
    (name) => canonicalFile(projectFiles, name) === canonicalFile(templateFiles, name),
  )
}
