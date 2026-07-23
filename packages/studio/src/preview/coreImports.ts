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
 *
 * ⚠️ CDN NOVA aqui = decisão de segurança (abre origem no `script-src` de TODO
 * preview). GSAP e afins ficam FORA por decisão — o equivalente "na unha" é
 * ensinado (lerp/lerpColors + dt). O que roda × o que não roda no preview está
 * em `docs/canvas3d-preview-limits.md` (DRACO, pointer lock, gamepad, fetch…).
 */

import { THREE_ADDONS_CDN, THREE_CDN } from '../three/threeRuntimeContract'

export { THREE_ADDONS_CDN, THREE_CDN }

/**
 * Prefixo dos "addons" oficiais do three (`three/addons/loaders/GLTFLoader.js`
 * etc.) → os `examples/jsm/` do mesmo pacote no esm.sh. É um mapeamento de PREFIXO
 * (chave com barra final) no importmap, então `three/addons/x/Y.js` resolve para
 * `…/examples/jsm/x/Y.js`. Mesma origem do `three` base → nada novo na CSP.
 */
/**
 * Especificador exato `three` (não `three/addons/…`, tratado à parte). `\s*` (não `\s+`)
 * tolera `from'three'` sem espaço — JS válido que o gerador não emite, mas código escrito
 * à mão na Ponte/modo PRO pode. ⚠️ Varre a fonte CRUA: o literal `from 'three'` num
 * comentário/string de um projeto 2D liga o importmap à toa (inócuo — entrada não usada).
 */
const IMPORTS_THREE = /from\s*['"]three['"]/
/** Qualquer import de addon (`from 'three/addons/…'`); mesma tolerância de espaço. */
const IMPORTS_THREE_ADDONS = /from\s*['"]three\/addons\//

/** Os imports de núcleo que o código gerado exige (three.js + addons). */
export function coreImportsForCode(js: unknown): Record<string, string> {
  if (typeof js !== 'string' || !js) return {}
  const imports: Record<string, string> = {}
  if (IMPORTS_THREE.test(js)) imports.three = THREE_CDN
  if (IMPORTS_THREE_ADDONS.test(js)) {
    // Os addons importam o `three` base internamente → sempre mapeie os dois.
    imports.three = THREE_CDN
    imports['three/addons/'] = THREE_ADDONS_CDN
  }
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
