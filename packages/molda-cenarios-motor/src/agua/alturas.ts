import type {
  BaseDeTerreno,
  CampoDeAlturas,
  RegiaoDoCampo,
} from '@sistemazero/molda-cenarios-core/v2'
import { DataTexture, FloatType, NearestFilter, RGBAFormat, Vector2 } from 'three'

interface Pagina {
  inicio: number
  quantidade: number
  largura: number
  altura: number
}

/** Quatro alturas por pixel RGBA; índices de vértices continuam inteiros no shader. */
export function paginarAlturasDaAgua(amostras: number, maxTextura: number): Pagina[] {
  if (
    !Number.isSafeInteger(amostras) ||
    amostras < 1 ||
    amostras > 4097 ** 2 ||
    !Number.isSafeInteger(maxTextura) ||
    maxTextura < 16 ||
    maxTextura > 32768
  )
    throw new Error('A grade ou o limite da textura de profundidade é inválido')
  const paginas: Pagina[] = []
  let inicio = 0
  while (inicio < amostras) {
    if (paginas.length === 8)
      throw new Error('A placa gráfica não comporta o mapa de profundidade deste terreno')
    const pixels = Math.min(Math.ceil((amostras - inicio) / 4), maxTextura ** 2),
      largura = Math.min(maxTextura, Math.ceil(Math.sqrt(pixels))),
      altura = Math.ceil(pixels / largura),
      quantidade = Math.min(amostras - inicio, largura * altura * 4)
    paginas.push({ inicio, quantidade, largura, altura })
    inicio += quantidade
  }
  return paginas
}

/** Dados derivados do campo carregado; uma única cópia GPU para todas as águas nativas. */
export class AlturasDaAgua {
  readonly paginas: (Pagina & { dados: Float32Array; textura: DataTexture })[]
  readonly pecas: DataTexture
  readonly dadosDasPecas: Uint8Array
  readonly uniformes: Record<string, { value: number | Vector2 | DataTexture }>
  readonly glsl: string
  private descartado = false
  private readonly integraisPendentes = new Set<DataTexture>()
  constructor(
    readonly base: BaseDeTerreno,
    campo: CampoDeAlturas,
    maxTextura: number,
    temAlturas: (coluna: number, linha: number) => boolean,
  ) {
    this.paginas = paginarAlturasDaAgua((base.colunas + 1) * (base.linhas + 1), maxTextura).map(
      (p) => {
        const dados = new Float32Array(p.largura * p.altura * 4),
          textura = new DataTexture(dados, p.largura, p.altura, RGBAFormat, FloatType)
        textura.minFilter = textura.magFilter = NearestFilter
        textura.generateMipmaps = false
        textura.needsUpdate = true
        textura.onUpdate = () => this.integraisPendentes.delete(textura)
        return { ...p, dados, textura }
      },
    )
    this.dadosDasPecas = new Uint8Array((base.colunas / 64) * (base.linhas / 64) * 4)
    this.pecas = new DataTexture(
      this.dadosDasPecas,
      base.colunas / 64,
      base.linhas / 64,
      RGBAFormat,
    )
    this.pecas.minFilter = this.pecas.magFilter = NearestFilter
    this.pecas.generateMipmaps = false
    this.uniformes = {
      mcnOrigemDoFundo: { value: new Vector2(base.origem.x, base.origem.z) },
      mcnGradeDoFundo: { value: new Vector2(base.colunas, base.linhas) },
      mcnPassoDoFundo: { value: base.passo },
      mcnFundoOmitido: { value: base.fundo },
      mcnPecasDoFundo: { value: this.pecas },
    }
    for (const [i, p] of this.paginas.entries()) {
      this.uniformes[`mcnAlturas${i}`] = { value: p.textura }
      this.uniformes[`mcnDimAlturas${i}`] = { value: new Vector2(p.largura, p.altura) }
    }
    this.glsl = `
uniform vec2 mcnOrigemDoFundo, mcnGradeDoFundo;
uniform float mcnPassoDoFundo, mcnFundoOmitido;
uniform sampler2D mcnPecasDoFundo;
${this.paginas.map((_, i) => `uniform sampler2D mcnAlturas${i}; uniform vec2 mcnDimAlturas${i};`).join('\n')}
float mcnAlturaDaAmostra(uvec2 p) {
  uint indice = p.y * (uint(mcnGradeDoFundo.x) + 1u) + p.x;
  float pixel = float(indice / 4u);
  uint canal = indice % 4u;
  vec4 valores = vec4(0.0);
  ${this.paginas
    .map((p, i) => {
      const inicio = p.inicio / 4,
        pixels = p.largura * p.altura
      return `${i ? 'else ' : ''}if (pixel < ${inicio + pixels}.0) {
      float local = pixel - ${inicio}.0;
      valores = texture2D(mcnAlturas${i}, (vec2(mod(local, mcnDimAlturas${i}.x), floor(local / mcnDimAlturas${i}.x)) + .5) / mcnDimAlturas${i});
    }`
    })
    .join('\n')}
  return canal == 0u ? valores.r : canal == 1u ? valores.g : canal == 2u ? valores.b : valores.a;
}
float mcnAlturaDoFundo(vec2 mundo) {
  vec2 q = (mundo - mcnOrigemDoFundo) / mcnPassoDoFundo;
  if (any(lessThan(q, vec2(0.0))) || any(greaterThan(q, mcnGradeDoFundo))) return mcnFundoOmitido;
  vec2 gradePecas = mcnGradeDoFundo / 64.0;
  vec2 peca = min(floor(q / 64.0), gradePecas - 1.0);
  if (texture2D(mcnPecasDoFundo, (peca + .5) / gradePecas).r < .5) return mcnFundoOmitido;
  vec2 celula = min(floor(q), mcnGradeDoFundo - 1.0), uv = q - celula;
  uvec2 c = uvec2(celula);
  float a = mcnAlturaDaAmostra(c), b = mcnAlturaDaAmostra(c + uvec2(1u, 0u));
  float e = mcnAlturaDaAmostra(c + uvec2(0u, 1u)), d = mcnAlturaDaAmostra(c + uvec2(1u, 1u));
  return uv.x + uv.y <= 1.0 ? a + (b - a) * uv.x + (e - a) * uv.y : d + (e - d) * (1.0 - uv.x) + (b - d) * (1.0 - uv.y);
}`
    this.atualizar(campo)
    this.definirPecas(temAlturas)
  }

