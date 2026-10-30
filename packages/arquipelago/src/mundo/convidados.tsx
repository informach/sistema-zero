import { useFrame } from '@react-three/fiber'
import { memo, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosConvidados, podeReceberMoradores, useConvidados } from '../estado/convidados'
import { diaDe } from '../sistemas/moradores'
import { type ConvidadoNaCasa, encontroNaCasa } from '../sistemas/visitas-dos-moradores'
import { BENTO } from './bento'
import { CAPI } from './capi'
import { FLOCO } from './floco'
import { IRIE } from './irie'
import { JADE } from './jade'
import { MARE } from './mare'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA } from './medidas'
import { MoradorDaIlha } from './morador'

const MORADORES = { capi: CAPI, bento: BENTO, mare: MARE, floco: FLOCO, jade: JADE, irie: IRIE }
const NINGUEM = [] as const

/** A presença não entra no salvamento. Longe da casa, os modelos voltam para suas ilhas. */
export function ConvidadosDaCasa() {
  const { loja, plataforma, rastro } = useJogo()
  const estado = lojaDosConvidados(loja)
  const tipo = useConvidados(estado, (s) => s.tipo)
  const presentes = useConvidados(estado, (s) => s.convidados)
  const construcao = useEstado((s) => s.salvamento.construcao)
  const casa = useEstado((s) => s.salvamento.casa)
  const projetos = useEstado((s) => s.salvamento.projetos)
  const moradores = useEstado((s) => s.salvamento.moradores)
  const quarto = useEstado((s) => s.quarto)
  const jornada = useEstado((s) => s.jornada)
  const permitido = useEstado(podeReceberMoradores)
  const [perto, setPerto] = useState(false)
  const [dia, setDia] = useState(() => diaDe(new Date()))
  const evitar = useRef({ x: rastro.x, z: rastro.z })
  const acumulado = useRef(0)
  useFrame((_, dt) => {
    acumulado.current += dt
    if (acumulado.current < 0.5) return
    acumulado.current = 0
    const agora =
      rastro.x ** 2 + (rastro.z + 4) ** 2 < 22 ** 2 && Math.abs(rastro.y - ALTURA_DA_TERRA) < 6
    if (agora !== perto) {
      evitar.current = { x: rastro.x, z: rastro.z }
      setPerto(agora)
    }
  })
  useEffect(() => {
    const timer = setInterval(() => setDia(diaDe(new Date())), 60_000)
    return () => clearInterval(timer)
  }, [])
  const convidados = useMemo(() => {
    if (!permitido || !perto || tipo === 'descanso') return NINGUEM
    return encontroNaCasa(
      { construcao, casa, projetos, moradores },
      quarto,
      jornada,
      plataforma.perfil.id,
      dia,
      tipo,
      evitar.current,
    ).convidados
  }, [
    construcao,
    casa,
    projetos,
    moradores,
    quarto,
    jornada,
    plataforma.perfil.id,
    dia,
    tipo,
    permitido,
    perto,
  ])
  useEffect(() => {
    estado.getState().colocar(convidados)
  }, [estado, convidados])
  useEffect(() => () => estado.getState().colocar(NINGUEM), [estado])
  return <>{permitido && perto && presentes.map((c) => <Convidado key={c.quem} convidado={c} />)}</>
}

// A posição e o alvo da conversa não mudam em cada atualização do relógio/salvamento.
const Convidado = memo(function Convidado({ convidado: c }: { convidado: ConvidadoNaCasa }) {
  const lugar = useMemo(
    () => ({ x: c.x, y: ALTURA_DA_TERRA + 0.02, z: c.z, descanso: 0 }),
    [c.x, c.z],
  )
  return (
    <Suspense fallback={null}>
      <MoradorDaIlha emCasa morador={MORADORES[c.quem]} lugar={lugar} meio={CENTRO_DA_CASA} />
    </Suspense>
  )
})
