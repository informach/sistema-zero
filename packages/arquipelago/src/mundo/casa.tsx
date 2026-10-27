import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { QuartoDoJogo } from '@sistemazero/arquipelago-contracts'
import { ROOM_ITEM_INFO, resolveRoomAppearance } from '@sistemazero/avatar-quarto/quarto/catalog'
import { cellToWorld, effectiveFootprint, type Rot } from '@sistemazero/avatar-quarto/quarto/coords'
import { Floor } from '@sistemazero/avatar-quarto/quarto/floor'
import { FurniturePiece } from '@sistemazero/avatar-quarto/quarto/furniture-piece'
import { Pet3D } from '@sistemazero/avatar-quarto/quarto/pet-3d'
import { RoomMotionContext } from '@sistemazero/avatar-quarto/quarto/room-glb-model'
import { Walls } from '@sistemazero/avatar-quarto/quarto/walls'
import { useEffect, useMemo, useRef } from 'react'
import type { MeshStandardMaterial } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { dormir } from '../sistemas/necessidades'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA, PORTA, QUARTO } from './medidas'
import { ComReserva, copiarNo, MODELOS, materiaisDe, useModelo } from './modelos'

const NADA = () => {}
const BASE = ALTURA_DA_TERRA + 0.02
const MEIO_X = QUARTO.largura / 2
const MEIO_Z = QUARTO.fundo / 2
const COR_DE_FORA = '#fbe7d2'

/** O quarto da plataforma, peça por peça, com os mesmos componentes do Meu quarto. */
function Quarto({ quarto }: { quarto: QuartoDoJogo }) {
  const aparencia = resolveRoomAppearance(quarto)
  const ocupadas = useMemo(() => {
    const set = new Set<string>()
    for (const p of quarto.placedItems) {
      const info = ROOM_ITEM_INFO[p.itemId]
      if (!info || info.mount === 'wall' || p.on) continue
      const fp = effectiveFootprint(info.w, info.h, (p.rot ?? 0) as Rot)
      for (let dx = 0; dx < fp.w; dx++)
        for (let dz = 0; dz < fp.h; dz++) set.add(`${p.x + dx},${p.y + dz}`)
    }
    return set
  }, [quarto.placedItems])
  const filhos = useMemo(() => {
    const m = new Map<
      string,
      { index: number; itemId: string; slot: number; selected: boolean }[]
    >()
    quarto.placedItems.forEach((p, i) => {
      if (!p.on || typeof p.slot !== 'number') return
      const lista = m.get(p.on) ?? []
      lista.push({ index: i, itemId: p.itemId, slot: p.slot, selected: false })
      m.set(p.on, lista)
    })
    return m
  }, [quarto.placedItems])
  const primeiro = useMemo(() => {
    const m = new Map<string, number>()
    quarto.placedItems.forEach((p, i) => {
      if (!p.on && !m.has(p.itemId)) m.set(p.itemId, i)
    })
    return m
  }, [quarto.placedItems])

  return (
    <RoomMotionContext.Provider value>
      <Floor floorId={aparencia.floorId} editable={false} painting={false} onDeselect={NADA} />
      <Walls
        left={aparencia.left}
        right={aparencia.right}
        dark={false}
        paintColor={null}
        onPaint={NADA}
      />
      {quarto.placedItems.map((p, i) =>
        p.on ? null : (
          <FurniturePiece
            // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens é a identidade (como no Meu quarto).
            key={i}
            index={i}
            itemId={p.itemId}
            x={p.x}
            y={p.y}
            rot={(p.rot ?? 0) as Rot}
            wall={p.wall}
            selected={false}
            editable={false}
            onStart={NADA}
            stacked={primeiro.get(p.itemId) === i ? (filhos.get(p.itemId) ?? []) : []}
          />
        ),
      )}
      <Pet3D petId={quarto.pet} occupied={ocupadas} reducedMotion={false} />
    </RoomMotionContext.Provider>
  )
}

