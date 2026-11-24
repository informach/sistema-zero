import { CapturedPaintInput, paintPointerPath, SceneBrushCursor } from '@sistemazero/molda/palco'
import {
  criarAmostradorDeEspalhamento,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  igual,
  instanciaDoEspalhamento,
  LIMITES_ESPALHAMENTO,
  type ReceitaDeEspalhamento,
} from '@sistemazero/molda-cenarios-core/v2'
import { Group, type Texture } from 'three'
import type { ModeloCarregado } from './modelos'
import { PreviaDeObjetos } from './PreviaDeObjetos'
import type {
  ConfiguracaoDoEspalhamento,
  EstadoDoEspalhamento,
  GestoDeEspalhamento,
  Ponto3,
} from './tipos'

interface FontesDoPincel {
  documento(): DocumentoDeCenario | null
  alturas(): FonteDeAlturas | undefined
  ponto(clientX: number, clientY: number): Ponto3 | null
  modelo(id: string, documento: DocumentoDeCenario): ModeloCarregado | null
  textura(id: string, documento: DocumentoDeCenario): Texture | null
  erroDeRecurso(
    id: string,
    tipo: 'modelo' | 'textura',
    documento: DocumentoDeCenario,
  ): string | null
  pedirQuadro(): void
  aoGesto(ativo: boolean): void
  aoPrevia(estado: EstadoDoEspalhamento): void
  aoAplicar(gesto: GestoDeEspalhamento): void
}
const vazio = (): EstadoDoEspalhamento => ({
  quantidade: 0,
  ativa: false,
  pronta: false,
  saturou: false,
  faltouEspaco: false,
  limiteDoTraco: false,
  erro: null,
})

