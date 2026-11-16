import {
  AmbientLight,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three'
import { lerGlb } from './modelos'

export interface FotoDoModelo {
  /** Retrato quadrado com fundo transparente. */
  miniatura: Blob
  min: [number, number, number]
  max: [number, number, number]
  triangulos: number
  partes: number
}

interface Fotografo {
  renderer: WebGLRenderer
  cena: Scene
  camera: PerspectiveCamera
  palco: Group
}

let fotografo: Fotografo | null = null
let fila: Promise<unknown> = Promise.resolve()

function pegarFotografo(lado: number): Fotografo {
  if (!fotografo) {
    const renderer = new WebGLRenderer({
      canvas: document.createElement('canvas'),
      antialias: true,
      alpha: true,
    })
    renderer.setClearColor(0x000000, 0)
    const cena = new Scene()
    const sol = new DirectionalLight(0xffffff, 1.7)
    sol.position.set(4, 8, 5)
    const palco = new Group()
    cena.add(new AmbientLight(0xffffff, 2.1), sol, palco)
    fotografo = { renderer, cena, camera: new PerspectiveCamera(30, 1, 0.01, 4000), palco }
  }
  fotografo.renderer.setSize(lado, lado, false)
  return fotografo
}

function paraBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolver, recusar) => {
    const entregar = (blob: Blob | null) =>
      blob ? resolver(blob) : recusar(new Error('Não foi possível gerar a miniatura'))
    canvas.toBlob(
      (webp) =>
        webp && webp.type === 'image/webp' ? resolver(webp) : canvas.toBlob(entregar, 'image/png'),
      'image/webp',
      0.9,
    )
  })
}

async function fotografar(bytes: ArrayBuffer, lado: number): Promise<FotoDoModelo> {
  const modelo = await lerGlb(bytes)
  const f = pegarFotografo(lado)
  try {
    for (const parte of modelo.partes) {
      const malha = new Mesh(parte.geometria, parte.material)
      malha.matrixAutoUpdate = false
      malha.matrix.copy(parte.matriz)
      f.palco.add(malha)
    }
    const esfera = modelo.caixa.getBoundingSphere(new Sphere())
    const raio = Math.max(0.01, esfera.radius)
    const distancia = raio / Math.sin(((f.camera.fov / 2) * Math.PI) / 180)
    f.camera.position
      .copy(esfera.center)
      .addScaledVector(new Vector3(0.62, 0.48, 0.62).normalize(), distancia * 1.04)
    f.camera.near = Math.max(0.001, distancia - raio * 1.5)
    f.camera.far = distancia + raio * 3
    f.camera.lookAt(esfera.center)
    f.camera.updateProjectionMatrix()
    f.renderer.render(f.cena, f.camera)
    // O retrato é tirado na hora da chamada; o arquivo só fica pronto depois.
    const miniatura = await paraBlob(f.renderer.domElement)
    const { min, max } = modelo.caixa
    return {
      miniatura,
      min: [min.x, min.y, min.z],
      max: [max.x, max.y, max.z],
      triangulos: modelo.triangulos,
      partes: modelo.partes.length,
    }
  } finally {
    f.palco.clear()
    modelo.descartar()
  }
}

/** Mede e fotografa um modelo. Um por vez, com um desenhista só para todas as fotos. */
export function fotografarModelo(bytes: ArrayBuffer, lado = 256): Promise<FotoDoModelo> {
  const vez = fila.then(
    () => fotografar(bytes, lado),
    () => fotografar(bytes, lado),
  )
  fila = vez.catch(() => undefined)
  return vez
}

/** Solta o desenhista das fotos (ao sair da tela de bibliotecas, por exemplo). */
export function encerrarFotografo(): Promise<void> {
  const encerramento = fila.then(() => {
    fotografo?.renderer.dispose()
    fotografo?.renderer.forceContextLoss()
    fotografo = null
  })
  fila = encerramento.catch(() => undefined)
  return encerramento
}
