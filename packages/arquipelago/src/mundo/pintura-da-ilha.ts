import type { Ilha, IlhaId } from '@sistemazero/arquipelago-contracts'
import { QUADROS_POR_ILHA } from '@sistemazero/arquipelago-contracts'
import { type Color, type Material, Vector2 } from 'three'
import { BORDA_DOS_PEDACOS, COR_AO_ABRIR } from '../sistemas/cor-da-ilha'
import { centroNoAnel, giroDaIlha } from './medidas'
import { CINZA } from './modelos'

/**
 * A tinta das ilhas do anel, feita no shader: cada ponto da ilha descobre em que pedaço está (o
 * ângulo em volta do centro, no referencial do modelo) e sai do cinza conforme o valor daquele
 * pedaço (`sistemas/cor-da-ilha.ts`). Os valores são uniforms divididos por todos os materiais da
 * ilha (a leve, a completa e as cópias transparentes das copas): mudar um número pinta tudo junto.
 */
export interface PinturaDaIlha {
  uniforms: {
    uArqPedacos: { value: number[] }
    uArqChegada: { value: number }
    uArqBase: { value: number }
    uArqCentro: { value: Vector2 }
    uArqGiro: { value: number }
    uArqCinza: { value: Color }
    uArqBorda: { value: number }
  }
}

const pinturas = new Map<IlhaId, PinturaDaIlha>()

/** A tinta da ilha (uma por ilha, criada na primeira vez): começa cinza. */
export function pinturaDaIlha(ilha: Ilha): PinturaDaIlha {
  const feita = pinturas.get(ilha.id)
  if (feita) return feita
  const centro = centroNoAnel(ilha)
  const nova: PinturaDaIlha = {
    uniforms: {
      uArqPedacos: { value: Array.from({ length: QUADROS_POR_ILHA }, () => 0) },
      uArqChegada: { value: 0 },
      uArqBase: { value: COR_AO_ABRIR },
      uArqCentro: { value: new Vector2(centro.x, centro.z) },
      uArqGiro: { value: giroDaIlha(ilha) },
      uArqCinza: { value: CINZA.clone() },
      uArqBorda: { value: BORDA_DOS_PEDACOS },
    },
  }
  pinturas.set(ilha.id, nova)
  return nova
}

const CABECALHO_DO_VERTICE = /* glsl */ `
varying vec3 vArqMundo;
`

const DEPOIS_DO_VERTICE = /* glsl */ `
#include <project_vertex>
{
  vec4 arqP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    arqP = instanceMatrix * arqP;
  #endif
  vArqMundo = (modelMatrix * arqP).xyz;
}
`

const CABECALHO_DO_FRAGMENTO = /* glsl */ `
varying vec3 vArqMundo;
uniform float uArqPedacos[${QUADROS_POR_ILHA}];
uniform float uArqChegada;
uniform float uArqBase;
uniform vec2 uArqCentro;
uniform float uArqGiro;
uniform vec3 uArqCinza;
uniform float uArqBorda;

float arqPedaco(float i) {
  return uArqPedacos[int(mod(i, ${QUADROS_POR_ILHA}.0))];
}

// O quanto este ponto tem de cor (0 cinza, 1 a cor do arquivo).
float arqPinta() {
  vec2 d = vArqMundo.xz - uArqCentro;
  float c = cos(uArqGiro);
  float s = sin(uArqGiro);
  vec2 l = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  float t = atan(l.y, l.x) / (6.2831853 / ${QUADROS_POR_ILHA}.0) + 0.5;
  float i = floor(t);
  float f = t - i;
  float v = arqPedaco(i);
  // As bordas misturam com o vizinho (metade a metade em cima da linha): sem degrau.
  v = mix(v, arqPedaco(i + 1.0), 0.5 * smoothstep(1.0 - uArqBorda, 1.0, f));
  v = mix(v, arqPedaco(i - 1.0), 0.5 * (1.0 - smoothstep(0.0, uArqBorda, f)));
  // Bem no meio da ilha as fatias se encontram: ali vale a média, para não virar um cata-vento.
  float media = 0.0;
  for (int k = 0; k < ${QUADROS_POR_ILHA}; k++) media += uArqPedacos[k];
  media /= ${QUADROS_POR_ILHA}.0;
  v = mix(media, v, smoothstep(0.6, 2.8, length(l)));
  return uArqChegada * (uArqBase + (1.0 - uArqBase) * v);
}
`

const COR = /* glsl */ `
#include <color_fragment>
diffuseColor.rgb = mix(uArqCinza, diffuseColor.rgb, arqPinta());
`

const BRILHO = /* glsl */ `
#include <emissivemap_fragment>
totalEmissiveRadiance *= arqPinta();
`

const marcados = new WeakSet<Material>()

/**
 * Liga a tinta da ilha nos materiais (uma vez por material; a cor do arquivo fica no material e o
 * cinza vem do shader). Cópia feita depois com `clone()` precisa passar por aqui de novo.
 */
export function pintarMateriais(materiais: readonly Material[], pintura: PinturaDaIlha): void {
  for (const m of materiais) {
    if (marcados.has(m)) continue
    marcados.add(m)
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, pintura.uniforms)
      shader.vertexShader =
        CABECALHO_DO_VERTICE +
        shader.vertexShader.replace('#include <project_vertex>', DEPOIS_DO_VERTICE)
      shader.fragmentShader = (CABECALHO_DO_FRAGMENTO + shader.fragmentShader)
        .replace('#include <color_fragment>', COR)
        .replace('#include <emissivemap_fragment>', BRILHO)
    }
    m.customProgramCacheKey = () => 'arq-pintura-1'
    m.needsUpdate = true
  }
}
