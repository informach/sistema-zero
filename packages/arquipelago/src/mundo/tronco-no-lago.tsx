import {
  CylinderCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import propsGlb from '../assets/ilhas/bosque-props.glb'
import type { AguaRasa } from '../estado/contexto'
import { EMPUXO, forcaDaAgua, pontosDoTronco, type Vetor } from '../sistemas/empuxo'
import { MATERIAIS, massaDe } from '../sistemas/materiais-fisicos'
import { dentroDaAgua } from './bosque'
import { GRAVIDADE, PASSO_DA_FISICA } from './medidas'
import { copiarNo, useModelo } from './modelos'

const URL_DAS_PECAS = new URL(propsGlb, import.meta.url).href

/** O tronco que boia (a `tora-que-boia` do `bosque-props.glb`, `TORA_QUE_BOIA` no `bosque.py`). */
export const TRONCO_QUE_BOIA = { comprimento: 1.6, raio: 0.16 } as const
const VOLUME = Math.PI * TRONCO_QUE_BOIA.raio ** 2 * TRONCO_QUE_BOIA.comprimento
const MASSA = massaDe('madeira', VOLUME)
/** Os quatro pontos de flutuação, ao longo do X do corpo (o exemplo prático do levantamento). */
const PONTOS = pontosDoTronco(TRONCO_QUE_BOIA.comprimento)
const VOLUME_DO_PONTO = VOLUME / PONTOS.length
/** Mais baixo que isto abaixo da superfície do lago, ele caiu da ilha (o lago tem 0,85 de fundo). */
const CAIU_DA_ILHA = 3
/** O giro freado no ar (na água soma o `EMPUXO.giroNaAgua`). */
const GIRO_NO_AR = 0.3

/** O tronco agora, para o medidor (`__arquipelagoDesenho.tronco`): onde está e quanto está na água. */
export const troncoAgora = { x: 0, y: 0, z: 0, submersa: 0, dormindo: false, montado: false }

// Contas do passo, sem alocar.
const noMundo: Vetor = { x: 0, y: 0, z: 0 }
const velDoPonto: Vetor = { x: 0, y: 0, z: 0 }
const forca: Vetor = { x: 0, y: 0, z: 0 }
const impulso: Vetor = { x: 0, y: 0, z: 0 }
const ponto: Vetor = { x: 0, y: 0, z: 0 }

/** `v` girado pelo quatérnio `q` (escrito em `saida`). */
function girar(q: { x: number; y: number; z: number; w: number }, v: Vetor, saida: Vetor): void {
  const tx = 2 * (q.y * v.z - q.z * v.y)
  const ty = 2 * (q.z * v.x - q.x * v.z)
  const tz = 2 * (q.x * v.y - q.y * v.x)
  saida.x = v.x + q.w * tx + (q.y * tz - q.z * ty)
  saida.y = v.y + q.w * ty + (q.z * tx - q.x * tz)
  saida.z = v.z + q.w * tz + (q.x * ty - q.y * tx)
}

/**
 * O tronco que boia no lago do Bosque (física viva, etapa 2): um corpo dinâmico do Rapier de
 * madeira (`MATERIAIS.madeira`, metade da densidade da água) com quatro pontos de flutuação. Em
 * cada passo da física, cada ponto dentro da água recebe o empuxo pela profundidade dele e o arrasto
 * da água (`sistemas/empuxo.ts`), no ponto: o tronco cai, balança, assenta com metade de fora,
 * desliza devagar e inclina quando a criança sobe numa ponta. A criança empurra (o controlador dela
 * empurra corpos dinâmicos) e pode tirar o tronco da água pela rampa e pôr de volta. Nasce no meio
 * do lago, um pouco acima da água, toda vez que a ilha fica ativa, e volta para lá se cair da ilha.
 */
export function TroncoNoLago({ agua }: { agua: AguaRasa }) {
  const corpo = useRef<RapierRigidBody>(null)
  const pecas = useModelo(URL_DAS_PECAS)
  const desenho = useMemo(() => copiarNo(pecas, 'tora-que-boia'), [pecas])

  useBeforePhysicsStep(() => {
    const b = corpo.current
    if (!b) return
    const t = b.translation()
    troncoAgora.x = t.x
    troncoAgora.y = t.y
    troncoAgora.z = t.z
    troncoAgora.montado = true
    troncoAgora.dormindo = b.isSleeping()
    // Parado e dormindo, as forças já se equilibram: só acorda quando algo mexe nele.
    if (troncoAgora.dormindo) return
    // Empurrado para fora da ilha (caiu no mar), volta para o meio do lago.
    if (t.y < agua.y - CAIU_DA_ILHA) {
      b.setTranslation({ x: agua.x, y: agua.y + 0.4, z: agua.z }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      return
    }
    const q = b.rotation()
    const lv = b.linvel()
    const av = b.angvel()
    let submersa = 0
    for (const p of PONTOS) {
      girar(q, p, noMundo)
      ponto.x = t.x + noMundo.x
      ponto.y = t.y + noMundo.y
      ponto.z = t.z + noMundo.z
      // A velocidade do ponto: a do corpo mais a do giro (ω × r).
      velDoPonto.x = lv.x + av.y * noMundo.z - av.z * noMundo.y
      velDoPonto.y = lv.y + av.z * noMundo.x - av.x * noMundo.z
      velDoPonto.z = lv.z + av.x * noMundo.y - av.y * noMundo.x
      const profundidade = dentroDaAgua(agua, ponto.x, ponto.z) ? agua.y - ponto.y : -1
      const f = forcaDaAgua(
        profundidade,
        2 * TRONCO_QUE_BOIA.raio,
        VOLUME_DO_PONTO,
        velDoPonto,
        GRAVIDADE,
        forca,
      )
      if (f === 0) continue
      submersa += f / PONTOS.length
      impulso.x = forca.x * PASSO_DA_FISICA
      impulso.y = forca.y * PASSO_DA_FISICA
      impulso.z = forca.z * PASSO_DA_FISICA
      b.applyImpulseAtPoint(impulso, ponto, true)
    }
    b.setAngularDamping(GIRO_NO_AR + EMPUXO.giroNaAgua * submersa)
    troncoAgora.submersa = submersa
  })

  return (
    <RigidBody
      ref={corpo}
      type="dynamic"
      colliders={false}
      position={[agua.x, agua.y + 0.4, agua.z]}
      rotation={[0.15, agua.giro + 0.6, 0]}
      angularDamping={GIRO_NO_AR}
      canSleep
    >
      {/* O cilindro do Rapier fica em pé (Y): deitado ao longo do X do corpo. */}
      <CylinderCollider
        args={[TRONCO_QUE_BOIA.comprimento / 2, TRONCO_QUE_BOIA.raio]}
        rotation={[0, 0, Math.PI / 2]}
        mass={MASSA}
        friction={MATERIAIS.madeira.atrito}
        restitution={MATERIAIS.madeira.quique}
      />
      {/* A tora do arquivo está deitada ao longo do Z: um quarto de volta a deita no X. */}
      <primitive object={desenho} rotation={[0, Math.PI / 2, 0]} />
    </RigidBody>
  )
}
