import { type AparenciaDaAgua, AparenciaDaAguaSchema } from '@sistemazero/molda-cenarios-core/v2'
import { Color, DoubleSide, MeshStandardMaterial } from 'three'
import type { AlturasDaAgua } from './alturas'

const suave = (t: number) => {
  const u = Math.max(0, Math.min(1, t))
  return u * u * (3 - 2 * u)
}

export interface ContextoDoMaterialDeAgua {
  fundo: AlturasDaAgua | null
  plano?: number
  profundidade: number
  movimento?: 'horizontal' | 'rio' | 'queda'
  largura?: number
  correnteza?: number
  profundidadePorVertice?: boolean
}

/** Material pronto e iluminado: ondas na normal, profundidade e espuma, sem alterar o nado. */
export class MaterialDaAgua {
  /** Albedo linear/alpha no instante zero, antes da iluminação. Não altera o nado. */
  readonly amostrarEstatico: (
    ponto: { x: number; y: number; z: number },
    uvY: number,
    profundidadeDoModelo: number | undefined,
    saida: Float64Array,
  ) => void
  readonly material = new MeshStandardMaterial({
    transparent: true,
    depthWrite: false,
    roughness: 0.28,
    metalness: 0.06,
    side: DoubleSide,
  })
  private readonly aparencia: AparenciaDaAgua
  private readonly tempo = { value: 0 }
  private descartado = false
  readonly animado: boolean
  constructor(
    aparencia: AparenciaDaAgua | undefined,
    {
      fundo,
      plano,
      profundidade,
      movimento = 'horizontal',
      largura = 1,
      correnteza = 0,
      profundidadePorVertice = false,
    }: ContextoDoMaterialDeAgua,
  ) {
    this.aparencia = AparenciaDaAguaSchema.parse(aparencia ?? {})
    const a = this.aparencia
    const rasa = new Color(a.corRasa),
      profunda = new Color(a.corProfunda),
      espuma = new Color(a.espuma.cor)
    this.amostrarEstatico = (p, uvY, porVertice, saida) => {
      if (this.descartado) throw Error('O material da água já foi descartado.')
      if (saida.length < 4 || ![p.x, p.y, p.z, uvY].every(Number.isFinite))
        throw Error('A amostra estática da água é inválida.')
      if (!fundo && plano === undefined && profundidadePorVertice && !Number.isFinite(porVertice))
        throw Error('Falta a profundidade da superfície de água do modelo.')
      const h = fundo
          ? Math.max(0, p.y - fundo.alturaEm(p.x, p.z))
          : plano !== undefined
            ? Math.max(0, p.y - plano)
            : profundidadePorVertice
              ? Math.max(0, porVertice!)
              : profundidade,
        mistura = 1 - Math.exp(-h / a.profundidadeDeCor),
        forcaEspuma =
          a.espuma.largura > 0 ? (1 - suave(h / a.espuma.largura)) * a.espuma.intensidade : 0,
        fios = movimento === 'queda' ? 0.94 + 0.06 * Math.sin(uvY * largura * 7) : 1
      if (!Number.isFinite(h) || h < 0)
        throw Error('A profundidade da amostra estática é inválida.')
      for (let c = 0; c < 3; c++) {
        const chave = c === 0 ? 'r' : c === 1 ? 'g' : 'b',
          cor = rasa[chave] + (profunda[chave] - rasa[chave]) * mistura
        saida[c] = (cor + (espuma[chave] - cor) * forcaEspuma) * fios
      }
      saida[3] =
        h <= 0.001
          ? 0
          : this.material.opacity *
            (a.opacidadeRasa + (a.opacidadeProfunda - a.opacidadeRasa) * mistura) *
            suave(h / 0.04) *
            fios
    }
    this.animado =
      (a.ondas.altura > 0 && (a.ondas.velocidade > 0 || correnteza > 0)) || movimento === 'queda'
    const cabecalho = `
varying vec3 vMcnAguaMundo;
varying vec2 vMcnAguaUv;
${profundidadePorVertice ? 'varying float vMcnProfundidadeModelo;' : ''}
uniform float mcnTempoAgua, mcnProfundidadeAgua, mcnEscalaDeCor, mcnOpacidadeRasa, mcnOpacidadeProfunda;
uniform vec3 mcnAguaRasa, mcnAguaProfunda, mcnCorEspuma;
uniform float mcnAlturaOnda, mcnComprimentoOnda, mcnVelocidadeOnda, mcnLarguraEspuma, mcnForcaEspuma;
uniform float mcnCorrentezaAgua, mcnLarguraAgua, mcnPlanoDoFundo;
${fundo?.glsl ?? ''}
`
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, fundo?.uniformes, {
        mcnTempoAgua: this.tempo,
        mcnProfundidadeAgua: { value: profundidade },
        mcnEscalaDeCor: { value: a.profundidadeDeCor },
        mcnOpacidadeRasa: { value: a.opacidadeRasa },
        mcnOpacidadeProfunda: { value: a.opacidadeProfunda },
        mcnAguaRasa: { value: rasa },
        mcnAguaProfunda: { value: profunda },
        mcnCorEspuma: { value: espuma },
        mcnLarguraEspuma: { value: a.espuma.largura },
        mcnForcaEspuma: { value: a.espuma.intensidade },
        mcnAlturaOnda: { value: a.ondas.altura },
        mcnComprimentoOnda: { value: a.ondas.comprimento },
        mcnVelocidadeOnda: { value: a.ondas.velocidade },
        mcnCorrentezaAgua: { value: correnteza },
        mcnLarguraAgua: { value: largura },
        mcnPlanoDoFundo: { value: plano ?? 0 },
      })
      shader.vertexShader =
        'varying vec3 vMcnAguaMundo; varying vec2 vMcnAguaUv;\n' +
        (profundidadePorVertice
          ? 'attribute float mcnProfundidadeModelo; varying float vMcnProfundidadeModelo;\n'
          : '') +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvMcnAguaMundo = (modelMatrix * vec4(position, 1.0)).xyz; vMcnAguaUv = uv;' +
            (profundidadePorVertice ? 'vMcnProfundidadeModelo = mcnProfundidadeModelo;' : ''),
        )
      shader.fragmentShader = cabecalho + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
