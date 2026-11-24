import type { EntradaDoTeste } from './tipos'

const TECLAS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'KeyQ',
  'KeyE',
])
/** Listeners pertencem à sessão. Perder foco nunca deixa uma tecla presa. */
export class ControlesDoTeste {
  private readonly teclas = new Set<string>()
  private toque: EntradaDoTeste = { frente: 0, lado: 0, vertical: 0, correr: false, saltar: false }
  private ponteiro: { id: number; x: number; y: number } | null = null
  private readonly documento: Document
  private readonly janela: Window
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly olhar: (x: number, y: number) => void,
    private readonly pausar: () => void,
  ) {
    this.documento = canvas.ownerDocument
    this.janela = this.documento.defaultView!
    this.documento.addEventListener('keydown', this.apertar)
    this.documento.addEventListener('keyup', this.soltar)
    this.documento.addEventListener('visibilitychange', this.visibilidade)
    this.janela.addEventListener('blur', this.perderFoco)
    canvas.addEventListener('pointerdown', this.iniciarOlhar)
    canvas.addEventListener('pointermove', this.moverOlhar)
    canvas.addEventListener('pointerup', this.soltarOlhar)
    canvas.addEventListener('pointercancel', this.soltarOlhar)
    canvas.focus()
  }
  entrada(): EntradaDoTeste {
    const ativa = (...codigos: string[]) => (codigos.some((c) => this.teclas.has(c)) ? 1 : 0)
    return {
      frente: Math.max(
        -1,
        Math.min(1, this.toque.frente + ativa('KeyW', 'ArrowUp') - ativa('KeyS', 'ArrowDown')),
      ),
      lado: Math.max(
        -1,
        Math.min(1, this.toque.lado + ativa('KeyD', 'ArrowRight') - ativa('KeyA', 'ArrowLeft')),
      ),
      vertical: Math.max(-1, Math.min(1, this.toque.vertical + ativa('KeyE') - ativa('KeyQ'))),
      correr: this.toque.correr || Boolean(ativa('ShiftLeft', 'ShiftRight')),
      saltar: this.toque.saltar || Boolean(ativa('Space')),
    }
  }
  definirToque(entrada: Partial<EntradaDoTeste>) {
    const limitar = (n: number) => (Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0)
    for (const eixo of ['frente', 'lado', 'vertical'] as const)
      if (eixo in entrada) this.toque[eixo] = limitar(entrada[eixo] ?? 0)
    if ('correr' in entrada) this.toque.correr = entrada.correr === true
    if ('saltar' in entrada) this.toque.saltar = entrada.saltar === true
  }
  limpar() {
    this.teclas.clear()
    this.toque = { frente: 0, lado: 0, vertical: 0, correr: false, saltar: false }
    this.ponteiro = null
  }
  private readonly apertar = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return
    const alvo = e.target as HTMLElement | null
    if (alvo?.closest('input,textarea,select,[contenteditable="true"]')) return
    if (e.code === 'Escape') {
      e.preventDefault()
      this.perderFoco()
      return
    }
    if (
      (e.code === 'Space' || e.code === 'Enter') &&
      alvo?.closest('button,summary,a,[role="button"]')
    )
      return
    if (!TECLAS.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()
    this.teclas.add(e.code)
  }
  private readonly soltar = (e: KeyboardEvent) => {
    this.teclas.delete(e.code)
  }
  private readonly visibilidade = () => {
    if (this.documento.hidden) this.perderFoco()
  }
  private readonly perderFoco = () => {
    this.limpar()
    this.pausar()
  }
  private readonly iniciarOlhar = (e: PointerEvent) => {
    if (e.button !== 0 || this.ponteiro) return
    this.ponteiro = { id: e.pointerId, x: e.clientX, y: e.clientY }
    this.canvas.setPointerCapture(e.pointerId)
    this.canvas.focus()
  }
  private readonly moverOlhar = (e: PointerEvent) => {
    const p = this.ponteiro
    if (!p || p.id !== e.pointerId) return
    this.olhar(e.clientX - p.x, e.clientY - p.y)
    p.x = e.clientX
    p.y = e.clientY
  }
  private readonly soltarOlhar = (e: PointerEvent) => {
    if (this.ponteiro?.id === e.pointerId) this.ponteiro = null
  }
  descartar() {
    this.limpar()
    this.documento.removeEventListener('keydown', this.apertar)
    this.documento.removeEventListener('keyup', this.soltar)
    this.documento.removeEventListener('visibilitychange', this.visibilidade)
    this.janela.removeEventListener('blur', this.perderFoco)
    this.canvas.removeEventListener('pointerdown', this.iniciarOlhar)
    this.canvas.removeEventListener('pointermove', this.moverOlhar)
    this.canvas.removeEventListener('pointerup', this.soltarOlhar)
    this.canvas.removeEventListener('pointercancel', this.soltarOlhar)
  }
}