/** Colisão dos móveis de chão (o avatar não atravessa a cama). */
function ColisaoDosMoveis({ quarto }: { quarto: QuartoDoJogo }) {
  return (
    <>
      {quarto.placedItems.map((p, i) => {
        const info = ROOM_ITEM_INFO[p.itemId]
        if (!info || info.mount === 'wall' || p.on) return null
        const fp = effectiveFootprint(info.w, info.h, (p.rot ?? 0) as Rot)
        const c = cellToWorld(p.x, p.y, fp.w, fp.h)
        return (
          <CuboidCollider
            // biome-ignore lint/suspicious/noArrayIndexKey: espelha a lista de peças.
            key={i}
            args={[Math.max(0.2, fp.w / 2 - 0.08), 0.6, Math.max(0.2, fp.h / 2 - 0.08)]}
            position={[c.x, 0.6, c.z]}
          />
        )
      })}
    </>
  )
}

function Cama({ quarto }: { quarto: QuartoDoJogo }) {
  const { loja } = useJogo()
  const cama = quarto.placedItems.find((p) => p.itemId === 'cama' || p.itemId === 'beliche')
  const info = cama ? ROOM_ITEM_INFO[cama.itemId] : undefined
  const fp = cama && info ? effectiveFootprint(info.w, info.h, (cama.rot ?? 0) as Rot) : null
  const c = cama && fp ? cellToWorld(cama.x, cama.y, fp.w, fp.h) : { x: 0, z: 0 }
  useInterativo('cama', {
    x: CENTRO_DA_CASA.x + c.x,
    z: CENTRO_DA_CASA.z + c.z,
    raio: cama ? 2.6 : 0,
    rotulo: () => (cama ? 'Dormir um pouco' : null),
    agir: () => {
      loja.getState().mudar((s) => ({ ...s, necessidades: dormir(s.necessidades) }))
      loja.getState().dizer('Que soneca boa. A energia voltou toda.')
    },
  })
  return null
}

function Porta() {
  const { loja } = useJogo()
  const aberta = useEstado((s) => s.salvamento.casa.portaNova)
  useInterativo('porta-nova', {
    x: CENTRO_DA_CASA.x + PORTA.x,
    z: CENTRO_DA_CASA.z + MEIO_Z - 0.6,
    raio: 2.4,
    rotulo: () => (aberta ? null : 'Abrir a porta nova'),
    agir: () => {
      loja.getState().mudar((s) => ({ ...s, casa: { ...s.casa, portaNova: true } }))
      loja.getState().dizer('A porta nova abriu. Agora a ilha toda é sua para explorar.')
    },
  })
  const y = PORTA.altura / 2
  return (
    <>
      <ComReserva reserva={<PortaDeAntes aberta={aberta} />}>
        <PortaDoModelo aberta={aberta} />
      </ComReserva>
      {aberta ? null : (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider
            args={[PORTA.largura / 2, PORTA.altura / 2, 0.1]}
            position={[PORTA.x, y, MEIO_Z]}
          />
        </RigidBody>
      )}
    </>
  )
}

/** A porta de antes (formas do código): batente e a folha, que some quando abre. */
function PortaDeAntes({ aberta }: { aberta: boolean }) {
  const y = PORTA.altura / 2
  return (
    <group position={[PORTA.x, 0, MEIO_Z]}>
      {[-1, 1].map((lado) => (
        <mesh key={lado} position={[(lado * (PORTA.largura + 0.16)) / 2, y, 0]}>
          <boxGeometry args={[0.16, PORTA.altura, 0.3]} />
          <meshStandardMaterial color="#8a5a33" />
        </mesh>
      ))}
      <mesh position={[0, PORTA.altura + 0.08, 0]}>
        <boxGeometry args={[PORTA.largura + 0.32, 0.16, 0.3]} />
        <meshStandardMaterial color="#8a5a33" />
      </mesh>
      {aberta ? null : (
        <mesh position={[0, y, 0]}>
          <boxGeometry args={[PORTA.largura, PORTA.altura, 0.12]} />
          <meshStandardMaterial color="#c58b52" emissive="#ffc93c" emissiveIntensity={0.25} />
        </mesh>
      )}
    </group>
  )
}

/** Quanto a porta nova gira para fora quando abre (em volta da dobradiça). */
const GIRO_DA_PORTA_ABERTA = -1.75

