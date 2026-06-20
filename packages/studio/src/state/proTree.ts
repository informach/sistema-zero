import { normalizeProPath, type ProjectTree, type ProNode, type ProProjectMeta } from '#core'

/**
 * Manipulação PURA da árvore de arquivos do modo profissional (`ProjectTree`
 * path-keyed) + sanitizer anti-DoS. Sem React, sem store — testável em bun. As
 * funções de edição são imutáveis: devolvem uma nova árvore OU uma mensagem de
 * erro (nunca lançam). O sanitizer roda no load (igual ao de `blocksState`) e
 * NUNCA aceita `node_modules` (defesa em profundidade; `normalizeProPath` já
 * barra, mas reforçamos aqui).
 */

export interface ProTreeResult {
  tree?: ProjectTree
  error?: string
}

/** Caminhos de TODAS as pastas-pai de um path (`a/b/c` → `['a','a/b']`). */
function parentDirs(path: string): string[] {
  const segments = path.split('/')
  const dirs: string[] = []
  for (let i = 1; i < segments.length; i++) dirs.push(segments.slice(0, i).join('/'))
  return dirs
}

/** Recusa se algum ancestral já existe como ARQUIVO (não pode ter filho). */
function parentFileConflict(tree: ProjectTree, path: string): string | null {
  for (const dir of parentDirs(path)) {
    const node = tree[dir]
    if (node && node.kind !== 'dir') return `O caminho "${dir}" já é um arquivo.`
  }
  return null
}

/**
 * Existe um nó cujo caminho é uma VARIANTE DE CAIXA de `path` (ex.: `src/App.tsx`
 * vs `src/app.tsx`)? A árvore é case-SENSÍVEL (chave como digitada), mas o
 * WebContainer monta num FS case-INSENSÍVEL (macOS/Windows) onde os dois colapsam
 * num só — então bloqueamos a criação de uma variante de caixa de um path já
 * existente. `ignore` (e sua subárvore) é pulado: num rename, o próprio nó movido
 * não conta como colisão consigo mesmo.
 */
function caseInsensitiveCollision(tree: ProjectTree, path: string, ignore?: string): string | null {
  const lower = path.toLowerCase()
  const ignorePrefix = ignore ? `${ignore}/` : null
  for (const key of Object.keys(tree)) {
    if (key === ignore || (ignorePrefix && key.startsWith(ignorePrefix))) continue
    if (key !== path && key.toLowerCase() === lower) {
      return `Já existe "${key}" — caminhos que diferem só na caixa colidem em alguns sistemas.`
    }
  }
  return null
}

/**
 * Algum ANCESTRAL de `path` (que `withParents`/o rename materializariam como `dir`)
 * colide só na CAIXA com uma pasta já existente? Sem esta checagem,
 * `addProFile('src/x.ts')` com um `Src/` já presente criaria `Src` E `src` lado a
 * lado — variantes que COLAPSAM no FS case-insensitivo do WebContainer (macOS/
 * Windows) e corrompem o sync. Ancestral presente VERBATIM é reusado (sem conflito).
 */
function ancestorCaseConflict(tree: ProjectTree, path: string, ignore?: string): string | null {
  for (const dir of parentDirs(path)) {
    if (tree[dir]) continue
    const conflict = caseInsensitiveCollision(tree, dir, ignore)
    if (conflict) return conflict
  }
  return null
}

/** Copia a árvore criando como `dir` toda pasta-pai ausente do `path`. */
function withParents(tree: ProjectTree, path: string): ProjectTree {
  const next: ProjectTree = { ...tree }
  for (const dir of parentDirs(path)) {
    if (!next[dir]) next[dir] = { kind: 'dir' }
  }
  return next
}

export function addProFile(tree: ProjectTree, path: string): ProTreeResult {
  const norm = normalizeProPath(path, { expectFile: true })
  if (!norm) return { error: 'Nome de arquivo inválido (use .ts, .tsx, .css, .html…).' }
  if (tree[norm]) return { error: 'Já existe um arquivo ou pasta com esse caminho.' }
  const caseConflict = caseInsensitiveCollision(tree, norm)
  if (caseConflict) return { error: caseConflict }
  const ancestorConflict = ancestorCaseConflict(tree, norm)
  if (ancestorConflict) return { error: ancestorConflict }
  const conflict = parentFileConflict(tree, norm)
  if (conflict) return { error: conflict }
  const next = withParents(tree, norm)
  next[norm] = { kind: 'file', content: '' }
  return { tree: next }
}

export function addProDir(tree: ProjectTree, path: string): ProTreeResult {
  const norm = normalizeProPath(path)
  if (!norm) return { error: 'Nome de pasta inválido.' }
  if (tree[norm]) return { error: 'Já existe um arquivo ou pasta com esse caminho.' }
  const caseConflict = caseInsensitiveCollision(tree, norm)
  if (caseConflict) return { error: caseConflict }
  const ancestorConflict = ancestorCaseConflict(tree, norm)
  if (ancestorConflict) return { error: ancestorConflict }
  const conflict = parentFileConflict(tree, norm)
  if (conflict) return { error: conflict }
  const next = withParents(tree, norm)
  next[norm] = { kind: 'dir' }
  return { tree: next }
}

/** Atualiza conteúdo de um arquivo existente. No-op se igual/inexistente/dir. */
export function setProFileContent(tree: ProjectTree, path: string, content: string): ProjectTree {
  const node = tree[path]
  if (node?.kind !== 'file' || node.content === content) return tree
  return { ...tree, [path]: { kind: 'file', content } }
}