/** Um gesto é apenas uma prévia até soltar. Captura, cancelamento e cursor vêm do Molda. */
export class EspalhamentoDoPalco {
  readonly grupo = new Group()
  private readonly cursor = new SceneBrushCursor()
  private readonly previa = new PreviaDeObjetos()
  private readonly entrada: CapturedPaintInput<Ponto3>
  private configuracao: ConfiguracaoDoEspalhamento | null = null
  private consulta: DocumentoDeCenario | null = null
  private amostrador: ReturnType<typeof criarAmostradorDeEspalhamento> | null = null
  private hover: { clientX: number; clientY: number } | null = null
  private traco: ReceitaDeEspalhamento['traco'] = []
  private ultimoPonto: Ponto3 | null = null
  private quebrou = false
  private ativa = false
  private suja = true
  private limiteDoTraco = false
  private destruido = false
  private ultimaPublicacao = ''
  private resultado: GestoDeEspalhamento | null = null
  private estado = vazio()

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly fontes: FontesDoPincel,
  ) {
    this.grupo.name = 'cenarios-previa-de-espalhamento'
    this.grupo.add(this.cursor.root, this.previa.grupo)
    canvas.addEventListener('pointermove', this.aoHover, true)
    canvas.addEventListener('pointerleave', this.aoSair)
    canvas.addEventListener('blur', this.aoPerderFoco)
    canvas.ownerDocument.defaultView?.addEventListener('blur', this.aoPerderFoco)
    canvas.ownerDocument.addEventListener('visibilitychange', this.aoVisibilidade)
    canvas.ownerDocument.defaultView?.addEventListener('keydown', this.aoTecla)
    this.entrada = new CapturedPaintInput(
      canvas,
      (evento) => fontes.ponto(evento.clientX, evento.clientY),
      {
        begin: (p) => {
          this.quebrou = false
          this.limiteDoTraco = false
          this.hover = null
          this.ultimoPonto = p
          this.traco = [{ x: p.x, z: p.z }]
          this.suja = true
          this.quadro()
          if (!this.estado.pronta || !this.configuracao) {
            this.traco = []
            return false
          }
          this.ativa = true
          this.fontes.aoGesto(true)
          this.invalidar()
          return true
        },
        move: (p) => this.adicionar(p),
        end: (commit) => this.terminar(commit),
      },
      (de, para) => paintPointerPath(de, para, canvas.getBoundingClientRect(), 8),
    )
  }

  get habilitado() {
    return this.configuracao !== null && !this.configuracao.pausa
  }
  get prototipos() {
    return this.configuracao?.receita.prototipos ?? []
  }
  definir(configuracao: ConfiguracaoDoEspalhamento | null) {
    if (this.destruido || igual(this.configuracao, configuracao)) return false
    this.entrada.cancel()
    this.reiniciar()
    this.configuracao = configuracao ? structuredClone(configuracao) : null
    this.entrada.setEnabled(Boolean(configuracao) && !configuracao?.pausa)
    if (!configuracao) this.publicar(vazio())
    this.invalidar()
    return true
  }
  contextoAlterado() {
    this.entrada.cancel()
    this.reiniciar()
    this.invalidar()
  }
  private reiniciar() {
    this.previa.limpar()
    this.cursor.clear()
    this.consulta = null
    this.amostrador = null
    this.resultado = null
    this.traco = []
    this.ultimoPonto = null
    this.ativa = false
    this.quebrou = false
    this.limiteDoTraco = false
  }
  invalidar() {
    this.suja = true
    this.fontes.pedirQuadro()
  }
  recursosAlterados() {
    this.consulta = null
    this.amostrador = null
    this.invalidar()
  }

  documentoDeConsulta(): DocumentoDeCenario | null {
    try {
      return this.prepararConsulta()
    } catch (e) {
      this.publicar({
        ...vazio(),
        erro: e instanceof Error ? e.message : 'A referência do pincel não está disponível',
      })
      return null
    }
  }
  private prepararConsulta(): DocumentoDeCenario | null {
    if (!this.configuracao) return this.fontes.documento()
    if (this.consulta) return this.consulta
    const doc = this.fontes.documento()
    if (!doc) return null
    const juntar = <T extends { id: string }>(atuais: readonly T[], novos: readonly T[]): T[] => {
      const mapa = new Map(atuais.map((e) => [e.id, e]))
      for (const e of novos) {
        const anterior = mapa.get(e.id)
        if (anterior && !igual(anterior, e))
          throw new Error('A referência do pincel mudou. Escolha o modelo novamente.')
        mapa.set(e.id, e)
      }
      return [...mapa.values()]
    }
    this.consulta = {
      ...doc,
      modelos: juntar(doc.modelos, this.configuracao.modelos),
      ...(this.configuracao.formas.length
        ? { formas: juntar(doc.formas ?? [], this.configuracao.formas) }
        : {}),
      ...(this.configuracao.texturas.length
        ? { texturas: juntar(doc.texturas ?? [], this.configuracao.texturas) }
        : {}),
    }
    const consulta = this.consulta
    consulta.modelos = consulta.modelos.map((m) => {
      if (m.volume) return m
      const carregado = this.fontes.modelo(m.id, consulta)
      if (!carregado) return m
      const { min, max } = carregado.caixa
      return {
        ...m,
        volume: { min: { x: min.x, y: min.y, z: min.z }, max: { x: max.x, y: max.y, z: max.z } },
      }
    })
    return consulta
  }

  private readonly aoHover = (evento: PointerEvent) => {
    if (!this.habilitado || this.ativa) return
    this.hover = { clientX: evento.clientX, clientY: evento.clientY }
    this.invalidar()
  }
  private readonly aoSair = () => {
    this.hover = null
    if (!this.ativa) this.ultimoPonto = null
    this.invalidar()
  }
  private readonly aoPerderFoco = () => {
    this.entrada.forget()
    this.aoSair()
  }
  private readonly aoVisibilidade = () => {
    if (this.canvas.ownerDocument.hidden) this.aoPerderFoco()
  }
  private readonly aoTecla = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') {
      this.entrada.cancel()
      this.aoSair()
    }
  }

  private adicionar(ponto: Ponto3 | null) {
    if (!this.ativa || !this.configuracao) return
    this.ultimoPonto = ponto
    if (!ponto) {
      this.quebrou = true
      this.invalidar()
      return
    }
    const anterior = this.traco.at(-1)
    if (!anterior || this.quebrou) {
      if (this.traco.length < LIMITES_ESPALHAMENTO.pontos)
        this.traco.push({ x: ponto.x, z: ponto.z })
      else this.limiteDoTraco = true
      this.quebrou = false
    } else {
      const dx = ponto.x - anterior.x,
        dz = ponto.z - anterior.z,
        distancia = Math.hypot(dx, dz),
        passo = this.configuracao.receita.raio * 0.5
      const quantidade = Math.floor(distancia / passo),
        restantes = LIMITES_ESPALHAMENTO.pontos - this.traco.length
      for (let i = 1; i <= Math.min(quantidade, restantes); i++)
        this.traco.push({
          x: anterior.x + (dx * i * passo) / distancia,
          z: anterior.z + (dz * i * passo) / distancia,
        })
      if (quantidade > restantes) this.limiteDoTraco = true
    }
    this.invalidar()
  }

  quadro(cameraMudou = false) {
    if (this.destruido || !this.configuracao) return
    if (this.configuracao.pausa) {
      this.previa.esvaziar()
      this.cursor.clear()
      this.publicar({ ...vazio(), erro: this.configuracao.pausa })
      return
    }
    if (cameraMudou && !this.ativa) this.suja = true
    if (!this.suja) return
    this.suja = false
    const p = this.ativa
      ? this.ultimoPonto
      : this.hover
        ? this.fontes.ponto(this.hover.clientX, this.hover.clientY)
        : this.ultimoPonto
    this.cursor.show(
      p ? { point: [p.x, p.y, p.z], normal: [0, 1, 0] } : null,
      this.configuracao.receita.raio,
    )
    const traco = this.ativa || this.traco.length ? this.traco : p ? [{ x: p.x, z: p.z }] : []
    if (!traco.length) {
      this.previa.esvaziar()
      this.resultado = null
      this.publicar({ ...vazio(), pronta: true })
      return
    }
    try {
      const doc = this.documentoDeConsulta()
      if (!doc) return
      for (const prototipo of this.prototipos) {
        if (
          !doc.modelos.some((m) => m.id === prototipo.modelo) &&
          !doc.formas?.some((f) => f.id === prototipo.modelo)
        )
          throw new Error('Um modelo do pincel não está mais disponível. Escolha novamente.')
        const erro = this.fontes.erroDeRecurso(prototipo.modelo, 'modelo', doc)
        if (erro) throw new Error(erro)
        const acabamento = prototipo.aparencia?.textura
        if (acabamento) {
          const falha = this.fontes.erroDeRecurso(acabamento.id, 'textura', doc)
          if (falha) throw new Error(falha)
        }
        if (
          !this.fontes.modelo(prototipo.modelo, doc) ||
          (acabamento && !this.fontes.textura(acabamento.id, doc))
        ) {
          this.previa.esvaziar()
          this.resultado = null
          this.publicar({ ...vazio(), ativa: this.ativa })
          return
        }
      }
      const receita: ReceitaDeEspalhamento = {
        ...this.configuracao.receita,
        traco: traco.map((p) => ({ ...p })),
      }
      this.amostrador ??= criarAmostradorDeEspalhamento(doc, receita, this.fontes.alturas())
      const resultado = this.amostrador.gerar(receita.traco)
      const objetos = resultado.amostras.map((a, i) =>
        instanciaDoEspalhamento(receita, a, `previa-espalhar-${i}`, i),
      )
      this.previa.desenhar(
        doc,
        objetos,
        this.fontes.alturas(),
        (id) => this.fontes.modelo(id, doc),
        (id) => this.fontes.textura(id, doc),
      )
      const documentoDeOrigem = this.fontes.documento()
      this.resultado = documentoDeOrigem
        ? {
            documentoDeOrigem,
            receita,
            amostras: resultado.amostras,
            modelos: this.configuracao.modelos,
            formas: this.configuracao.formas,
            texturas: this.configuracao.texturas,
          }
        : null
      this.publicar({
        quantidade: objetos.length,
        ativa: this.ativa,
        pronta: true,
        saturou: resultado.saturou,
        faltouEspaco: resultado.faltouEspaco,
        limiteDoTraco: this.limiteDoTraco,
        erro: null,
      })
    } catch (erro) {
      this.previa.esvaziar()
      this.resultado = null
      this.publicar({
        ...vazio(),
        ativa: this.ativa,
        erro: erro instanceof Error ? erro.message : 'Não consegui preparar a prévia',
      })
    }
  }

  private terminar(commit: boolean) {
    const config = this.configuracao,
      documento = this.fontes.documento()
    if (commit && this.ativa) {
      const p = this.ultimoPonto,
        anterior = this.traco.at(-1)
      if (
        p &&
        anterior &&
        Math.hypot(p.x - anterior.x, p.z - anterior.z) > 1e-6 &&
        this.traco.length < LIMITES_ESPALHAMENTO.pontos
      )
        this.traco.push({ x: p.x, z: p.z })
      this.suja = true
      this.quadro()
    }
    const resultado =
      commit &&
      this.ativa &&
      this.estado.pronta &&
      this.configuracao === config &&
      this.fontes.documento() === documento
        ? this.resultado
        : null
    let erro = commit ? this.estado.erro : null
    this.ativa = false
    this.traco = []
    this.ultimoPonto = null
    this.resultado = null
    this.amostrador = null
    this.quebrou = false
    this.limiteDoTraco = false
    this.hover = null
    this.cursor.clear()
    this.previa.esvaziar()
    this.fontes.aoGesto(false)
    if (!this.destruido && resultado?.amostras.length) {
      try {
        this.fontes.aoAplicar(resultado)
      } catch (e) {
        erro = e instanceof Error ? e.message : 'Não consegui aplicar esta pincelada'
      }
    }
    if (!this.destruido) {
      this.publicar({ ...vazio(), pronta: !erro, erro })
      this.invalidar()
    }
  }
  private publicar(estado: EstadoDoEspalhamento) {
    this.estado = estado
    const chave = JSON.stringify(estado)
    if (chave === this.ultimaPublicacao || this.destruido) return
    this.ultimaPublicacao = chave
    this.fontes.aoPrevia(estado)
  }
  descartar() {
    if (this.destruido) return
    this.destruido = true
    this.entrada.dispose()
    this.cursor.dispose()
    this.previa.descartar()
    this.grupo.removeFromParent()
    this.canvas.removeEventListener('pointermove', this.aoHover, true)
    this.canvas.removeEventListener('pointerleave', this.aoSair)
    this.canvas.removeEventListener('blur', this.aoPerderFoco)
    this.canvas.ownerDocument.defaultView?.removeEventListener('blur', this.aoPerderFoco)
    this.canvas.ownerDocument.removeEventListener('visibilitychange', this.aoVisibilidade)
    this.canvas.ownerDocument.defaultView?.removeEventListener('keydown', this.aoTecla)
  }
}
