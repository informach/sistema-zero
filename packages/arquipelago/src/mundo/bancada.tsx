import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BoxGeometry, EdgesGeometry, type Group } from 'three'
import { useJogo } from '../estado/contexto'
import { ITENS } from '../sistemas/itens'
import { cozinhar, RECEITAS, receitaPossivel } from '../sistemas/receitas'
import { COLISORES_DA_BANCADA } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA, BANCADA } from './medidas'
import { ComReserva, copiarNo, MODELOS, materiaisDe, useModelo } from './modelos'

/**
 * A bancada de cozinhar chega como PROJETO AZUL: já funciona (dá para cozinhar) e espera a
 * aparência que a pessoa vai fazer no Pinta ou no Molda, ou comprar pronta (fase seguinte).
 */
export function Bancada() {
  const { loja } = useJogo()
  useInterativo('bancada', {
    x: BANCADA.x,
    z: BANCADA.z,
    raio: 2.2,
    rotulo: () => {
      const r = receitaPossivel(loja.getState().salvamento.inventario)
      return r ? `Cozinhar ${r.nome.toLowerCase()}` : 'Ver as receitas'
    },
    agir: () => {
      const s = loja.getState()
      const r = receitaPossivel(s.salvamento.inventario)
      if (!r) {
        const lista = RECEITAS.map(
          (x) =>
            `${x.nome}: ${Object.entries(x.precisa)
              .map(([id, q]) => `${q} ${ITENS[id]?.nome.toLowerCase()}`)
              .join(' e ')}`,
        ).join('. ')
        s.dizer(`Ainda falta ingrediente. ${lista}.`)
        return
      }
      s.mudar((sv) => {
        const inv = cozinhar(sv.inventario, r)
        return inv ? { ...sv, inventario: inv } : sv
      })
      s.dizer(`Ficou pronto: ${r.nome.toLowerCase()}. Clique nele embaixo para comer.`)
    },
  })
  return (
    <group position={[BANCADA.x, ALTURA_DA_TERRA, BANCADA.z]}>
      <ComReserva reserva={<ProjetoDeAntes />}>
        <ProjetoDoModelo />
      </ComReserva>
      <Colisores lista={COLISORES_DA_BANCADA} />
    </group>
  )
}

/**
 * O projeto azul do Blender: uma bancada de cozinha em holograma (fogão, pia, portas) sobre um
 * projetor. O holograma flutua e pulsa de leve.
 */
function ProjetoDoModelo() {
  const raiz = useModelo(MODELOS.bancada)
  const { projetor, holograma, arestas, volume } = useMemo(() => {
    const h = copiarNo(raiz, 'holograma', true)
    const vol = materiaisDe(h, 'holograma')
    // Luz somada: o holograma clareia o que está atrás em vez de tapar.
    for (const m of [...vol, ...materiaisDe(h, 'hologramaAresta')]) {
      m.blending = AdditiveBlending
      m.depthWrite = false
      m.transparent = true
    }
    return {
      projetor: copiarNo(raiz, 'projetor', true),
      holograma: h,
      arestas: materiaisDe(h, 'hologramaAresta'),
      volume: vol,
    }
  }, [raiz])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    holograma.position.y = 0.03 + Math.sin(t * 2) * 0.03
    for (const m of arestas) m.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.3
    for (const m of volume) m.opacity = 0.22 + Math.sin(t * 2.4) * 0.05
  })
  return (
    <>
      <primitive object={projetor} />
      <primitive object={holograma} />
    </>
  )
}

/** A caixa azul de antes (formas do código). */
function ProjetoDeAntes() {
  const brilho = useRef<Group>(null)
  const caixa = useMemo(() => new BoxGeometry(2.2, 1.0, 1.0), [])
  const arestas = useMemo(() => new EdgesGeometry(caixa), [caixa])
  useFrame(({ clock }) => {
    if (brilho.current) brilho.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.03
  })
  return (
    <group ref={brilho}>
      <mesh geometry={caixa}>
        <meshBasicMaterial color="#5aa9ff" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <lineSegments geometry={arestas}>
        <lineBasicMaterial color="#2f6df6" />
      </lineSegments>
    </group>
  )
}
