import { Vector3 } from 'three'
import type { MundoDoTeste } from './colisoes'
import { PercursoDoTeste } from './percurso'
import type { ModoDoTeste } from './tipos'

export interface IntencaoDoMovimento {
  x: number
  z: number
  vertical: number
  correr: boolean
  saltar: boolean
}
const PASSO = 1 / 120
const LIMITE_DA_INCLINACAO = Math.cos((48 * Math.PI) / 180)
const aproximar = (atual: number, alvo: number, passo: number) =>
  atual + Math.max(-passo, Math.min(passo, alvo - atual))

/** Controlador genérico e transitório da oficina, sem estado ou regras do jogo. */
export class MovimentoDoTeste {
  readonly posicao: Vector3
  readonly velocidade = new Vector3()
  readonly percurso = new PercursoDoTeste()
  readonly raio: number
  noChao = false
  pausado = false
  caiu = false
  nadando = false
  modo: ModoDoTeste = 'terceira'
  private acumulado = 0
  private puloApertado = false
  private readonly inicio: Vector3
  private readonly degrau: number
  private readonly gravidade = 16

  constructor(
    private readonly mundo: MundoDoTeste,
    inicio: Vector3,
    readonly altura: number,
  ) {
    if (!Number.isFinite(altura) || altura < 0.3 || altura > 10)
      throw new Error('Escolha um personagem entre 0,3 e 10 metros de altura')
    this.posicao = inicio.clone()
    this.inicio = inicio.clone()
    this.raio = altura * 0.17
    this.degrau = altura * 0.19
  }
  definirModo(modo: ModoDoTeste) {
    if (this.modo === modo) return
    if (modo === 'voo' || this.modo === 'voo') this.percurso.finalizar(this.posicao)
    this.modo = modo
    this.velocidade.set(0, 0, 0)
    this.acumulado = 0
  }
  retomar() {
    this.percurso.finalizar(this.posicao)
    this.posicao.copy(this.inicio)
    this.velocidade.set(0, 0, 0)
    this.acumulado = 0
    this.noChao = false
    this.caiu = false
    this.pausado = true
  }
  avancar(delta: number, entrada: IntencaoDoMovimento) {
    if (this.pausado || this.caiu || !Number.isFinite(delta) || delta <= 0 || delta > 0.25) {
      this.acumulado = 0
      this.puloApertado = entrada.saltar
      return
    }
    const saltar = entrada.saltar && !this.puloApertado
    this.puloApertado = entrada.saltar
    this.acumulado += Math.min(delta, 0.1)
    let primeiro = true
    while (this.acumulado >= PASSO) {
      this.acumulado -= PASSO
      this.passo(entrada, saltar && primeiro)
      primeiro = false
    }
  }
  private passo(entrada: IntencaoDoMovimento, saltar: boolean) {
    const antes = this.posicao.clone(),
      noChaoAntes = this.noChao
    const direcao = new Vector3(entrada.x, 0, entrada.z)
    if (direcao.lengthSq() > 1) direcao.normalize()
    const velocidade = this.modo === 'voo' ? (entrada.correr ? 14 : 6) : entrada.correr ? 3.4 : 1.5
    const aceleracao = (direcao.lengthSq() ? 10 : 16) * PASSO
    this.velocidade.x = aproximar(this.velocidade.x, direcao.x * velocidade, aceleracao)
    this.velocidade.z = aproximar(this.velocidade.z, direcao.z * velocidade, aceleracao)
    if (this.modo === 'voo') {
      this.velocidade.y = aproximar(
        this.velocidade.y,
        Math.max(-1, Math.min(1, entrada.vertical)) * velocidade,
        aceleracao,
      )
      this.posicao.addScaledVector(this.velocidade, PASSO)
      this.noChao = false
      return
    }
    if (saltar && this.noChao)
      this.velocidade.y = Math.sqrt(2 * this.gravidade * this.altura * 0.55)
    this.velocidade.y = Math.max(-25, this.velocidade.y - this.gravidade * PASSO)
    const deslocamento = this.velocidade.clone().multiplyScalar(PASSO)
    let resultado = this.deslocar(this.posicao, deslocamento)
    // Autostep: testar o patamar dentro do alcance do pé antes de subir a cápsula.
    const bloqueioHorizontal = Math.hypot(
      resultado.posicao.x - antes.x - deslocamento.x,
      resultado.posicao.z - antes.z - deslocamento.z,
    )
    if (
      noChaoAntes &&
      !saltar &&
      this.velocidade.y <= 0 &&
      bloqueioHorizontal > 1e-5 &&
      resultado.normais.some((n) => n.y < LIMITE_DA_INCLINACAO)
    ) {
      const alcance = new Vector3(deslocamento.x, 0, deslocamento.z)
        .normalize()
        .multiplyScalar(this.raio + 0.03)
      const de = antes.clone().add(alcance)
      de.y += this.degrau + 0.01
      const ate = de.clone()
      ate.y = antes.y + 0.01
      const patamar = this.mundo.rastrear(de, ate)
      if (
        patamar &&
        patamar.normal.y >= LIMITE_DA_INCLINACAO &&
        patamar.ponto.y > antes.y + 0.01 &&
        patamar.ponto.y <= antes.y + this.degrau
      ) {
        const subida = patamar.ponto.y - antes.y + 0.0001
        const alto = this.mundo.resolver(
          antes.clone().add(new Vector3(0, subida, 0)),
          this.altura,
          this.raio,
        )
        if (
          alto.posicao.y >= antes.y + subida - 1e-4 &&
          Math.hypot(alto.posicao.x - antes.x, alto.posicao.z - antes.z) < 1e-4
        ) {
          const frente = this.mundo.resolver(
            alto.posicao.clone().add(new Vector3(deslocamento.x, 0, deslocamento.z)),
            this.altura,
            this.raio,
          )
          const melhora =
            Math.hypot(
              frente.posicao.x - antes.x - deslocamento.x,
              frente.posicao.z - antes.z - deslocamento.z,
            ) <
            bloqueioHorizontal - 1e-5
          if (melhora) resultado = frente
        }
      }
    }
    this.posicao.copy(resultado.posicao)
    this.noChao =
      resultado.normais.some((n) => n.y >= LIMITE_DA_INCLINACAO) && this.velocidade.y <= 0
    // Manter contato ao descer rampas pequenas; não atravessa buracos ou cola no fundo distante.
    if (!this.noChao && noChaoAntes && !saltar && this.velocidade.y <= 0) {
      const baixo = this.mundo.resolver(
        this.posicao.clone().add(new Vector3(0, -0.04, 0)),
        this.altura,
        this.raio,
      )
      if (baixo.normais.some((n) => n.y >= LIMITE_DA_INCLINACAO)) {
        this.posicao.copy(baixo.posicao)
        this.noChao = true
        resultado = baixo
      }
    }
    for (const n of resultado.normais) {
      if (n.y >= LIMITE_DA_INCLINACAO) {
        if (this.velocidade.y < 0) this.velocidade.y = 0
        continue
      }
      if (n.y >= 0 && n.y < LIMITE_DA_INCLINACAO) {
        // Encosta íngreme bloqueia a intenção horizontal, sem convertê-la em subida.
        const tamanho = Math.hypot(n.x, n.z)
        if (tamanho > 1e-8) {
          const nx = n.x / tamanho,
            nz = n.z / tamanho,
            produto = this.velocidade.x * nx + this.velocidade.z * nz
          if (produto < 0) {
            this.velocidade.x -= nx * produto
            this.velocidade.z -= nz * produto
          }
        }
        continue
      }
      const produto = this.velocidade.dot(n)
      if (produto < 0) this.velocidade.addScaledVector(n, -produto)
    }
    if (this.noChao) this.velocidade.y = 0
    this.percurso.passo(
      antes,
      this.posicao,
      PASSO,
      noChaoAntes && this.noChao && !this.nadando && !saltar,
    )
    if (this.posicao.y < this.inicio.y - 100) {
      this.caiu = true
      this.percurso.finalizar(this.posicao)
      this.velocidade.set(0, 0, 0)
    }
  }
  private deslocar(antes: Vector3, deslocamento: Vector3) {
    const passos = Math.max(1, Math.ceil(deslocamento.length() / (this.raio * 0.45)))
    const parte = deslocamento.clone().multiplyScalar(1 / passos)
    let resultado = this.mundo.resolver(antes.clone().add(parte), this.altura, this.raio)
    const normais = [...resultado.normais]
    for (let i = 1; i < passos; i++) {
      resultado = this.mundo.resolver(resultado.posicao.clone().add(parte), this.altura, this.raio)
      for (const n of resultado.normais)
        if (normais.length < 32 && !normais.some((anterior) => anterior.dot(n) > 0.999))
          normais.push(n)
    }
    return { ...resultado, normais }
  }
}
