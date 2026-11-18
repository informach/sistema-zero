import { CapturedPaintInput } from '@sistemazero/molda/palco'
import { type DocumentoDeCenario, igual } from '@sistemazero/molda-cenarios-core/v2'
import { type Camera, Vector3 } from 'three'
import { PontosDeAutoria } from '../pontos-de-autoria'
import type { Ponto3 } from '../tipos'

export interface CapturaDeCaminho {
  pontos: readonly Ponto3[]
  modo: 'adicionar' | 'mover' | 'inserir' | 'remover'
  fechada: boolean
  minimo: 1 | 2 | 3
  maximo: number
  selecionado?: number | null
  conservarAltura?: boolean
  /** Rotas sobre relevo conservam o desnível de cada controle ao arrastar. */
  conservarDistanciaDoChao?: boolean
  /** Base horizontal de uma zona, inclusive ao criar ou inserir novos controles. */
  alturaFixa?: number
  /** Reserva a edição sem aceitar gestos durante preparação ou aplicação. */
  interativa?: boolean
}
export interface GestoDePontosDeCaminho {
  documentoDeOrigem: DocumentoDeCenario
  pontos: Ponto3[]
  selecionado: number | null
}
interface Fontes {
  documento(): DocumentoDeCenario | null
  camera: Camera
  ponto(x: number, y: number, alturaFixa?: number): Ponto3 | null
  altura(x: number, z: number): number
  aoGesto(ativo: boolean): void
  aoEditar(gesto: GestoDePontosDeCaminho): void
  aoCancelar(): void
  aoErro(mensagem: string): void
  pedirQuadro(): void
}
type Amostra = { ponto: Ponto3; indice: number; clientX: number; clientY: number }
type Sessao = {
  documento: DocumentoDeCenario
  pontos: Ponto3[]
  indice: number
  de: Amostra
  moveu: boolean
}