export function renameProNode(tree: ProjectTree, from: string, to: string): ProTreeResult {
  const node = tree[from]
  if (!node) return { error: 'Caminho não encontrado.' }
  const isFile = node.kind === 'file'
  const norm = normalizeProPath(to, { expectFile: isFile })
  if (!norm) return { error: 'Novo nome inválido.' }
  if (norm === from) return { tree }
  // Mover uma pasta para dentro dela mesma corromperia a árvore.
  if (!isFile && norm.startsWith(`${from}/`)) {
    return { error: 'Não dá para mover uma pasta para dentro dela mesma.' }
  }
  if (tree[norm]) return { error: 'Já existe um arquivo ou pasta com esse caminho.' }
  // Variante de caixa: ignora o PRÓPRIO nó (e subárvore) — renomear só a caixa
  // (`app.tsx` → `App.tsx`) é intencional e permitido; colidir com OUTRO nó não.
  const caseConflict = caseInsensitiveCollision(tree, norm, from)
  if (caseConflict) return { error: caseConflict }
  const ancestorConflict = ancestorCaseConflict(tree, norm, from)
  if (ancestorConflict) return { error: ancestorConflict }
  const conflict = parentFileConflict(tree, norm)
  if (conflict) return { error: conflict }

  const fromPrefix = `${from}/`
  const next: ProjectTree = {}
  // Mantém tudo que não é o nó nem sua subárvore.
  for (const [key, value] of Object.entries(tree)) {
    if (key === from || key.startsWith(fromPrefix)) continue
    next[key] = value
  }
  for (const dir of parentDirs(norm)) {
    if (!next[dir]) next[dir] = { kind: 'dir' }
  }
  next[norm] = node
  if (!isFile) {
    for (const [key, value] of Object.entries(tree)) {
      if (key.startsWith(fromPrefix)) next[norm + key.slice(from.length)] = value
    }
  }
  return { tree: next }
}

/** Remove um nó (e toda a subárvore, se pasta). No-op se inexistente. */
export function removeProNode(tree: ProjectTree, path: string): ProjectTree {
  if (!tree[path]) return tree
  const prefix = `${path}/`
  const next: ProjectTree = {}
  for (const [key, value] of Object.entries(tree)) {
    if (key === path || key.startsWith(prefix)) continue
    next[key] = value
  }
  return next
}

// --- Sanitizer anti-DoS (load) -------------------------------------------------

export interface ProTreeLimits {
  maxNodes?: number
  maxDepth?: number
  maxFileChars?: number
  maxTotalChars?: number
}

const MAX_PRO_TREE_NODES = 5000
const MAX_PRO_TREE_DEPTH = 32
const MAX_PRO_FILE_CHARS = 2_000_000
const MAX_PRO_TREE_TOTAL = 8_000_000

/**
 * Valida/normaliza uma `tree` vinda de JSON não confiável (disco/host). Retorna
 * `null` (rebaixa para classic) se: vazia, qualquer path inválido/`node_modules`,
 * estoura nós/profundidade/tamanho, ou um arquivo é pai de outro path.
 */
export function sanitizeProTree(raw: unknown, limits: ProTreeLimits = {}): ProjectTree | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const maxNodes = limits.maxNodes ?? MAX_PRO_TREE_NODES
  const maxDepth = limits.maxDepth ?? MAX_PRO_TREE_DEPTH
  const maxFileChars = limits.maxFileChars ?? MAX_PRO_FILE_CHARS
  const maxTotal = limits.maxTotalChars ?? MAX_PRO_TREE_TOTAL

  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length === 0) return null

  const out: ProjectTree = {}
  let total = 0
  let nodeCount = 0
  for (const [key, value] of entries) {
    const norm = normalizeProPath(key)
    if (!norm) return null
    if (norm.split('/').length > maxDepth) return null
    if (!value || typeof value !== 'object') return null
    const v = value as Record<string, unknown>
    if (v.kind === 'file') {
      if (typeof v.content !== 'string' || v.content.length > maxFileChars) return null
      total += v.content.length
      if (total > maxTotal) return null
      out[norm] = { kind: 'file', content: v.content }
    } else if (v.kind === 'dir') {
      out[norm] = { kind: 'dir' }
    } else {
      return null
    }
    nodeCount += 1
    if (nodeCount > maxNodes) return null
  }

  // Garante que toda pasta-pai exista como `dir` (árvore consistente).
  for (const key of Object.keys(out)) {
    for (const dir of parentDirs(key)) {
      const existing = out[dir]
      if (!existing) {
        out[dir] = { kind: 'dir' }
        nodeCount += 1
        if (nodeCount > maxNodes) return null
      } else if (existing.kind !== 'dir') {
        return null
      }
    }
  }

  // Rejeita VARIANTES DE CAIXA (o FS do WebContainer é case-insensitivo): dois
  // caminhos que só diferem na caixa — sejam irmãos explícitos (`Src/a` + `src/b`)
  // ou um ancestral materializado — colapsam num só e corrompem o sync.
  const seenLower = new Set<string>()
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase()
    if (seenLower.has(lower)) return null
    seenLower.add(lower)
  }

  return Object.keys(out).length > 0 ? out : null
}

/** Sanitiza `proMeta` do disco/host (strings curtas obrigatórias). */
export function sanitizeProMeta(raw: unknown): ProProjectMeta | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const devScript = typeof r.devScript === 'string' ? r.devScript.trim().slice(0, 80) : ''
  const templateId = typeof r.templateId === 'string' ? r.templateId.trim().slice(0, 80) : ''
  if (!devScript || !templateId) return null
  return { devScript, templateId }
}

export type { ProNode }
