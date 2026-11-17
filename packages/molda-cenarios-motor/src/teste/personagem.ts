import {
  type AnimationAction,
  AnimationMixer,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  type Vector3,
} from 'three'
import type { ModeloCarregado } from '../modelos'
import { animacoesNoLugar } from './animacoes'
import type { ConfiguracaoDoTeste } from './tipos'

/** Dono exclusivo do GLB animável desta sessão; não reutiliza nem altera a pose das instâncias. */
export class PersonagemDoTeste {
  readonly grupo = new Group()
  readonly altura: number
  readonly clipes: readonly string[]
  private readonly corpo = new Group()
  private readonly orientacao = new Group()
  private readonly recursos: { dispose(): void }[] = []
  private mixer: AnimationMixer | null = null
  private acao: AnimationAction | null = null
  private readonly acoes = new Map<string, AnimationAction>()
  private readonly posicoes = new Map<Object3D, Vector3>()
  private escolhas: ConfiguracaoDoTeste['clipes']
  private readonly pernas: Group[] = []
  private tempo = 0

  constructor(
    private readonly modelo: ModeloCarregado | null,
    config: ConfiguracaoDoTeste,
  ) {
    const alturaNativa = modelo ? modelo.caixa.max.y - modelo.caixa.min.y : 1.16
    if (alturaNativa < 0.001) throw new Error('O modelo não possui altura para um personagem')
    this.altura = config.altura ?? alturaNativa
    if (!Number.isFinite(this.altura) || this.altura < 0.3 || this.altura > 10)
      throw new Error('Ajuste o personagem para uma altura entre 0,3 e 10 metros')
    this.grupo.add(this.orientacao)
    this.orientacao.add(this.corpo)
    this.escolhas = config.clipes
    if (modelo) {
      const escala = this.altura / alturaNativa
      this.corpo.scale.setScalar(escala)
      this.corpo.position.set(
        (-(modelo.caixa.min.x + modelo.caixa.max.x) * escala) / 2,
        -modelo.caixa.min.y * escala,
        (-(modelo.caixa.min.z + modelo.caixa.max.z) * escala) / 2,
      )
      this.corpo.add(modelo.raiz)
      modelo.raiz.traverse((no) => {
        this.posicoes.set(no, no.position.clone())
        const malha = no as Mesh
        if (malha.isMesh) {
          malha.castShadow = true
          malha.receiveShadow = true
        }
      })
      this.mixer = new AnimationMixer(modelo.raiz)
      this.prepararClipes()
      this.clipes = [...this.acoes.keys()]
    } else {
      this.clipes = []
      const material = new MeshStandardMaterial({ color: '#3878bc', roughness: 0.8 }),
        pele = new MeshStandardMaterial({ color: '#edc898', roughness: 0.9 })
      const h = this.altura,
        tronco = new CapsuleGeometry(h * 0.13, h * 0.22, 5, 10),
        cabeca = new SphereGeometry(h * 0.13, 12, 8),
        perna = new CylinderGeometry(h * 0.052, h * 0.052, h * 0.37, 8)
      this.recursos.push(material, pele, tronco, cabeca, perna)
      const t = new Mesh(tronco, material)
      t.position.y = h * 0.56
      t.castShadow = true
      this.corpo.add(t)
      const c = new Mesh(cabeca, pele)
      c.position.y = h * 0.87
      c.castShadow = true
      this.corpo.add(c)
      for (const lado of [-1, 1]) {
        const pivo = new Group()
        pivo.position.set(lado * h * 0.075, h * 0.37, 0)
        const p = new Mesh(perna, material)
        p.position.y = -h * 0.185
        p.castShadow = true
        pivo.add(p)
        this.pernas.push(pivo)
        this.corpo.add(pivo)
      }
    }
    this.orientacao.rotation.y = config.giroDoModelo ?? 0
  }
  definirClipes(clipes: ConfiguracaoDoTeste['clipes']) {
    this.escolhas = clipes
    this.acao = null
    this.prepararClipes()
  }
  private prepararClipes() {
    if (!this.modelo || !this.mixer) return
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.modelo.raiz)
    this.acoes.clear()
    for (const clipe of animacoesNoLugar(
      this.modelo.raiz,
      this.modelo.animacoes ?? [],
      this.escolhas?.saltando,
      this.posicoes,
    ))
      if (clipe.duration > 0 && !this.acoes.has(clipe.name))
        this.acoes.set(clipe.name, this.mixer.clipAction(clipe))
  }
  atualizar(delta: number, velocidade: number, noChao: boolean, correndo: boolean) {
    this.tempo += delta
    const nome = !noChao
      ? this.escolhas?.saltando
      : velocidade > 0.1
        ? correndo
          ? this.escolhas?.correndo
          : this.escolhas?.andando
        : this.escolhas?.parado
    const proxima = nome ? (this.acoes.get(nome) ?? null) : null
    if (this.acao !== proxima) {
      this.acao?.fadeOut(0.15)
      proxima?.reset().fadeIn(0.15).play()
      this.acao = proxima
    }
    this.mixer?.update(delta)
    if (!this.modelo)
      for (const [i, p] of this.pernas.entries())
        p.rotation.x = noChao
          ? Math.sin(this.tempo * 8) * (i ? 1 : -1) * Math.min(0.6, velocidade * 0.22)
          : 0
  }
  descartar() {
    this.mixer?.stopAllAction()
    if (this.modelo) this.mixer?.uncacheRoot(this.modelo.raiz)
    this.grupo.removeFromParent()
    this.grupo.clear()
    this.modelo?.descartar()
    for (const r of this.recursos) r.dispose()
  }
}