float mcnProfundidade = ${fundo ? 'max(0.0, vMcnAguaMundo.y - mcnAlturaDoFundo(vMcnAguaMundo.xz))' : plano !== undefined ? 'max(0.0, vMcnAguaMundo.y - mcnPlanoDoFundo)' : profundidadePorVertice ? 'max(0.0, vMcnProfundidadeModelo)' : 'mcnProfundidadeAgua'};
if (mcnProfundidade <= 0.001) discard;
float mcnMistura = 1.0 - exp(-mcnProfundidade / mcnEscalaDeCor);
float mcnEspuma = mcnLarguraEspuma > 0.0 ? (1.0 - smoothstep(0.0, mcnLarguraEspuma, mcnProfundidade)) * mcnForcaEspuma : 0.0;
diffuseColor.rgb = mix(mix(mcnAguaRasa, mcnAguaProfunda, mcnMistura), mcnCorEspuma, mcnEspuma);
diffuseColor.a *= mix(mcnOpacidadeRasa, mcnOpacidadeProfunda, mcnMistura);
diffuseColor.a *= smoothstep(0.0, 0.04, mcnProfundidade);
${movimento === 'queda' ? 'float mcnFiosDaQueda = .94 + .06 * sin(vMcnAguaUv.y * mcnLarguraAgua * 7.0 - mcnTempoAgua * max(1.0, mcnVelocidadeOnda) * 7.0); diffuseColor.rgb *= mcnFiosDaQueda; diffuseColor.a *= mcnFiosDaQueda;' : ''}
`,
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
#include <normal_fragment_maps>
vec2 mcnPonto = ${movimento === 'horizontal' ? 'vMcnAguaMundo.xz / mcnComprimentoOnda' : `vec2(vMcnAguaUv.x * mcnLarguraAgua, vMcnAguaUv.y * mcnLarguraAgua - mcnTempoAgua * ${movimento === 'queda' ? 'max(1.0, mcnVelocidadeOnda)' : 'mcnCorrentezaAgua'}) / mcnComprimentoOnda`};
float mcnFase = mcnTempoAgua * mcnVelocidadeOnda;
vec3 mcnOndas = vec3(cos(mcnPonto.x * 6.28318 + mcnFase), 0.0, sin(mcnPonto.y * 5.1 - mcnFase * .73));
normal = normalize(normal + (viewMatrix * vec4(mcnOndas * mcnAlturaOnda * 2.0, 0.0)).xyz * (gl_FrontFacing ? 1.0 : -1.0));
`,
      )
    }
    this.material.customProgramCacheKey = () =>
      `mcn-agua-v2-${fundo?.paginas.map((p) => `${p.inicio}:${p.largura}:${p.altura}`).join('/') ?? 'sem-mapa'}-${plano !== undefined ? 'plano' : 'sem-plano'}-${profundidadePorVertice ? 'modelo' : 'sem-modelo'}-${movimento}`
  }
  atualizar(segundos: number, movimentoReduzido: boolean) {
    if (!this.descartado && Number.isFinite(segundos))
      this.tempo.value = movimentoReduzido ? 0 : segundos
  }
  descartar() {
    if (this.descartado) return
    this.descartado = true
    this.material.dispose()
  }
}
