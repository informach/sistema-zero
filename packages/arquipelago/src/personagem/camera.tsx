import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { useMenosMovimento } from '../estado/preferencias'
import { GRUPOS_DO_RAIO_DA_CAMERA } from '../mundo/grupos'
import {
  ALTURA_DA_TERRA,
  alturaDaIlha,
  CAMERA_NO_ALTO,
  DISTANCIA_MINIMA_DA_CAMERA,
  FOLGA_DA_CAMERA,
  GRUA_DA_CAMERA,
  RAIO_DA_SONDA_DA_CAMERA,
  VOLTA_DA_CAMERA,
} from '../mundo/medidas'
import { distanciaDaCamera, pesoNoAlto } from '../sistemas/camera'

const IDENTIDADE = { x: 0, y: 0, z: 0, w: 1 }
/** Do ponto que a câmera olha (a cabeça) até o peito do avatar. */
const ALTURA_DO_PEITO = 0.7
/**
 * No cipó a câmera olha para um ponto entre o corpo e o meio do cipó (`movimento.foco`), e segue
 * mais devagar: o balanço passa pela tela sem a câmera correr atrás dele. Com menos movimento
 * pedido no sistema, ela olha só para o meio do cipó e fica quase parada.
 */
const FOCO_NO_CIPO = 0.55
const FOCO_NO_CIPO_COM_MENOS_MOVIMENTO = 1
/** O quanto a câmera fica mais lenta para seguir no cipó (6 por segundo no chão). */
const SEGUIR_NO_CIPO = 2.5

/**
 * Câmera em terceira pessoa. Arrastar (mouse ou dedo fora dos botões) gira em volta do
 * avatar; a roda aproxima. Dentro de casa ela sobe e chega mais perto, para ver o quarto todo.
 * Fora de casa, um raio do avatar até ela contra o que é sólido (troncos, paredes, chão) a traz
 * para perto quando bate, e lá no alto (deques e pontes) ela desce o ângulo para mostrar o caminho.
 */
