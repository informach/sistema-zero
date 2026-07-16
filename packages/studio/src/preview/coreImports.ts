/**
 * Imports ESM do NÚCLEO (não-extensão) para o preview. Hoje só o three.js, usado
 * pela categoria Canvas 3D: quando o código do aluno importa `three`
 * (`import * as THREE from 'three'`), o preview precisa de uma entrada no importmap
 * mapeando `three` para o CDN — igual as extensões 3D fazem via `esmImports`, mas
 * aqui disparado por um bloco do NÚCLEO, sem extensão instalada.
 *
 * ⭐ LAZY por construção: a detecção é no CÓDIGO GERADO (`from 'three'`), então um
 * projeto 2D (sem esse import) devolve `{}` — nenhum importmap, nenhum custo. E a
 * MESMA URL pinada das extensões (importmaps colapsam se um jogo 3D coexistir).
 *
 * A infra de preview (`buildPreviewDoc` + `csp.ts`) já é genérica: transforma
 * qualquer mapa em `<script type="importmap">` + abre a origem no `script-src`.
 * three entra por importmap (não por fetch) → sem permissão de rede, sem CSP nova.
 */

/** MESMA URL das extensões game-3d/game-3d-advanced (importmaps colapsam). */
export const THREE_CDN = 'https://esm.sh/three@0.180.0'

/** Especificador exato `three` (não `three/addons/…`, que é Fase 2). */
const IMPORTS_THREE = /from\s+['"]three['"]/

/** Os imports de núcleo que o código gerado exige (hoje: só three.js). */
export function coreImportsForCode(js: unknown): Record<string, string> {
  if (typeof js !== 'string' || !js) return {}
  const imports: Record<string, string> = {}
  if (IMPORTS_THREE.test(js)) imports.three = THREE_CDN
  return imports
}

/**
 * Combina os imports das extensões instaladas com os do NÚCLEO detectados no
 * código. Devolve o MESMO objeto quando não há import de núcleo (sem alocação p/
 * o caso 2D comum) — o núcleo tem prioridade se houver conflito de chave.
 */
export function withCoreImports(
  extensionImports: Record<string, string>,
  js: unknown,
): Record<string, string> {
  const core = coreImportsForCode(js)
  return Object.keys(core).length > 0 ? { ...extensionImports, ...core } : extensionImports
}
