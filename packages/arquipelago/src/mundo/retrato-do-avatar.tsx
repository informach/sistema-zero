import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  type Scene,
  type SkinnedMesh,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { useJogo } from '../estado/contexto'
import { lojaDoRetrato } from '../estado/retrato'
import { enquadrarRetrato, RETRATO } from '../sistemas/retrato'

/** A camada só do retrato: o avatar e a luz própria dele; o resto do mundo não aparece. */
const CAMADA_DO_RETRATO = 7
/** De quanto em quanto tempo confere se a roupa do avatar mudou (segundos de quadro). */
const CONFERIR_A_CADA = 2
/** Parado há quanto tempo para tirar (o retrato sai na pose parada, sem a passada no meio). */
const PARADO_HA = 0.6

/**
 * O retrato do avatar da HUD (`estado/retrato.ts`): de dentro do `<Canvas>`, desenha só o avatar
 * (`avatar-visual`) numa imagem pequena, de frente, com o enquadramento da foto de rosto da
 * plataforma (`sistemas/retrato.ts`), fundo transparente. Tira quando o avatar fica parado e
 * de novo quando as peças mudam. Não mexe na câmera do jogo nem no desenho da tela.
 */
export function RetratoDoAvatar() {
  const { loja, rastro } = useJogo()
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useMemo(() => {
    const c = new PerspectiveCamera(RETRATO.campo, 1, 0.05, 20)
    c.layers.set(CAMADA_DO_RETRATO)
    return c
  }, [])
  const alvo = useMemo(() => new WebGLRenderTarget(RETRATO.lado, RETRATO.lado, { samples: 4 }), [])
  useEffect(() => () => alvo.dispose(), [alvo])
  // A luz do retrato, de frente como a da foto da plataforma: só a câmera do retrato a vê (a
  // camada dela), então a luz do jogo não muda e o retrato não fica escuro de noite ou contra o sol.
  const luz = useMemo(() => {
    const ambiente = new AmbientLight('#ffffff', 1.4)
    const frente = new DirectionalLight('#fff4e6', 1.8)
    for (const l of [ambiente, frente]) l.layers.set(CAMADA_DO_RETRATO)
    return { ambiente, frente }
  }, [])
  useEffect(() => {
    scene.add(luz.ambiente, luz.frente, luz.frente.target)
    return () => {
      scene.remove(luz.ambiente, luz.frente, luz.frente.target)
    }
  }, [scene, luz])
  const estado = useRef({ assinatura: '', tirada: '', espera: 0, parado: 0 })

  useFrame((_, dt) => {
    const e = estado.current
    e.parado = (rastro.velocidade ?? 0) < 0.05 ? e.parado + dt : 0
    e.espera -= dt
    if (e.espera > 0) return
    e.espera = CONFERIR_A_CADA
    const avatar = scene.getObjectByName('avatar-visual')
    if (!avatar?.visible) return
    const malhas: Mesh[] = []
    avatar.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh && m.visible) malhas.push(m)
    })
    if (!malhas.length) return
    e.assinatura = malhas.map((m) => m.geometry.uuid).join(',')
    if (e.assinatura === e.tirada || e.parado < PARADO_HA) return
    const imagem = tirarRetrato(gl, scene, camera, alvo, avatar, malhas, luz.frente)
    if (!imagem) return
    e.tirada = e.assinatura
    lojaDoRetrato(loja).setState({ imagem })
  })
  return null
}

const caixa = new Box3()
const pedaco = new Box3()
const deMalha = new Vector3()

function tirarRetrato(
  gl: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  alvo: WebGLRenderTarget,
  avatar: Object3D,
  malhas: Mesh[],
  frente: DirectionalLight,
): string | null {
  // A caixa no referencial do próprio avatar (ele olha para +z), como a foto da plataforma.
  avatar.updateWorldMatrix(true, true)
  const paraOAvatar = avatar.matrixWorld.clone().invert()
  caixa.makeEmpty()
  for (const m of malhas) {
    // As peças do avatar têm esqueleto: a caixa da geometria fica no espaço de origem dos ossos
    // (minúscula); a da malha com esqueleto já vem na pose.
    const comOssos = m as SkinnedMesh
    if (comOssos.isSkinnedMesh) comOssos.computeBoundingBox()
    else if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
    const b = comOssos.isSkinnedMesh ? comOssos.boundingBox : m.geometry.boundingBox
    if (!b) continue
    pedaco.copy(b).applyMatrix4(m.matrixWorld).applyMatrix4(paraOAvatar)
    caixa.union(pedaco)
  }
  if (caixa.isEmpty() || caixa.max.y - caixa.min.y < 0.3) return null
  const q = enquadrarRetrato(caixa)
  camera.position.copy(avatar.localToWorld(deMalha.set(q.posicao.x, q.posicao.y, q.posicao.z)))
  camera.lookAt(avatar.localToWorld(deMalha.set(q.alvo.x, q.alvo.y, q.alvo.z)))
  camera.updateMatrixWorld()

  // A luz vem de cima e um pouco do lado da câmera, olhando para o rosto.
  frente.position
    .copy(camera.position)
    .add(deMalha.set(0.6, 0.8, 0).applyQuaternion(camera.quaternion))
  avatar.localToWorld(frente.target.position.set(q.alvo.x, q.alvo.y, q.alvo.z))
  frente.updateMatrixWorld()
  frente.target.updateMatrixWorld()
  for (const o of malhas) o.layers.enable(CAMADA_DO_RETRATO)
  const fundo = scene.background
  const nevoa = scene.fog
  const antes = gl.getRenderTarget()
  const corAntes = gl.getClearAlpha()
  scene.background = null
  scene.fog = null
  try {
    gl.setRenderTarget(alvo)
    gl.setClearAlpha(0)
    gl.clear()
    gl.render(scene, camera)
    const lado = RETRATO.lado
    const px = new Uint8Array(lado * lado * 4)
    gl.readRenderTargetPixels(alvo, 0, 0, lado, lado, px)
    const tela = document.createElement('canvas')
    tela.width = tela.height = lado
    const ctx = tela.getContext('2d')
    if (!ctx) return null
    const img = ctx.createImageData(lado, lado)
    // O WebGL lê de baixo para cima.
    for (let y = 0; y < lado; y++)
      img.data.set(px.subarray((lado - 1 - y) * lado * 4, (lado - y) * lado * 4), y * lado * 4)
    ctx.putImageData(img, 0, 0)
    return tela.toDataURL('image/png')
  } finally {
    gl.setRenderTarget(antes)
    gl.setClearAlpha(corAntes)
    scene.background = fundo
    scene.fog = nevoa
    for (const o of malhas) o.layers.disable(CAMADA_DO_RETRATO)
  }
}