/** A porta nova do Blender: o nó `porta` tem o pivô na dobradiça e gira para fora ao abrir. */
function PortaDoModelo({ aberta }: { aberta: boolean }) {
  const { ambiente } = useJogo()
  const raiz = useModelo(MODELOS.casa)
  const { porta, vidros, folha } = useMemo(() => {
    const copia = copiarNo(raiz, 'porta', true)
    return {
      porta: copia,
      vidros: materiaisDe(copia, 'vidroJanela'),
      folha: materiaisDe(copia, 'portaNova'),
    }
  }, [raiz])
  useFrame(({ clock }, dt) => {
    const alvo = aberta ? GIRO_DA_PORTA_ABERTA : 0
    porta.rotation.y += (alvo - porta.rotation.y) * (1 - Math.exp(-dt * 3))
    // Fechada, a porta nova chama atenção com um brilho que respira; aberta, fica quieta.
    const brilho = aberta ? 0 : 1 + 0.45 * Math.sin(clock.elapsedTime * 2.2)
    for (const m of folha) m.emissiveIntensity = brilho
    for (const m of vidros) m.emissiveIntensity = ambiente.noite ? 1.4 : 0
  })
  return <primitive object={porta} />
}

/** Paredes de fora: a da frente (com a porta) e a do lado, que a plataforma não desenha. */
function Casca() {
  const dentro = useEstado((s) => s.dentroDeCasa)
  const esquerdaDaPorta = PORTA.x - PORTA.largura / 2
  const direitaDaPorta = PORTA.x + PORTA.largura / 2
  const larguraEsq = esquerdaDaPorta + MEIO_X
  const larguraDir = MEIO_X - direitaDaPorta
  return (
    <>
      <ComReserva reserva={<CascaDeAntes dentro={dentro} />}>
        <CascaDoModelo dentro={dentro} />
      </ComReserva>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[larguraEsq / 2, QUARTO.altura / 2, 0.15]}
          position={[-MEIO_X + larguraEsq / 2, QUARTO.altura / 2, MEIO_Z]}
        />
        <CuboidCollider
          args={[larguraDir / 2, QUARTO.altura / 2, 0.15]}
          position={[MEIO_X - larguraDir / 2, QUARTO.altura / 2, MEIO_Z]}
        />
        <CuboidCollider
          args={[0.15, QUARTO.altura / 2, MEIO_Z]}
          position={[MEIO_X, QUARTO.altura / 2, 0]}
        />
        <CuboidCollider
          args={[0.15, QUARTO.altura / 2, MEIO_Z]}
          position={[-MEIO_X, QUARTO.altura / 2, 0]}
        />
        <CuboidCollider
          args={[MEIO_X, QUARTO.altura / 2, 0.15]}
          position={[0, QUARTO.altura / 2, -MEIO_Z]}
        />
      </RigidBody>
    </>
  )
}

/** As colunas da varanda do modelo (x em volta da porta, z na frente do deque). */
const COLUNAS_DA_VARANDA: [number, number][] = [
  [PORTA.x - 1.95, MEIO_Z + 1.6],
  [PORTA.x + 1.95, MEIO_Z + 1.6],
]

/**
 * A casca do Blender (`casa.glb`): paredes com lambri, janelas com floreira, telhado de duas
 * águas, varanda com toldo e lampião. Dentro de casa as paredes da frente e do lado ficam
 * translúcidas e o telhado some; à noite as janelas e o lampião acendem.
 */
function CascaDoModelo({ dentro }: { dentro: boolean }) {
  const { ambiente } = useJogo()
  const raiz = useModelo(MODELOS.casa)
  const partes = useMemo(() => {
    const paredes = copiarNo(raiz, 'paredes', true)
    const janelas = copiarNo(raiz, 'janelas', true)
    const telhado = copiarNo(raiz, 'telhado', true)
    const varanda = copiarNo(raiz, 'varanda', true)
    const revestimento = copiarNo(raiz, 'revestimento')
    return {
      paredes,
      janelas,
      telhado,
      varanda,
      revestimento,
      translucidos: [...materiaisDe(paredes), ...materiaisDe(janelas)],
      vidros: [...materiaisDe(janelas, 'vidroJanela'), ...materiaisDe(telhado, 'vidroJanela')],
      lampioes: materiaisDe(varanda, 'lampiao'),
    }
  }, [raiz])
  useEffect(() => {
    for (const m of partes.translucidos) {
      m.transparent = dentro
      m.opacity = dentro ? 0.16 : 1
      m.depthWrite = !dentro
      m.needsUpdate = true
    }
    partes.telhado.visible = !dentro
  }, [dentro, partes])
  useFrame(() => {
    for (const m of partes.vidros) m.emissiveIntensity = ambiente.noite ? 1.6 : 0
    for (const m of partes.lampioes) m.emissiveIntensity = ambiente.noite ? 2.4 : 0.15
  })
  return (
    <>
      <primitive object={partes.revestimento} />
      <primitive object={partes.paredes} />
      <primitive object={partes.janelas} />
      <primitive object={partes.telhado} />
      <primitive object={partes.varanda} />
      <RigidBody type="fixed" colliders={false}>
        {COLUNAS_DA_VARANDA.map(([x, z]) => (
          <CuboidCollider key={x} args={[0.12, 1.7, 0.12]} position={[x, 1.7, z]} />
        ))}
      </RigidBody>
    </>
  )
}

