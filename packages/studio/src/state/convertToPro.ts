import type { Project, ProjectTree } from '#core'
import { PRO_TEMPLATES } from '../components/code/pro-templates'
import { buildClassicFileMap } from '../export/fileMap'
import { identityMinifiers } from '../export/minify'

const PUBLIC_PREFIX = 'public/'

/**
 * Converte um projeto BÁSICO (3 arquivos + extras + extensões) numa ÁRVORE Vite
 * pronta pro modo profissional (graduação do D2). Reaproveita o build clássico
 * do export (SEM minificar — é código-fonte que o aluno vai editar) para gerar o
 * index.html de produção + os assets, e os encaixa num esqueleto Vite vanilla-ts.
 *
 * O index.html fica na RAIZ (entrada do Vite) e os assets em `public/`. As
 * referências (style.css, script.js, sz-ext/*.js…) viram ABSOLUTAS (/style.css)
 * para o `vite build` tratá-las como estáticos do public e não tentar empacotar
 * um `<script>` clássico (que ele não sabe bundlar).
 */
export async function convertClassicToProTree(project: Project): Promise<ProjectTree> {
  const tree: ProjectTree = {}

  // Config do Vite vanilla (package.json/vite.config.ts/tsconfig.json). Não
  // copiamos o index.html nem o src/ do template — usamos os arquivos do aluno.
  const template = PRO_TEMPLATES['vanilla-vite']
  if (template) {
    for (const [path, node] of Object.entries(template.tree)) {
      if (path === 'index.html' || path === 'src' || path.startsWith('src/')) continue
      tree[path] = { ...node }
    }
  }

  // Só os arquivos importam aqui; os avisos do build clássico (extra que não
  // compilou, esm.sh, JS 3D inline) pertencem ao fluxo de EXPORT, não à
  // graduação para pro — a árvore pro reusa apenas os artefatos.
  const { files: assets } = await buildClassicFileMap(project, identityMinifiers)
  const assetNames = Object.keys(assets)
    .filter((p) => p.startsWith(PUBLIC_PREFIX) && p !== `${PUBLIC_PREFIX}index.html`)
    .map((p) => p.slice(PUBLIC_PREFIX.length))

  let indexHtml = asString(assets[`${PUBLIC_PREFIX}index.html`])
  for (const name of assetNames) {
    // href/src="style.css" | "./style.css" | "/style.css" → "/style.css"
    indexHtml = indexHtml.replace(
      new RegExp(`(href|src)="\\.?/?${escapeRegExp(name)}"`, 'g'),
      `$1="/${name}"`,
    )
  }
  tree['index.html'] = { kind: 'file', content: indexHtml }

  for (const [path, content] of Object.entries(assets)) {
    if (path === `${PUBLIC_PREFIX}index.html`) continue
    // Assets BINÁRIOS (imagens como bytes, novos no export) ficam de fora: a
    // árvore pro só guarda TEXTO (decodá-los como UTF-8 corromperia o PNG). No
    // pro as imagens seguem chegando pelo sz-assets.js (data:URLs), como antes.
    if (typeof content !== 'string') continue
    tree[path] = { kind: 'file', content }
  }

  return ensureDirNodes(tree)
}

function asString(content: string | Uint8Array | undefined): string {
  if (content == null) return ''
  return typeof content === 'string' ? content : new TextDecoder().decode(content)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Garante um nó de pasta explícito para cada diretório ancestral (ProjectTree). */
function ensureDirNodes(tree: ProjectTree): ProjectTree {
  const out: ProjectTree = { ...tree }
  for (const path of Object.keys(tree)) {
    const segments = path.split('/')
    for (let i = 1; i < segments.length; i += 1) {
      const dir = segments.slice(0, i).join('/')
      if (!out[dir]) out[dir] = { kind: 'dir' }
    }
  }
  return out
}
