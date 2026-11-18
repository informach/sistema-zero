import { CapturedPaintInput, paintPointerPath, SceneBrushCursor } from '@sistemazero/molda/palco'
import {
  aplicarFerramentaDeTerreno,
  clonarEstadoDoTerreno,
  type DocumentoDeCenario,
  type EstadoDoTerreno,
  igual,
  ParametrosDeTerrenoSchema,
  type PontoDaEscultura,
  type RegiaoDoCampo,
  type RegioesDeTerreno,
  unirRegioes,
} from '@sistemazero/molda-cenarios-core/v2'
import { Group } from 'three'
import type { ConfiguracaoDaEscultura, EstadoDaEscultura, GestoDeTerreno } from './escultura-tipos'
import type { TerrenoDoPalco } from './Terreno'

interface Fontes {
  documento(): DocumentoDeCenario | null
  terreno(): TerrenoDoPalco | null
  ponto(x: number, y: number): PontoDaEscultura | null
  pedirQuadro(): void
  aoGesto(ativo: boolean): void
  aoEstado(estado: EstadoDaEscultura): void
  aoAtualizar(): void
  aplicar(gesto: GestoDeTerreno): void
}
type Amostra = PontoDaEscultura & { clientX: number; clientY: number }
interface Sessao {
  documento: DocumentoDeCenario
  terreno: TerrenoDoPalco
  original: EstadoDoTerreno
  estado: EstadoDoTerreno
  de: PontoDaEscultura
  ultimo: PontoDaEscultura | null
  resto: number
  amostras: number
  regioes: RegioesDeTerreno
  sujas: RegioesDeTerreno
  rampaAnterior: RegiaoDoCampo | null
  tela: { x: number; y: number } | null
}
const juntar = (a: RegioesDeTerreno, b: RegioesDeTerreno) => {
  for (const tipo of ['alturas', 'pintura', 'buracos'] as const)
    if (b[tipo]) a[tipo] = unirRegioes(a[tipo] ?? null, b[tipo]!)
}