  atualizar(campo: CampoDeAlturas, regiao?: RegiaoDoCampo | null) {
    if (this.descartado) return
    if (
      campo.colunas !== this.base.colunas ||
      campo.linhas !== this.base.linhas ||
      campo.alturas.length !== (campo.colunas + 1) * (campo.linhas + 1)
    )
      throw new Error('O campo não corresponde ao mapa de profundidade aberto')
    if (regiao === null) return
    if (regiao === undefined) {
      for (const p of this.paginas) {
        p.dados.set(campo.alturas.subarray(p.inicio, p.inicio + p.quantidade))
        p.textura.clearUpdateRanges()
        this.integraisPendentes.add(p.textura)
        p.textura.needsUpdate = true
      }
      return
    }
    const x0 = Math.max(0, Math.floor(regiao?.x0 ?? 0)),
      z0 = Math.max(0, Math.floor(regiao?.z0 ?? 0)),
      x1 = Math.min(campo.colunas, Math.ceil(regiao?.x1 ?? campo.colunas)),
      z1 = Math.min(campo.linhas, Math.ceil(regiao?.z1 ?? campo.linhas)),
      largura = campo.colunas + 1
    for (let z = z0; z <= z1; z++) {
      let inicio = z * largura + x0,
        falta = x1 - x0 + 1
      while (falta > 0) {
        const p = this.paginas.find((p) => inicio >= p.inicio && inicio < p.inicio + p.quantidade)
        if (!p) throw new Error('Falta uma página do mapa de profundidade')
        const local = inicio - p.inicio,
          componentesPorLinha = p.largura * 4,
          n = Math.min(
            falta,
            p.quantidade - local,
            componentesPorLinha - (local % componentesPorLinha),
          )
        p.dados.set(campo.alturas.subarray(inicio, inicio + n), local)
        // O Three instalado envia sub-regiões RGBA de uma linha. Alinha aos pixels para
        // conservar também os canais vizinhos de uma altura que começa no meio do pixel.
        const de = Math.floor(local / 4) * 4,
          ate = Math.ceil((local + n) / 4) * 4
        if (!this.integraisPendentes.has(p.textura)) p.textura.addUpdateRange(de, ate - de)
        p.textura.needsUpdate = true
        inicio += n
        falta -= n
      }
    }
  }

  definirPecas(temAlturas: (coluna: number, linha: number) => boolean) {
    if (this.descartado) return
    const dados = this.dadosDasPecas
    let mudou = false
    for (let z = 0; z < this.base.linhas / 64; z++)
      for (let x = 0; x < this.base.colunas / 64; x++) {
        const i = (z * (this.base.colunas / 64) + x) * 4,
          valor = temAlturas(x, z) ? 255 : 0
        if (dados[i] !== valor) {
          dados[i] = valor
          mudou = true
        }
      }
    if (mudou || this.pecas.version === 0) this.pecas.needsUpdate = true
  }

  descartar() {
    if (this.descartado) return
    this.descartado = true
    for (const p of this.paginas) p.textura.dispose()
    this.pecas.dispose()
  }
}