/** A casca de antes (formas do código). */
function CascaDeAntes({ dentro }: { dentro: boolean }) {
  const { ambiente } = useJogo()
  const janela = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    if (janela.current) janela.current.emissiveIntensity = ambiente.noite ? 1.6 : 0
  })
  const opacidade = dentro ? 0.16 : 1
  const esquerdaDaPorta = PORTA.x - PORTA.largura / 2
  const direitaDaPorta = PORTA.x + PORTA.largura / 2
  const larguraEsq = esquerdaDaPorta + MEIO_X
  const larguraDir = MEIO_X - direitaDaPorta
  const material = (
    <meshStandardMaterial
      color={COR_DE_FORA}
      transparent={dentro}
      opacity={opacidade}
      depthWrite={!dentro}
    />
  )
  return (
    <>
      {/* frente, em volta da porta */}
      <mesh position={[-MEIO_X + larguraEsq / 2, QUARTO.altura / 2, MEIO_Z]}>
        <boxGeometry args={[larguraEsq, QUARTO.altura, 0.2]} />
        {material}
      </mesh>
      <mesh position={[MEIO_X - larguraDir / 2, QUARTO.altura / 2, MEIO_Z]}>
        <boxGeometry args={[larguraDir, QUARTO.altura, 0.2]} />
        {material}
      </mesh>
      <mesh position={[PORTA.x, (QUARTO.altura + PORTA.altura) / 2, MEIO_Z]}>
        <boxGeometry args={[PORTA.largura, QUARTO.altura - PORTA.altura, 0.2]} />
        {material}
      </mesh>
      {/* lado direito, com janela */}
      <mesh position={[MEIO_X, QUARTO.altura / 2, 0]}>
        <boxGeometry args={[0.2, QUARTO.altura, QUARTO.fundo]} />
        {material}
      </mesh>
      <mesh position={[MEIO_X + 0.12, 2.3, -1]}>
        <boxGeometry args={[0.06, 1.2, 1.8]} />
        <meshStandardMaterial
          ref={janela}
          color="#bfe3f0"
          emissive="#ffd27a"
          emissiveIntensity={0}
          transparent={dentro}
          opacity={opacidade}
        />
      </mesh>
      {/* revestimento de fora das paredes do quarto */}
      <mesh position={[-MEIO_X - 0.12, QUARTO.altura / 2, 0]}>
        <boxGeometry args={[0.06, QUARTO.altura, QUARTO.fundo + 0.3]} />
        <meshStandardMaterial color={COR_DE_FORA} />
      </mesh>
      <mesh position={[0, QUARTO.altura / 2, -MEIO_Z - 0.12]}>
        <boxGeometry args={[QUARTO.largura + 0.3, QUARTO.altura, 0.06]} />
        <meshStandardMaterial color={COR_DE_FORA} />
      </mesh>
      {/* telhado: some quando você entra */}
      {dentro ? null : (
        <mesh
          position={[0, QUARTO.altura + 1.3, 0]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[1, 1, QUARTO.fundo / QUARTO.largura]}
        >
          <coneGeometry args={[QUARTO.largura * 0.78, 2.6, 4]} />
          <meshStandardMaterial color="#e0584f" flatShading />
        </mesh>
      )}
    </>
  )
}

export function Casa() {
  const quarto = useEstado((s) => s.quarto)
  return (
    <group position={[CENTRO_DA_CASA.x, BASE, CENTRO_DA_CASA.z]}>
      <Quarto quarto={quarto} />
      <Casca />
      <Porta />
      <Cama quarto={quarto} />
      <RigidBody type="fixed" colliders={false}>
        <ColisaoDosMoveis quarto={quarto} />
      </RigidBody>
    </group>
  )
}