/** Captura e cursor do Molda; campo e prévia pertencem a uma única cabeça autoral. */
export class EsculturaDoPalco {
  readonly grupo = new Group()
  private readonly cursor = new SceneBrushCursor()
  private readonly entrada: CapturedPaintInput<Amostra>
  private configuracao: ConfiguracaoDaEscultura | null = null
  private sessao: Sessao | null = null
  private pendente: Pick<Sessao, 'documento' | 'terreno'> | null = null
  private hover: { clientX: number; clientY: number } | null = null
  private alt = false
  private erro: string | null = null
  private publicado = ''
  private destruido = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly fontes: Fontes,
  ) {
    this.grupo.name = 'cenarios-cursor-de-terreno'
    this.grupo.add(this.cursor.root)
    this.entrada = new CapturedPaintInput(
      canvas,
      (p) => {
        const ponto = fontes.ponto(p.clientX, p.clientY)
        return ponto ? { ...ponto, clientX: p.clientX, clientY: p.clientY } : null
      },
      {
        begin: (p) => this.iniciar(p),
        move: (p) => this.mover(p),
        end: (ok) => this.terminar(ok),
      },
      (de, ate) =>
        this.configuracao?.ferramenta === 'rampa'
          ? [ate]
          : paintPointerPath(de, ate, canvas.getBoundingClientRect(), 4),
      { claimMisses: false },
    )
    canvas.addEventListener('pointermove', this.aoHover, true)
    canvas.addEventListener('pointerleave', this.aoSair)
    canvas.addEventListener('blur', this.aoPerderFoco)
    canvas.ownerDocument.defaultView?.addEventListener('keydown', this.aoTecla)
    canvas.ownerDocument.defaultView?.addEventListener('keyup', this.aoSoltarTecla)
    canvas.ownerDocument.defaultView?.addEventListener('blur', this.aoPerderFoco)
    canvas.ownerDocument.addEventListener('visibilitychange', this.aoVisibilidade)
  }
  get habilitado() {
    return Boolean(this.configuracao)
  }
  get ocupada() {
    return Boolean(this.sessao || this.pendente)
  }
  definir(config: ConfiguracaoDaEscultura | null) {
    if (this.destruido || igual(config, this.configuracao)) return
    this.entrada.cancel()
    this.configuracao = null
    this.erro = null
    if (config) {
      const { pausa, ...parametros } = config
      const r = ParametrosDeTerrenoSchema.safeParse(parametros)
      if (r.success) this.configuracao = { ...r.data, ...(pausa ? { pausa } : {}) }
      else this.erro = 'Confira os valores do pincel de terreno'
    }
    this.cursor.clear()
    this.habilitarEntrada()
    this.publicar()
    this.fontes.pedirQuadro()
  }
  contextoAlterado() {
    this.entrada.cancel()
    this.cursor.clear()
    this.hover = null
    this.fontes.pedirQuadro()
  }
  finalizarEnvio(cancelar = false) {
    if (this.destruido) return
    const p = this.pendente
    this.pendente = null
    if (cancelar && p && this.fontes.documento() === p.documento) {
      p.terreno.cancelarPrevia()
      this.fontes.aoAtualizar()
    }
    this.habilitarEntrada()
    this.publicar()
    this.fontes.pedirQuadro()
  }
  private habilitarEntrada() {
    this.entrada.setEnabled(
      Boolean(this.configuracao) && !this.configuracao?.pausa && !this.alt && !this.pendente,
    )
  }
  private iniciar(p: Amostra) {
    const documento = this.fontes.documento(),
      terreno = this.fontes.terreno()
    if (!this.configuracao || this.configuracao.pausa || this.pendente || !documento || !terreno)
      return false
    this.erro = null
    try {
      const de = { ...p, y: terreno.alturaPublicada(p.x, p.z) }
      this.sessao = {
        documento,
        terreno,
        original: terreno.estado,
        estado: clonarEstadoDoTerreno(terreno.estado),
        de,
        ultimo: de,
        resto: 0,
        amostras: 0,
        regioes: {},
        sujas: {},
        rampaAnterior: null,
        tela: { x: p.clientX, y: p.clientY },
      }
      this.fontes.aoGesto(true)
      if (this.configuracao.ferramenta !== 'rampa') this.carimbar(de)
      this.publicar()
      this.fontes.pedirQuadro()
      return true
    } catch (e) {
      this.falhar(e)
      return false
    }
  }
  private carimbar(p: PontoDaEscultura) {
    const s = this.sessao,
      config = this.configuracao
    if (!s || !config) return
    if (++s.amostras > 4096) throw new Error('Divida a escultura em trechos menores')
    const regioes = aplicarFerramentaDeTerreno(s.estado, config, p, s.de)
    juntar(s.regioes, regioes)
    juntar(s.sujas, regioes)
    s.rampaAnterior = regioes.alturas ?? null
  }
  private mover(p: Amostra | null) {
    const s = this.sessao,
      config = this.configuracao
    if (!s || !config) return
    if (!p) {
      s.ultimo = null
      s.resto = 0
      s.tela = null
      return
    }
    // A superfície mudou sob o cursor; soltar no mesmo pixel não é outra pincelada.
    if (s.tela?.x === p.clientX && s.tela?.y === p.clientY) return
    s.tela = { x: p.clientX, y: p.clientY }
    try {
      const atual = { ...p, y: s.terreno.alturaPublicada(p.x, p.z) }
      if (config.ferramenta === 'rampa') {
        if (s.rampaAnterior) {
          const r = s.rampaAnterior,
            original = s.original.campo
          // A fonte publicada é imutável durante o gesto. Só a área da rampa anterior é refeita.
          const largura = s.estado.campo.colunas + 1
          for (let z = r.z0; z <= r.z1; z++) {
            const de = z * largura + r.x0
            s.estado.campo.alturas.set(original.alturas.subarray(de, z * largura + r.x1 + 1), de)
          }
          juntar(s.sujas, { alturas: r })
        }
        this.carimbar(atual)
      } else if (!s.ultimo) this.carimbar(atual)
      else {
        const dx = atual.x - s.ultimo.x,
          dz = atual.z - s.ultimo.z,
          distancia = Math.hypot(dx, dz),
          passo = Math.max(s.estado.campo.passo * 0.25, config.raio * 0.2)
        let proxima = passo - s.resto
        while (proxima <= distancia && distancia > 0) {
          const x = s.ultimo.x + (dx * proxima) / distancia,
            z = s.ultimo.z + (dz * proxima) / distancia
          this.carimbar({ x, z, y: s.terreno.alturaPublicada(x, z) })
          proxima += passo
        }
        s.resto = (s.resto + distancia) % passo
      }
      s.ultimo = atual
      this.fontes.pedirQuadro()
    } catch (e) {
      this.falhar(e)
    }
  }
  quadro() {
    if (this.destruido) return
    if (!this.configuracao || this.configuracao.pausa) {
      this.cursor.clear()
      return
    }
    const s = this.sessao
    if (s && Object.values(s.sujas).some(Boolean)) {
      try {
        s.terreno.prever(s.estado, s.sujas)
        s.sujas = {}
        this.fontes.aoAtualizar()
      } catch (e) {
        this.falhar(e)
        return
      }
    }
    const p =
      s?.ultimo ??
      (this.hover && !this.pendente
        ? this.fontes.ponto(this.hover.clientX, this.hover.clientY)
        : null)
    const config = this.configuracao
    this.cursor.show(
      config && !config.pausa && !this.alt && p
        ? { point: [p.x, p.y, p.z], normal: [0, 1, 0] }
        : null,
      config?.ferramenta === 'rampa' ? config.largura / 2 : (config?.raio ?? null),
    )
  }
  private terminar(commit: boolean) {
    if (!this.sessao) return
    if (commit) this.quadro()
    const s = this.sessao
    if (!s) return
    this.sessao = null
    this.cursor.clear()
    this.fontes.aoGesto(false)
    if (!commit || !Object.values(s.regioes).some(Boolean)) {
      s.terreno.cancelarPrevia()
      this.fontes.aoAtualizar()
    } else {
      this.pendente = { documento: s.documento, terreno: s.terreno }
      this.habilitarEntrada()
      try {
        this.fontes.aplicar({
          documentoDeOrigem: s.documento,
          estado: s.estado,
          regioes: s.regioes,
        })
      } catch (e) {
        this.erro = e instanceof Error ? e.message : 'Não consegui guardar o terreno'
        this.finalizarEnvio(true)
      }
    }
    this.publicar()
    this.fontes.pedirQuadro()
  }
  private falhar(e: unknown) {
    this.erro = e instanceof Error ? e.message : 'Não consegui alterar o terreno'
    this.entrada.cancel()
    if (this.sessao) this.terminar(false)
    this.publicar()
    this.fontes.pedirQuadro()
  }
  private publicar() {
    const estado: EstadoDaEscultura = {
        ativo: Boolean(this.sessao),
        aguardando: Boolean(this.pendente),
        erro: this.erro ?? this.configuracao?.pausa ?? null,
      },
      chave = JSON.stringify(estado)
    if (chave !== this.publicado) {
      this.publicado = chave
      this.fontes.aoEstado(estado)
    }
  }
  private readonly aoHover = (e: PointerEvent) => {
    if (!this.configuracao) return
    this.hover = { clientX: e.clientX, clientY: e.clientY }
    this.fontes.pedirQuadro()
  }
  private readonly aoSair = () => {
    this.hover = null
    this.cursor.clear()
    this.fontes.pedirQuadro()
  }
  private readonly aoTecla = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      this.alt = true
      this.habilitarEntrada()
      this.cursor.clear()
    }
    if (this.sessao && (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ'))) {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.entrada.cancel()
    } else if (
      this.sessao &&
      (e.ctrlKey || e.metaKey || ['Delete', 'Backspace', 'KeyG', 'KeyR', 'KeyS'].includes(e.code))
    ) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }
  private readonly aoSoltarTecla = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      this.alt = false
      this.habilitarEntrada()
      this.fontes.pedirQuadro()
    }
  }
  private readonly aoPerderFoco = () => {
    this.alt = false
    this.entrada.forget()
    this.aoSair()
    this.habilitarEntrada()
  }
  private readonly aoVisibilidade = () => {
    if (this.canvas.ownerDocument.hidden) this.aoPerderFoco()
  }
  descartar() {
    if (this.destruido) return
    this.entrada.dispose()
    this.finalizarEnvio(true)
    this.destruido = true
    this.cursor.dispose()
    this.grupo.removeFromParent()
    this.canvas.removeEventListener('pointermove', this.aoHover, true)
    this.canvas.removeEventListener('pointerleave', this.aoSair)
    this.canvas.removeEventListener('blur', this.aoPerderFoco)
    this.canvas.ownerDocument.defaultView?.removeEventListener('keydown', this.aoTecla)
    this.canvas.ownerDocument.defaultView?.removeEventListener('keyup', this.aoSoltarTecla)
    this.canvas.ownerDocument.defaultView?.removeEventListener('blur', this.aoPerderFoco)
    this.canvas.ownerDocument.removeEventListener('visibilitychange', this.aoVisibilidade)
  }
}
