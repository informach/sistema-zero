import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { MoradaHouse } from '@sistemazero/avatar-quarto/morada/catalog'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosConvidados, useConvidados } from '../estado/convidados'
import { lojaDaConversa } from '../estado/moradores'
import { conversarComAtividade, temAmizadeDoAnel } from '../sistemas/amizade-do-anel'
import { diaDe } from '../sistemas/moradores'
import { type ConvidadoNaCasa, encontroNaCasa } from '../sistemas/visitas-dos-moradores'
import { trocarClipe, useCopiaAnimada } from './animado'
import { BENTO } from './bento'
import { CAPI } from './capi'
import { FLOCO } from './floco'
import { useInterativo } from './interativos'
import { IRIE } from './irie'
import { JADE } from './jade'
import { MARE } from './mare'

const people = { capi: CAPI, bento: BENTO, mare: MARE, floco: FLOCO, jade: JADE, irie: IRIE }
const once: readonly string[] = []

/** Visitas usam área, caixas e aconchego da casa canônica; as ilhas não mantêm uma cópia. */
export function MoradaGuests({
  house,
  editing,
  paused,
}: {
  house: MoradaHouse
  editing: boolean
  paused: boolean
}) {
  const { loja, plataforma } = useJogo()
  const source = lojaDosConvidados(loja)
  const type = useConvidados(source, (s) => s.tipo)
  const save = useEstado((s) => s.salvamento)
  const journey = useEstado((s) => s.jornada)
  const readonly = useEstado((s) => s.acesso.somenteLeitura || s.visita !== null)
  const quarter = useEstado((s) => s.quarto)
  const guests = useMemo(
    () =>
      !editing && !readonly && type !== 'descanso'
        ? encontroNaCasa(
            save,
            { ...quarter, house },
            journey,
            plataforma.perfil.id,
            diaDe(new Date()),
            type,
          ).convidados
        : [],
    [editing, readonly, type, save, quarter, house, journey, plataforma.perfil.id],
  )
  useEffect(() => {
    source.getState().colocar(guests)
  }, [source, guests])
  useEffect(() => () => source.getState().colocar([]), [source])
  return (
    <Suspense fallback={null}>
      {guests.map((guest) => (
        <Guest key={guest.quem} guest={guest} paused={paused} />
      ))}
    </Suspense>
  )
}

function Guest({ guest, paused }: { guest: ConvidadoNaCasa; paused: boolean }) {
  const { loja, plataforma } = useJogo()
  const descriptor = people[guest.quem]
  const root = useRef<Group>(null)
  const { cena, actions } = useCopiaAnimada(descriptor.url, root, once, paused)
  useEffect(() => {
    trocarClipe(actions, null, 'parado', 0, `morada-${guest.quem}`)
  }, [actions, guest.quem])
  function converse() {
    const state = loja.getState()
    if (state.visita || state.acesso.somenteLeitura || paused) return
    const today = diaDe(new Date())
    const result = temAmizadeDoAnel(descriptor.quem)
      ? conversarComAtividade(
          state.salvamento,
          descriptor.quem,
          today,
          plataforma.perfil.id,
          descriptor.comecar,
        )
      : descriptor.comecar(state.salvamento, today, plataforma.perfil.id)
    state.mudar(() => result.salvamento)
    lojaDaConversa(loja, descriptor.quem).getState().abrir(result.falas)
    state.abrirPainel(descriptor.painel)
  }
  useInterativo(`morada:morador:${guest.quem}`, {
    x: guest.x,
    z: guest.z,
    raio: 1.8,
    rotulo: () => (paused ? null : `Conversar com ${descriptor.quem}`),
    agir: converse,
  })
  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: nó Three, conversa também disponível pelo painel Moradores. */}
      <group
        position={[guest.x, 0, guest.z]}
        onClick={(event) => {
          event.stopPropagation()
          converse()
        }}
      >
        <group ref={root} scale={1 / 1.85}>
          <primitive object={cena} />
        </group>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.25, 0.55, 0.25]} position={[guest.x, 0.55, guest.z]} />
      </RigidBody>
    </>
  )
}