export function Camera() {
  const { rastro, movimento } = useJogo()
  const dentro = useEstado((s) => s.dentroDeCasa)
  const menosMovimento = useMenosMovimento()
  const noCipo = useRef(0)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const distancia = useRef(9)
  const alvo = useRef(new Vector3())
  const desejada = useRef(new Vector3())
  const { world, rapier } = useRapier()
  const sonda = useRef(new rapier.Ball(RAIO_DA_SONDA_DA_CAMERA))
  const atual = useRef(9)
  const noAlto = useRef(0)
  const subida = useRef(0)
  const lado = useRef(1)
  const arrastandoAgora = useRef(false)

  useEffect(() => {
    const el = gl.domElement
    let arrastando: number | null = null
    let ultimoX = 0
    let ultimoY = 0
    const desce = (e: PointerEvent) => {
      arrastando = e.pointerId
      arrastandoAgora.current = true
      ultimoX = e.clientX
      ultimoY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (arrastando !== e.pointerId) return
      rastro.giro -= (e.clientX - ultimoX) * 0.006
      rastro.inclinacao = MathUtils.clamp(
        rastro.inclinacao + (e.clientY - ultimoY) * 0.004,
        0.12,
        1.25,
      )
      ultimoX = e.clientX
      ultimoY = e.clientY
    }
    const sobe = (e: PointerEvent) => {
      if (arrastando === e.pointerId) {
        arrastando = null
        arrastandoAgora.current = false
      }
    }
    const roda = (e: WheelEvent) => {
      e.preventDefault()
      distancia.current = MathUtils.clamp(distancia.current + e.deltaY * 0.01, 4, 18)
    }
    el.addEventListener('pointerdown', desce)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', sobe)
    el.addEventListener('pointercancel', sobe)
    el.addEventListener('wheel', roda, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', desce)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', sobe)
      el.removeEventListener('pointercancel', sobe)
      el.removeEventListener('wheel', roda)
    }
  }, [gl, rastro])

  useFrame((_, dt) => {
    // No cipó, o alvo vai aos poucos para perto do meio do cipó e a câmera segue mais devagar.
    const foco =
      movimento.modo === 'cipo'
        ? menosMovimento
          ? FOCO_NO_CIPO_COM_MENOS_MOVIMENTO
          : FOCO_NO_CIPO
        : 0
    noCipo.current += (foco - noCipo.current) * (1 - Math.exp(-dt * 4))
    const f = noCipo.current
    const k = 1 - Math.exp(-dt * (6 - SEGUIR_NO_CIPO * Math.min(1, f / FOCO_NO_CIPO)))
    const ax = rastro.x + (movimento.foco.x - rastro.x) * f
    const ay = rastro.y + 0.9 + (movimento.foco.y - rastro.y - 0.9) * f
    const az = rastro.z + (movimento.foco.z - rastro.z) * f
    alvo.current.x += (ax - alvo.current.x) * k
    alvo.current.y += (ay - alvo.current.y) * k
    alvo.current.z += (az - alvo.current.z) * k
    // Lá no alto, o ângulo desce e a câmera chega perto (passa por baixo das copas).
    const alto = pesoNoAlto(rastro.y - 0.9 - ALTURA_DA_TERRA, CAMERA_NO_ALTO.acimaDoChao)
    noAlto.current += (alto - noAlto.current) * k
    const n = dentro ? 0 : noAlto.current
    let inclinacao = dentro ? Math.max(rastro.inclinacao, 0.95) : rastro.inclinacao
    inclinacao = MathUtils.lerp(
      inclinacao,
      Math.min(inclinacao, CAMERA_NO_ALTO.inclinacaoMaxima),
      n,
    )
    let dist = dentro ? Math.min(distancia.current, 8) : distancia.current
    dist = MathUtils.lerp(dist, Math.min(dist, CAMERA_NO_ALTO.distanciaMaxima), n)
    // Uma bolinha lançada até a câmera (não um raio fino): o que é sólido no caminho a puxa para
    // perto, sem raspar a quina de um tronco nem deixar o corpo do avatar escondido atrás dele.
    // Dentro de casa o telhado sai e a vista de cima é a de sempre.
    const lancar = (incl: number, giro = rastro.giro) => {
      const direcao = {
        x: Math.sin(giro) * Math.cos(incl),
        y: Math.sin(incl),
        z: Math.cos(giro) * Math.cos(incl),
      }
      // Da cabeça e do peito: um tronco que esconde só o corpo também conta.
      let livre = dist
      for (const abaixo of [0, ALTURA_DO_PEITO]) {
        const de = { x: alvo.current.x, y: alvo.current.y - abaixo, z: alvo.current.z }
        const bateu = world.castShape(
          de,
          IDENTIDADE,
          direcao,
          sonda.current,
          0,
          dist + FOLGA_DA_CAMERA,
          // Começar encostado num tronco (escalando, ou de pé junto dele) e se afastar não é
          // bater: só conta o que entra mais no sólido. Com `true`, a bolinha que já sai
          // encostando parava na hora para qualquer lado e a câmera ia para dentro da cabeça.
          false,
          rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          GRUPOS_DO_RAIO_DA_CAMERA,
        )
        if (bateu) livre = Math.min(livre, bateu.time_of_impact - FOLGA_DA_CAMERA)
      }
      return livre
    }
    // Tapada de perto (o tronco atrás, no deque): primeiro a câmera gira para o lado livre, como
    // nos jogos de terceira pessoa (o controle gira junto, a frente continua sendo a da tela);
    // sem lado livre, sobe por cima do ombro. Os dois andam aos poucos, e o raio final é o da
    // posição em que a câmera está de verdade.
    let alvoDaSubida = 0
    const tapada = !dentro && lancar(inclinacao) < dist * GRUA_DA_CAMERA.tapada
    let girou = false
    if (tapada && !arrastandoAgora.current) {
      for (const angulo of GRUA_DA_CAMERA.giros) {
        for (const sentido of [lado.current, -lado.current]) {
          const giro = rastro.giro + sentido * angulo
          if (lancar(inclinacao, giro) < dist * GRUA_DA_CAMERA.basta) continue
          const passo = Math.min(angulo, GRUA_DA_CAMERA.giroPorSegundo * dt)
          rastro.giro += sentido * passo
          lado.current = sentido
          girou = true
          break
        }
        if (girou) break
      }
    }
    if (tapada && !girou) {
      let melhor = lancar(inclinacao)
      for (const extra of GRUA_DA_CAMERA.subidas) {
        const livreAqui = lancar(Math.min(inclinacao + extra, GRUA_DA_CAMERA.inclinacaoMaxima))
        if (livreAqui > melhor + GRUA_DA_CAMERA.ganhoMinimo) {
          melhor = livreAqui
          alvoDaSubida = extra
        }
      }
    }
    subida.current += (alvoDaSubida - subida.current) * k
    inclinacao = Math.min(
      inclinacao + subida.current,
      Math.max(inclinacao, GRUA_DA_CAMERA.inclinacaoMaxima),
    )
    const dx = Math.sin(rastro.giro) * Math.cos(inclinacao)
    const dy = Math.sin(inclinacao)
    const dz = Math.cos(rastro.giro) * Math.cos(inclinacao)
    const livre = dentro ? dist : lancar(inclinacao)
    const antes = atual.current
    atual.current = distanciaDaCamera(
      antes,
      dist,
      livre,
      dt,
      VOLTA_DA_CAMERA,
      DISTANCIA_MINIMA_DA_CAMERA,
    )
    desejada.current.set(
      alvo.current.x + dx * atual.current,
      alvo.current.y + dy * atual.current,
      alvo.current.z + dz * atual.current,
    )
    // Não entra no chão.
    const chao = alturaDaIlha(desejada.current.x, desejada.current.z) + 0.6
    if (desejada.current.y < chao) desejada.current.y = chao
    // Encostando numa parede, vai direto (seguir devagar passaria por dentro dela).
    if (atual.current < antes - 0.01) camera.position.copy(desejada.current)
    else camera.position.lerp(desejada.current, k)
    camera.lookAt(alvo.current)
  })
  return null
}
