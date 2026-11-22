import {
  alturaDoChao,
  type CaixaDeRegiao,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  type RegiaoDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Sprite,
  SpriteMaterial,
} from 'three'

/** Quanto a borda fica acima do chão (não some dentro do relevo nem pisca com ele). */
const ACIMA_DO_CHAO = 0.15
/** Distância máxima entre dois pontos da borda: ela acompanha morros e vales. */
const PASSO_DA_BORDA = 2
/** Teto de pontos por borda (uma região de 1 km com passo de 2 m cabe com folga). */
const MAX_PONTOS_POR_LADO = 512
const CORES = ['#ae83ed', '#3ccf91', '#efbb52', '#65b9ee', '#ed9b73', '#69c7d7', '#f27fb2']

/**
 * Os segmentos da borda de uma região, no mundo: os quatro lados divididos a cada 2 m (no máximo),
 * cada ponto na altura do chão mais 15 cm. Puro: o palco desenha, o teste confere.
 */
export function bordaDaRegiao(
  caixa: CaixaDeRegiao,
  altura: (x: number, z: number) => number,
): Float32Array {
  const cantos = [
    [caixa.x0, caixa.z0],
    [caixa.x1, caixa.z0],
    [caixa.x1, caixa.z1],
    [caixa.x0, caixa.z1],
  ] as const
  const dados: number[] = []
  for (let lado = 0; lado < 4; lado++) {
    const [ax, az] = cantos[lado]!,
      [bx, bz] = cantos[(lado + 1) % 4]!,
      partes = Math.min(
        MAX_PONTOS_POR_LADO,
        Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / PASSO_DA_BORDA)),
      )
    for (let i = 0; i < partes; i++)
      for (const t of [i / partes, (i + 1) / partes]) {
        const x = ax + (bx - ax) * t,
          z = az + (bz - az) * t
        dados.push(x, altura(x, z) + ACIMA_DO_CHAO, z)
      }
  }
  return Float32Array.from(dados)
}

/** O centro da região no chão, onde o nome aparece. */
export function centroDaRegiao(caixa: CaixaDeRegiao): { x: number; z: number } {
  return { x: (caixa.x0 + caixa.x1) / 2, z: (caixa.z0 + caixa.z1) / 2 }
}

/**
 * As regiões do cenário como guias da aba Jogo (lote 7 da conclusão, 22/11/2026): a borda
 * translúcida sobre o relevo e o nome no meio. São guias de edição: não entram no Testar, no
 * retrato, na exportação nem na colisão. O palco põe o grupo dentro das guias do jogo, então elas
 * aparecem e somem junto com os marcadores.
 */
export class RegioesDoPalco {
  readonly grupo = new Group()
  private readonly material = new LineBasicMaterial({
    vertexColors: true,
    depthTest: false,
    transparent: true,
    opacity: 0.75,
  })
  private readonly linhas = new LineSegments(new BufferGeometry(), this.material)
  private readonly nomes = new Map<string, { sprite: Sprite; texto: string }>()
  private documento: DocumentoDeCenario | null = null
  private fonte: FonteDeAlturas | undefined

  constructor() {
    this.linhas.frustumCulled = false
    this.linhas.renderOrder = 997
    this.grupo.add(this.linhas)
  }

  /** Desenha as regiões do documento (o da prévia, quando há uma). Sem relevo carregado, nada. */
  definir(doc: DocumentoDeCenario, fonte?: FonteDeAlturas): void {
    const regioes = doc.regioes ?? []
    if (!regioes.length || (doc.base.tipo === 'terreno' && !fonte)) {
      this.limpar()
      this.documento = doc
      this.fonte = fonte
      return
    }
    this.documento = doc
    this.fonte = fonte
    const altura = (x: number, z: number) => alturaDoChao(doc.base, x, z, fonte)
    const posicoes: number[] = [],
      cores: number[] = [],
      cor = new Color()
    regioes.forEach((r, i) => {
      const borda = bordaDaRegiao(r.caixa, altura)
      cor.set(CORES[i % CORES.length]!)
      for (let j = 0; j < borda.length; j += 3) {
        posicoes.push(borda[j]!, borda[j + 1]!, borda[j + 2]!)
        cores.push(cor.r, cor.g, cor.b)
      }
    })
    const geometria = new BufferGeometry()
    geometria.setAttribute('position', new Float32BufferAttribute(posicoes, 3))
    geometria.setAttribute('color', new Float32BufferAttribute(cores, 3))
    this.linhas.geometry.dispose()
    this.linhas.geometry = geometria
    this.atualizarNomes(regioes, altura)
  }

  /** O relevo mudou (escultura ao vivo): as bordas acompanham o chão novo. */
  atualizarTerreno(): void {
    if (this.documento) this.definir(this.documento, this.fonte)
  }

  /** Tira tudo e esquece o documento (as guias do jogo foram escondidas). */
  limpar(): void {
    this.linhas.geometry.dispose()
    this.linhas.geometry = new BufferGeometry()
    for (const { sprite } of this.nomes.values()) this.soltarNome(sprite)
    this.nomes.clear()
    this.documento = null
    this.fonte = undefined
  }

  descartar(): void {
    this.limpar()
    this.linhas.geometry.dispose()
    this.material.dispose()
  }

  private atualizarNomes(
    regioes: readonly RegiaoDeCenario[],
    altura: (x: number, z: number) => number,
  ) {
    const vivos = new Set<string>()
    for (const r of regioes) {
      vivos.add(r.id)
      let entrada = this.nomes.get(r.id)
      if (entrada && entrada.texto !== r.nome) {
        this.soltarNome(entrada.sprite)
        this.nomes.delete(r.id)
        entrada = undefined
      }
      if (!entrada) {
        const sprite = criarNome(r.nome)
        // Sem canvas 2D (testes sem navegador), a borda basta.
        if (!sprite) continue
        entrada = { sprite, texto: r.nome }
        this.nomes.set(r.id, entrada)
        this.grupo.add(sprite)
      }
      const c = centroDaRegiao(r.caixa),
        lado = Math.min(r.caixa.x1 - r.caixa.x0, r.caixa.z1 - r.caixa.z0),
        escala = Math.max(2, Math.min(24, lado / 5))
      entrada.sprite.position.set(c.x, altura(c.x, c.z) + escala * 0.6, c.z)
      entrada.sprite.scale.set(escala * 4, escala, 1)
    }
    for (const [id, { sprite }] of this.nomes)
      if (!vivos.has(id)) {
        this.soltarNome(sprite)
        this.nomes.delete(id)
      }
  }

  private soltarNome(sprite: Sprite) {
    this.grupo.remove(sprite)
    sprite.material.map?.dispose()
    sprite.material.dispose()
  }
}

/** O nome da região numa placa que sempre olha para a câmera. */
function criarNome(texto: string): Sprite | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = 'rgba(20, 24, 40, 0.55)'
  ctx.beginPath()
  ctx.roundRect(8, 16, 496, 96, 40)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 56px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto.length > 24 ? `${texto.slice(0, 23)}…` : texto, 256, 66, 470)
  const mapa = new CanvasTexture(canvas)
  const sprite = new Sprite(new SpriteMaterial({ map: mapa, depthTest: false, transparent: true }))
  sprite.renderOrder = 999
  return sprite
}
