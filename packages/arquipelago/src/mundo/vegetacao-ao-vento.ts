import { type Material, type Scene, Vector3 } from 'three'
import { VENTO_GLSL } from '../sistemas/vento'

export const ventoAgora = {
  tempo: 0,
  forca: 0,
  materiais: 0,
  escalaVisual: 1,
  qualidadeAplicada: 1,
}
/** Isolado por cena. Não altera os cálculos de vento usados pela física das cordas. */
export const qualidadeDaVegetacao = new WeakMap<Scene, number>()

/** Uniforms compartilhados pelas cópias opacas e transparentes. Só a ilha ativa os atualiza. */
export function prepararVegetacao(materiais: readonly Material[]) {
  const uniforms = {
    arqTempoVento: { value: 0 },
    arqForcaVento: { value: 0.45 },
    arqMenosMovimento: { value: 1 },
    arqQualidadeVento: { value: 1 },
    arqPessoaVento: { value: new Vector3(0, -100, 0) },
  }
  let quantidade = 0
  for (const m of materiais) {
    const folha = /copa|ipe|tufo|folha|moita|capim/i.test(m.name)
    const galho = /troncoGrande/i.test(m.name)
    if (!folha && !galho) continue
    quantidade++
    const anterior = m.onBeforeCompile,
      chave = m.customProgramCacheKey()
    const antesDeDesenhar = m.onBeforeRender
    m.onBeforeRender = function (renderer, scene, camera, geometry, object, group) {
      antesDeDesenhar.call(this, renderer, scene, camera, geometry, object, group)
      uniforms.arqQualidadeVento.value = qualidadeDaVegetacao.get(scene) ?? 1
      ventoAgora.qualidadeAplicada = uniforms.arqQualidadeVento.value
    }
    m.onBeforeCompile = (shader, renderer) => {
      anterior.call(m, shader, renderer)
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = `uniform float arqTempoVento, arqForcaVento, arqMenosMovimento, arqQualidadeVento;
uniform vec3 arqPessoaVento;
${VENTO_GLSL}\n${shader.vertexShader}`
      // Antes da projeção: a pintura continua lendo a posição já deformada.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
if (arqQualidadeVento > 0.0) {
vec3 arqPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
float arqAltura = max(0.0, arqPos.y - 1.0);
float arqPesoVento = ${galho ? 'smoothstep(4.0, 12.0, arqAltura) * 0.06' : 'min(arqAltura, 1.0) * 0.14 + min(arqAltura / 12.0, 1.0) * 0.12'};
vec2 arqDesvio = arqVento(arqPos.xz, arqTempoVento, arqForcaVento) * arqPesoVento;
vec2 arqDaPessoa = arqPos.xz - arqPessoaVento.xz;
float arqPerto = 1.0 - smoothstep(0.1, 1.1, length(arqDaPessoa));
float arqBaixo = (1.0 - smoothstep(1.5, 2.5, arqAltura)) * min(arqAltura, 1.0);
arqDesvio += arqDaPessoa / max(0.15, length(arqDaPessoa)) * arqPerto * arqBaixo * 0.3 * (1.0 - smoothstep(1.0, 2.0, abs(arqPos.y - arqPessoaVento.y)));
vec3 arqDesvioMundo = vec3(arqDesvio.x, 0.0, arqDesvio.y) * arqMenosMovimento * arqQualidadeVento;
transformed += vec3(dot(modelMatrix[0].xyz, arqDesvioMundo) / dot(modelMatrix[0].xyz, modelMatrix[0].xyz), dot(modelMatrix[1].xyz, arqDesvioMundo) / dot(modelMatrix[1].xyz, modelMatrix[1].xyz), dot(modelMatrix[2].xyz, arqDesvioMundo) / dot(modelMatrix[2].xyz, modelMatrix[2].xyz));
}
#include <project_vertex>`,
      )
    }
    m.customProgramCacheKey = () => `${chave}:vento-2:${galho}`
    m.needsUpdate = true
  }
  return { uniforms, quantidade }
}
