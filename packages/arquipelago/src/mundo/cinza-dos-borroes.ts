import { type Material, Vector2, Vector4 } from 'three'
import { MANCHA_DO_BORRAO } from '../sistemas/borroes'
import { CINZA } from './modelos'

/**
 * O Cinza que os borrões espalham em volta (a proposta: "à noite, borrões de névoa saem para
 * desbotar o que está do lado de fora"; lacunas de 01/11/2026). Além da mancha no chão, cada borrão
 * solto tira a cor de tudo o que está perto dele (o chão, as árvores, a casa, o píer, as peças da
 * ilha), no shader: perto do borrão a cor vai para o cinza e volta aos poucos até
 * `RAIO_DO_CINZA`. Prendê-lo com a lanterna devolve a cor junto com a mancha. Sem dano.
 *
 * No máximo `BORROES_A_VISTA` de uma vez: dois por noite na sua ilha e dois na ilha do anel aberta.
 */
export const BORROES_A_VISTA = 4
/** Até onde o borrão desbota (m). */
export const RAIO_DO_CINZA = MANCHA_DO_BORRAO.raio * 1.9
/** Quanto da cor some bem no meio, com o borrão solto há tempo (0 a 1). */
export const FORCA_DO_CINZA = 0.85

/** Cada vaga: x e z do borrão no mundo, o raio e a força agora (0 é vaga livre). */
const vagas = Array.from({ length: BORROES_A_VISTA }, () => new Vector4(0, 0, 0, 0))
const donos: (string | null)[] = Array.from({ length: BORROES_A_VISTA }, () => null)
const uniforms = { uArqBorroes: { value: vagas }, uArqCinzaDosBorroes: { value: CINZA } }

/**
 * O borrão `id` está em (x, z) com `forca` de 0 a 1 (a mancha crescendo, presa ou sumindo). Sem
 * vaga livre, ele não desbota (a mancha no chão continua).
 */
export function marcarBorrao(id: string, x: number, z: number, forca: number): void {
  let i = donos.indexOf(id)
  if (i < 0) {
    if (forca <= 0) return
    i = donos.indexOf(null)
    if (i < 0) return
    donos[i] = id
  }
  vagas[i]!.set(x, z, RAIO_DO_CINZA, Math.max(0, Math.min(1, forca)) * FORCA_DO_CINZA)
}

/** O borrão saiu (virou Lumi, amanheceu ou a ilha descarregou): a vaga fica livre. */
export function soltarBorrao(id: string): void {
  const i = donos.indexOf(id)
  if (i < 0) return
  donos[i] = null
  vagas[i]!.set(0, 0, 0, 0)
}

/** Quanto de cor sobra em cada ponto do mundo (para os testes e o medidor). */
export function corQueSobra(x: number, z: number): number {
  let sobra = 1
  for (const v of vagas) {
    if (v.z <= 0 || v.w <= 0) continue
    const d = Math.hypot(x - v.x, z - v.y)
    const t = Math.min(1, Math.max(0, (d - v.z * 0.3) / (v.z * 0.7)))
    const perto = 1 - t * t * (3 - 2 * t)
    sobra *= 1 - v.w * perto
  }
  return sobra
}

const VERTICE = /* glsl */ `
#include <project_vertex>
{
  vec4 arqBp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    arqBp = instanceMatrix * arqBp;
  #endif
  vArqBorraoMundo = (modelMatrix * arqBp).xyz;
}
`

const FRAGMENTO = /* glsl */ `
varying vec3 vArqBorraoMundo;
uniform vec4 uArqBorroes[${BORROES_A_VISTA}];
uniform vec3 uArqCinzaDosBorroes;
uniform vec2 uArqDesbotado;
float arqCorQueSobra() {
  float sobra = 1.0;
  for (int k = 0; k < ${BORROES_A_VISTA}; k++) {
    vec4 b = uArqBorroes[k];
    if (b.z <= 0.0 || b.w <= 0.0) continue;
    float d = length(vArqBorraoMundo.xz - b.xy);
    sobra *= 1.0 - b.w * (1.0 - smoothstep(b.z * 0.3, b.z, d));
  }
  return sobra;
}
`

const COR = /* glsl */ `
#include <color_fragment>
if (uArqDesbotado.x > 0.0 || uArqDesbotado.y > 0.0) {
  float arqVerde = smoothstep(-0.03, 0.03, diffuseColor.g - diffuseColor.r);
  float arqQuanto = mix(uArqDesbotado.y, uArqDesbotado.x, arqVerde);
  float arqLuz = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) * 0.85;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(arqLuz) * vec3(0.94, 0.97, 1.0), arqQuanto);
}
diffuseColor.rgb = mix(uArqCinzaDosBorroes, diffuseColor.rgb, arqCorQueSobra());
`

const marcados = new WeakSet<Material>()
const desbotados = new WeakMap<Material, { value: Vector2 }>()

/**
 * O desbotado inteiro do material (lacunas, 01/11/2026: a cor da sua ilha por quadro, no chão que
 * tem a cor nos vértices): x para o que é verde (o gramado), y para o resto (a areia, as pedras);
 * 0 com cor, até `QUANTO_DESBOTADO`. Só vale no material ligado por `desbotarPelosBorroes`.
 */
export function desbotadoDoMaterial(m: Material): { value: Vector2 } {
  let u = desbotados.get(m)
  if (!u) {
    u = { value: new Vector2(0, 0) }
    desbotados.set(m, u)
  }
  return u
}

/**
 * Liga o Cinza dos borrões nos materiais (uma vez por material, encadeado com o que já houver, como
 * a tinta das ilhas e o vento da vegetação).
 */
export function desbotarPelosBorroes(materiais: readonly Material[]): void {
  for (const m of materiais) {
    if (marcados.has(m)) continue
    marcados.add(m)
    const anterior = m.onBeforeCompile
    const chave = m.customProgramCacheKey.bind(m)
    m.onBeforeCompile = (shader, renderer) => {
      anterior.call(m, shader, renderer)
      Object.assign(shader.uniforms, uniforms, { uArqDesbotado: desbotadoDoMaterial(m) })
      shader.vertexShader = `varying vec3 vArqBorraoMundo;\n${shader.vertexShader.replace('#include <project_vertex>', VERTICE)}`
      shader.fragmentShader = (FRAGMENTO + shader.fragmentShader).replace(
        '#include <color_fragment>',
        COR,
      )
    }
    m.customProgramCacheKey = () => `${chave()}|arq-borroes-2`
    m.needsUpdate = true
  }
}