/** O gesto do Molda mantém captura, exclusão de órbita e cancelamento por segundo dedo. */
export class EdicaoDePontos {
  private readonly desenho = new PontosDeAutoria(4096, 10)
  readonly grupo = this.desenho.grupo
  private readonly entrada: CapturedPaintInput<Amostra>
  private configuracao: CapturaDeCaminho | null = null
  private pontos: Ponto3[] = []
  private selecionado: number | null = null
  private sessao: Sessao | null = null
  private alt = false
  private destruido = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly fontes: Fontes,
  ) {
    this.entrada = new CapturedPaintInput(
      canvas,
      (p) => {
        const indice = this.sessao?.indice ?? this.proximo(p.clientX, p.clientY),
          ponto = fontes.ponto(p.clientX, p.clientY, this.configuracao?.alturaFixa)
        return indice !== null && ponto
          ? { ponto, indice, clientX: p.clientX, clientY: p.clientY }
          : null
      },
      {
        begin: (de) => {
          const documento = fontes.documento()
          if (!documento || !this.configuracao) return false
          this.sessao = {
            documento,
            pontos: structuredClone(this.pontos),
            indice: de.indice,
            de,
            moveu: false,
          }
          this.selecionado = de.indice
          fontes.aoGesto(true)
          return true
        },
        move: (p) => {
          if (!this.sessao || !p) return
          if (
            !this.sessao.moveu &&
            Math.hypot(p.clientX - this.sessao.de.clientX, p.clientY - this.sessao.de.clientY) < 3
          )
            return
          this.sessao.moveu = true
          const inicial = this.sessao.pontos[p.indice]!,
            x = inicial.x + p.ponto.x - this.sessao.de.ponto.x,
            z = inicial.z + p.ponto.z - this.sessao.de.ponto.z,
            y =
              this.configuracao?.alturaFixa ??
              (this.configuracao?.conservarAltura
                ? inicial.y
                : fontes.altura(x, z) +
                  (this.configuracao?.conservarDistanciaDoChao
                    ? inicial.y - fontes.altura(inicial.x, inicial.z)
                    : 0))
          if (!Number.isFinite(y)) return
          this.pontos[p.indice] = { x, y, z }
          this.desenhar()
        },
        end: (ok) => {
          const sessao = this.sessao
          this.sessao = null
          if (!sessao) return
          if (!ok || fontes.documento() !== sessao.documento) this.pontos = sessao.pontos
          fontes.aoGesto(false)
          this.desenhar()
          if (ok && fontes.documento() === sessao.documento) this.publicar()
        },
      },
      undefined,
      { claimMisses: false },
    )
    const janela = canvas.ownerDocument.defaultView
    janela?.addEventListener('keydown', this.tecla, true)
    janela?.addEventListener('keyup', this.soltarTecla)
    janela?.addEventListener('blur', this.perderFoco)
    canvas.ownerDocument.addEventListener('visibilitychange', this.visibilidade)
  }
  get habilitada() {
    return this.configuracao !== null
  }
  get ocupada() {
    return this.sessao !== null
  }
  definir(config: CapturaDeCaminho | null) {
    if (this.destruido || igual(this.configuracao, config)) return
    if (
      config &&
      ((config.conservarAltura && config.conservarDistanciaDoChao) ||
        (config.alturaFixa != null &&
          (!Number.isFinite(config.alturaFixa) ||
            Math.abs(config.alturaFixa) > 100_000 ||
            config.conservarDistanciaDoChao ||
            config.pontos.some((p) => Math.abs(p.y - config.alturaFixa!) > 1e-4))) ||
        !Number.isInteger(config.maximo) ||
        config.maximo < config.minimo ||
        config.maximo > 4096 ||
        ![1, 2, 3].includes(config.minimo) ||
        (config.fechada && config.minimo !== 3) ||
        !['adicionar', 'mover', 'inserir', 'remover'].includes(config.modo) ||
        config.pontos.length > config.maximo ||
        config.pontos.some((p) => ![p.x, p.y, p.z].every(Number.isFinite)) ||
        (config.selecionado != null &&
          (!Number.isInteger(config.selecionado) ||
            config.selecionado < 0 ||
            config.selecionado >= config.pontos.length)))
    )
      throw Error('Confira os pontos e limites do caminho.')
    this.entrada.cancel()
    this.configuracao = config ? structuredClone(config) : null
    this.pontos = config?.pontos.map((p) => ({ x: p.x, y: p.y, z: p.z })) ?? []
    this.selecionado = config?.selecionado ?? null
    this.habilitarEntrada()
    this.desenhar()
  }
  contextoAlterado() {
    this.definir(null)
  }
  private habilitarEntrada() {
    this.entrada.setEnabled(
      Boolean(
        this.configuracao &&
          this.configuracao.interativa !== false &&
          !this.alt &&
          ['adicionar', 'mover'].includes(this.configuracao.modo),
      ),
    )
  }
  private desenhar() {
    this.desenho.definir(
      this.configuracao ? this.pontos : null,
      this.configuracao?.fechada,
      this.selecionado,
    )
    this.fontes.pedirQuadro()
  }
  private naTela(p: Ponto3) {
    const r = new Vector3(p.x, p.y + 0.05, p.z).project(this.fontes.camera),
      caixa = this.canvas.getBoundingClientRect()
    if (r.z < -1 || r.z > 1 || ![r.x, r.y, r.z].every(Number.isFinite)) return null
    return {
      x: caixa.left + ((r.x + 1) * caixa.width) / 2,
      y: caixa.top + ((1 - r.y) * caixa.height) / 2,
    }
  }
  private proximo(x: number, y: number) {
    let escolhido: number | null = null,
      distancia = 14
    for (const [i, p] of this.pontos.entries()) {
      const q = this.naTela(p),
        d = q ? Math.hypot(q.x - x, q.y - y) : Infinity
      if (d < distancia) {
        distancia = d
        escolhido = i
      }
    }
    return escolhido
  }
  private trechoProximo(x: number, y: number) {
    let escolhido: number | null = null,
      distancia = 14
    for (
      let i = 0;
      i < (this.configuracao?.fechada ? this.pontos.length : this.pontos.length - 1);
      i++
    ) {
      const a = this.naTela(this.pontos[i]!),
        b = this.naTela(this.pontos[(i + 1) % this.pontos.length]!)
      if (!a || !b) continue
      const dx = b.x - a.x,
        dy = b.y - a.y,
        l2 = dx * dx + dy * dy,
        t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0,
        d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y)
      if (d < distancia) {
        distancia = d
        escolhido = i
      }
    }
    return escolhido
  }
  /** Somente cliques já distinguidos de órbita pelo Palco chegam aqui. */
  clicar(x: number, y: number) {
    const c = this.configuracao
    if (!c) return false
    if (c.interativa === false || this.alt || this.sessao) return true
    this.canvas.focus({ preventScroll: true })
    const indice = this.proximo(x, y)
    if (indice !== null) {
      this.selecionado = indice
      if (c.modo === 'remover') this.remover()
      else this.publicar()
      return true
    }
    if (c.modo === 'mover' || c.modo === 'remover') return true
    if (this.pontos.length >= c.maximo) {
      this.fontes.aoErro(`Este caminho aceita no máximo ${c.maximo} pontos.`)
      return true
    }
    const ponto = this.fontes.ponto(x, y, c.alturaFixa)
    if (!ponto) return true
    if (c.modo === 'inserir') {
      const trecho = this.trechoProximo(x, y)
      if (trecho === null) return true
      if (c.conservarDistanciaDoChao) {
        const a = this.pontos[trecho]!,
          b = this.pontos[(trecho + 1) % this.pontos.length]!,
          dx = b.x - a.x,
          dz = b.z - a.z,
          t = Math.max(
            0,
            Math.min(1, ((ponto.x - a.x) * dx + (ponto.z - a.z) * dz) / (dx * dx + dz * dz || 1)),
          ),
          de = a.y - this.fontes.altura(a.x, a.z),
          ate = b.y - this.fontes.altura(b.x, b.z)
        ponto.y = this.fontes.altura(ponto.x, ponto.z) + de + (ate - de) * t
      }
      // Usar o ponto capturado no chão; o segmento selecionado é o que foi visto na tela.
      this.pontos.splice(trecho + 1, 0, { x: ponto.x, y: ponto.y, z: ponto.z })
      this.selecionado = trecho + 1
    } else {
      const anterior = this.pontos.at(-1)
      if (c.conservarDistanciaDoChao && anterior)
        ponto.y =
          this.fontes.altura(ponto.x, ponto.z) +
          anterior.y -
          this.fontes.altura(anterior.x, anterior.z)
      this.pontos.push({ x: ponto.x, y: ponto.y, z: ponto.z })
      this.selecionado = this.pontos.length - 1
    }
    this.desenhar()
    this.publicar()
    return true
  }
  private remover() {
    const c = this.configuracao,
      indice = this.selecionado
    if (!c || indice === null) return
    if (this.pontos.length <= c.minimo) {
      this.fontes.aoErro(`Mantenha pelo menos ${c.minimo} pontos.`)
      return
    }
    this.pontos = this.pontos.filter((_, i) => i !== indice)
    this.selecionado = this.pontos.length ? Math.min(indice, this.pontos.length - 1) : null
    this.desenhar()
    this.publicar()
  }
  private publicar() {
    const documento = this.fontes.documento()
    if (documento)
      this.fontes.aoEditar({
        documentoDeOrigem: documento,
        pontos: structuredClone(this.pontos),
        selecionado: this.selecionado,
      })
  }
  private readonly tecla = (e: KeyboardEvent) => {
    if (!this.habilitada) return
    if (e.key === 'Alt') {
      this.alt = true
      this.habilitarEntrada()
    }
    if (this.canvas.ownerDocument.activeElement !== this.canvas) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      if (this.sessao) this.entrada.cancel()
      else this.fontes.aoCancelar()
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.configuracao?.interativa === false) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (this.sessao) this.entrada.cancel()
      this.remover()
    }
  }
  private readonly soltarTecla = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      this.alt = false
      this.habilitarEntrada()
    }
  }
  private readonly perderFoco = () => {
    this.alt = false
    this.entrada.forget()
    this.habilitarEntrada()
  }
  private readonly visibilidade = () => {
    if (this.canvas.ownerDocument.hidden) this.perderFoco()
  }
  descartar() {
    if (this.destruido) return
    this.entrada.dispose()
    this.desenho.descartar()
    this.configuracao = null
    this.destruido = true
    const janela = this.canvas.ownerDocument.defaultView
    janela?.removeEventListener('keydown', this.tecla, true)
    janela?.removeEventListener('keyup', this.soltarTecla)
    janela?.removeEventListener('blur', this.perderFoco)
    this.canvas.ownerDocument.removeEventListener('visibilitychange', this.visibilidade)
  }
}
