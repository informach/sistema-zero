import { type PerspectiveCamera, type Scene, Vector3 } from 'three'
import type { MundoDoTeste } from './colisoes'
import { ControlesDoTeste } from './controles'
import { MovimentoDoTeste } from './movimento'
import type { PersonagemDoTeste } from './personagem'
import type { ComandoDoTeste, ConfiguracaoDoTeste, EntradaDoTeste, EstadoDoTeste } from './tipos'

export class SessaoDoTeste {
  private readonly movimento: MovimentoDoTeste
  private readonly controles: ControlesDoTeste
  private yaw: number
  private pitch = -0.22
  private ultimo = performance.now()
  private aviso = 0
  private readonly direcao = new Vector3()
  constructor(
    canvas: HTMLCanvasElement,
    private readonly camera: PerspectiveCamera,
    cena: Scene,
    private readonly mundo: MundoDoTeste,
    private readonly personagem: PersonagemDoTeste,
    inicio: Vector3,
    config: ConfiguracaoDoTeste,
    private readonly aoEstado: (estado: EstadoDoTeste) => void,
    private readonly pedirQuadro: () => void,
  ) {
    this.movimento = new MovimentoDoTeste(mundo, inicio, personagem.altura)
    this.movimento.definirModo(config.modo)
    camera.getWorldDirection(this.direcao)
    this.yaw = Math.atan2(-this.direcao.x, -this.direcao.z)
    this.controles = new ControlesDoTeste(
      canvas,
      (x, y) => {
        if (this.movimento.pausado) return
        this.yaw -= x * 0.004
        this.pitch = Math.max(-1.3, Math.min(1.1, this.pitch - y * 0.003))
        this.pedirQuadro()
      },
      () => this.comandar({ pausado: true }),
    )
    cena.add(personagem.grupo)
    this.atualizarCamera()
    this.informar()
  }
  estado(): EstadoDoTeste {
    const m = this.movimento
    return {
      modo: m.modo,
      pausado: m.pausado,
      caiu: m.caiu,
      noChao: m.noChao,
      nadando: m.nadando,
      posicao: { x: m.posicao.x, y: m.posicao.y, z: m.posicao.z },
      altura: m.altura,
      velocidade: Math.hypot(m.velocidade.x, m.velocidade.z),
      clipes: this.personagem.clipes,
      percurso: m.percurso.ler(),
    }
  }
  comandar(comando: ComandoDoTeste) {
    const m = this.movimento
    if (comando.modo) m.definirModo(comando.modo)
    if (comando.retomarInicio) m.retomar()
    if (comando.pausado !== undefined) {
      m.pausado = comando.pausado
      this.controles.limpar()
      this.ultimo = performance.now()
    }
    if (comando.percurso === 'iniciar' && m.modo !== 'voo' && !m.caiu) m.percurso.iniciar(m.posicao)
    if (comando.percurso === 'finalizar') m.percurso.finalizar(m.posicao)
    if (comando.percurso === 'zerar') m.percurso.zerar()
    if (comando.clipes) this.personagem.definirClipes(comando.clipes)
    this.informar()
    this.pedirQuadro()
  }
  entrada(entrada: Partial<EntradaDoTeste>) {
    this.controles.definirToque(entrada)
    this.pedirQuadro()
  }
  quadro(): boolean {
    const agora = performance.now(),
      delta = (agora - this.ultimo) / 1000
    this.ultimo = agora
    const entrada = this.controles.entrada(),
      m = this.movimento
    const cos = Math.cos(this.yaw),
      sin = Math.sin(this.yaw)
    m.avancar(delta, {
      x: entrada.lado * cos - entrada.frente * sin,
      z: -entrada.frente * cos - entrada.lado * sin,
      vertical: entrada.vertical,
      correr: entrada.correr,
      saltar: entrada.saltar,
    })
    const velocidade = Math.hypot(m.velocidade.x, m.velocidade.z)
    if (velocidade > 0.05)
      this.personagem.grupo.rotation.y = Math.atan2(m.velocidade.x, m.velocidade.z)
    this.personagem.grupo.position.copy(m.posicao)
    if (!m.pausado && !m.caiu && delta < 0.25)
      this.personagem.atualizar(Math.min(0.1, delta), velocidade, m.noChao, entrada.correr)
    this.atualizarCamera()
    if (agora - this.aviso > 100) {
      this.aviso = agora
      this.informar()
    }
    return !m.pausado && !m.caiu
  }
  private atualizarCamera() {
    const m = this.movimento,
      h = m.altura
    const alvo = m.posicao.clone()
    alvo.y += h * 0.86
    this.direcao.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    )
    if (m.modo === 'terceira') {
      const distancia = h * 3.2,
        destino = alvo.clone().addScaledVector(this.direcao, -distancia)
      let livre = distancia
      // Leque conservador cobre o centro e as bordas próximas da câmera.
      const lateral = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(
        h * 0.13,
      )
      for (const fator of [-1, 0, 1]) {
        const origem = alvo.clone().addScaledVector(lateral, fator),
          ate = destino.clone().addScaledVector(lateral, fator)
        const hit = this.mundo.rastrear(origem, ate)
        if (hit) livre = Math.min(livre, Math.max(h * 0.12, hit.distancia - h * 0.16))
      }
      this.camera.position.copy(alvo).addScaledVector(this.direcao, -livre)
      this.camera.lookAt(alvo)
      this.personagem.grupo.visible = livre > h * 0.6
    } else {
      this.camera.position.copy(alvo)
      this.camera.lookAt(alvo.add(this.direcao))
      this.personagem.grupo.visible = false
    }
    this.camera.near = Math.max(0.005, h * 0.015)
    this.camera.updateProjectionMatrix()
  }
  private informar() {
    this.aoEstado(this.estado())
  }
  descartar() {
    this.controles.descartar()
    this.personagem.descartar()
    this.mundo.descartar()
  }
}
