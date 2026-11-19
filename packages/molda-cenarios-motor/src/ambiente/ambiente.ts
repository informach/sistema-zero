import type { CenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type DocumentoDeCenario,
  type FonteDeAlturas,
  type IluminacaoDeCenario,
  IluminacaoSchema,
  type TexturaDoCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  BackSide,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  type PerspectiveCamera,
  type Scene,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  Vector3,
} from 'three'
import { luzDaHora } from '../matematica'
import { LuzesLocaisDoPalco } from './luzes-locais'
import { configurarSombra, liberarMapasDeSombra } from './sombras'

const VERTICE = /* glsl */ `
varying vec3 vDirecao;
void main() {
  vDirecao = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const FRAGMENTO = /* glsl */ `
uniform vec3 uCeu;
uniform vec3 uHorizonte;
varying vec3 vDirecao;
void main() {
  float t = pow(clamp(vDirecao.y * 1.6, 0.0, 1.0), 0.55);
  gl_FragColor = vec4(mix(uHorizonte, uCeu, t), 1.0);
  #include <colorspace_fragment>
}`
export interface EstadoDoAmbiente {
  ceu: 'padrao' | 'cor' | 'panorama' | 'carregando' | 'erro'
  luzes: number
  sombrasLocais: number
  resolucaoDasSombrasLocais: number
  carregando: number
  falhas: string[]
}
export type ObterTexturaDoCeu = (ref: TexturaDoCenario) => { textura?: Texture; erro?: string }

/** Ambiente autoral. Hora fornece o padrão; overrides não alteram o documento nem o personagem. */
export class AmbienteDoPalco {
  readonly grupo = new Group()
  private readonly sol = new DirectionalLight(0xffffff, 1.7)
  private readonly ambiente = new HemisphereLight(0xffffff, 0x8a9a7a, 2)
  private readonly nevoa = new Fog(0xdff1fb, 200, 1800)
  private readonly locais = new LuzesLocaisDoPalco()
  private readonly ceu = new Mesh(
    new SphereGeometry(1, 32, 16),
    new ShaderMaterial({
      vertexShader: VERTICE,
      fragmentShader: FRAGMENTO,
      uniforms: { uCeu: { value: new Color() }, uHorizonte: { value: new Color() } },
      side: BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  )
  private readonly direcao = new Vector3()
  private readonly corDeFundo = new Color()
  private parametros: IluminacaoDeCenario = { hora: 12 }
  private nevoaBase = { perto: 200, longe: 1800 }
  private panorama: { original: Texture; textura: Texture } | null = null
  private destruido = false
  private readonly resolucaoLocal: number
  constructor(
    private readonly cena: Scene,
    private readonly fotografia = false,
    private readonly maxTextura = 8192,
  ) {
    this.resolucaoLocal = Math.max(16, Math.min(512, MathUtils.floorPowerOfTwo(maxTextura / 4)))
    this.sol.shadow.mapSize.set(2048, 2048)
    this.sol.shadow.bias = -0.0004
    this.sol.shadow.normalBias = 0.05
    this.ceu.scale.setScalar(3000)
    this.ceu.renderOrder = -1000
    this.ceu.frustumCulled = false
    this.grupo.add(this.sol, this.sol.target, this.ambiente, this.ceu, this.locais.grupo)
    cena.add(this.grupo)
    this.aplicarParametros({ hora: 12 })
    this.atualizarNevoa(0, 0)
  }
  definir(
    doc: DocumentoDeCenario,
    fonte: FonteDeAlturas | undefined,
    obterTextura: ObterTexturaDoCeu,
  ): EstadoDoAmbiente {
    return this.definirResolvido(
      doc.iluminacao,
      (id) => {
        const ref = doc.texturas?.find((t) => t.id === id)
        return ref ? obterTextura(ref) : { erro: 'O panorama não está na tabela de texturas.' }
      },
      () => this.locais.definir(doc, fonte, this.resolucaoLocal),
    )
  }
  definirCompilado(cena: CenaCompilada, obter: (id: string) => ReturnType<ObterTexturaDoCeu>) {
    return this.definirResolvido(cena.ambiente, obter, () =>
      this.locais.definirCompiladas(cena.marcadores, this.resolucaoLocal),
    )
  }
  private definirResolvido(
    parametros: IluminacaoDeCenario,
    obter: (id: string) => ReturnType<ObterTexturaDoCeu>,
    definirLocais: () => { luzes: number; sombras: number; carregando: number },
  ): EstadoDoAmbiente {
    const estado: EstadoDoAmbiente = {
      ceu: 'padrao',
      luzes: 0,
      sombrasLocais: 0,
      resolucaoDasSombrasLocais: this.resolucaoLocal,
      carregando: 0,
      falhas: [],
    }
    if (this.destruido) return estado
    const p = IluminacaoSchema.parse(parametros)
    this.aplicarParametros(p)
    let original: Texture | undefined
    if (p.ceu?.tipo === 'cor') {
      estado.ceu = 'cor'
      this.corDeFundo.set(p.ceu.cor)
      this.nevoa.color.copy(this.corDeFundo)
      if (!this.fotografia) {
        this.cena.background = this.corDeFundo
        this.ceu.visible = false
      }
    } else if (p.ceu?.tipo === 'panorama' && !this.fotografia) {
      const ceu = p.ceu,
        recurso = obter(ceu.textura)
      original = recurso.textura
      if (recurso.erro) {
        estado.ceu = 'erro'
        estado.falhas.push(recurso.erro)
      } else if (!original) {
        estado.ceu = 'carregando'
        estado.carregando++
      } else {
        const imagem =
            original.image && typeof original.image === 'object'
              ? (original.image as Record<string, unknown>)
              : {},
          largura = imagem.naturalWidth ?? imagem.width,
          altura = imagem.naturalHeight ?? imagem.height
        if (
          typeof largura !== 'number' ||
          typeof altura !== 'number' ||
          !Number.isFinite(largura) ||
          !Number.isFinite(altura) ||
          largura <= 0 ||
          altura <= 0 ||
          largura !== altura * 2
        ) {
          estado.ceu = 'erro'
          original = undefined
          estado.falhas.push('Escolha um panorama equiretangular com proporção 2:1.')
        } else {
          if (this.panorama?.original !== original) {
            this.liberarPanorama()
            const textura = original.clone()
            textura.mapping = EquirectangularReflectionMapping
            textura.needsUpdate = true
            this.panorama = { original, textura }
          }
          this.cena.background = this.panorama!.textura
          this.cena.backgroundRotation.y = p.ceu.giro
          this.cena.backgroundIntensity = p.ceu.intensidade
          this.ceu.visible = false
          estado.ceu = 'panorama'
        }
      }
    }
    if (this.panorama && this.panorama.original !== original) this.liberarPanorama()
    this.atualizarNevoa(0, 0)
    try {
      const locais = definirLocais()
      estado.luzes = locais.luzes
      estado.sombrasLocais = locais.sombras
      estado.carregando += locais.carregando
    } catch (e) {
      this.locais.limpar()
      estado.falhas.push(e instanceof Error ? e.message : 'Não consegui preparar as luzes locais.')
    }
    return estado
  }
  private aplicarParametros(p: IluminacaoDeCenario) {
    const hora = luzDaHora(p.hora)
    this.parametros = p
    this.direcao
      .set(
        p.sol?.direcao.x ?? hora.sol.x,
        p.sol?.direcao.y ?? hora.sol.y,
        p.sol?.direcao.z ?? hora.sol.z,
      )
      .normalize()
    if (p.sol) this.sol.color.set(p.sol.cor)
    else this.sol.color.setHex(hora.corDoSol)
    this.sol.intensity = p.sol?.intensidade ?? hora.forcaDoSol
    configurarSombra(
      this.sol,
      p.sol?.sombra ?? true,
      Math.min(p.sombras?.resolucao ?? 2048, this.maxTextura),
    )
    this.ambiente.intensity = p.ambiente?.intensidade ?? hora.forcaDoCeu
    this.ambiente.color.set(p.ambiente?.ceu ?? '#ffffff')
    this.ambiente.groundColor.set(p.ambiente?.chao ?? '#8a9a7a')
    this.ceu.material.uniforms.uCeu!.value.setHex(hora.corDoCeu)
    this.ceu.material.uniforms.uHorizonte!.value.setHex(hora.corDoHorizonte)
    this.nevoa.color.setHex(hora.corDoHorizonte)
    this.cena.background = null
    this.cena.backgroundRotation.set(0, 0, 0)
    this.cena.backgroundIntensity = 1
    this.ceu.visible = !this.fotografia
  }
  definirNevoaDaBase(perto: number, longe: number) {
    this.nevoaBase = { perto, longe }
  }
  atualizarNevoa(inicio: number, fim: number) {
    const n = this.parametros.nevoa
    this.cena.fog = this.fotografia || n?.tipo === 'nenhuma' ? null : this.nevoa
    if (n?.tipo === 'linear') {
      this.nevoa.color.set(n.cor)
      this.nevoa.near = n.perto
      this.nevoa.far = n.longe
    } else {
      this.nevoa.near = Math.max(this.nevoaBase.perto, inicio)
      this.nevoa.far = Math.max(this.nevoaBase.longe, fim, this.nevoa.near + 1)
    }
  }
  quadro(camera: PerspectiveCamera, alvo: Vector3) {
    if (this.destruido) return
    this.ceu.position.copy(camera.position)
    const alcance =
        this.parametros.sombras?.alcance ??
        Math.min(260, Math.max(24, camera.position.distanceTo(alvo) * 1.4)),
      sombra = this.sol.shadow.camera
    if (
      this.parametros.sombras
        ? sombra.right !== alcance
        : Math.abs(sombra.right - alcance) > alcance * 0.08
    ) {
      sombra.left = -alcance
      sombra.right = alcance
      sombra.top = alcance
      sombra.bottom = -alcance
      sombra.near = 1
      sombra.far = 900
      sombra.updateProjectionMatrix()
    }
    this.sol.target.position.copy(alvo)
    this.sol.position.copy(alvo).addScaledVector(this.direcao, 400)
  }
  private liberarPanorama() {
    if (!this.panorama) return
    if (this.cena.background === this.panorama.textura) this.cena.background = null
    this.panorama.textura.dispose()
    this.panorama = null
  }
  descartar() {
    if (this.destruido) return
    this.destruido = true
    this.liberarPanorama()
    this.locais.descartar()
    liberarMapasDeSombra(this.sol)
    this.ceu.geometry.dispose()
    this.ceu.material.dispose()
    this.cena.remove(this.grupo)
    this.cena.background = null
    this.cena.fog = null
    this.grupo.clear()
  }
}
