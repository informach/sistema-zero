import type { Canteiro as DadosDoCanteiro, Semente } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useState } from 'react'
import { Color } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { colher, type Estagio, estagio, plantar, progresso, regar } from '../sistemas/horta'
import { adicionar, ITENS, quantidade, remover } from '../sistemas/itens'
import { colisoresDaHorta, posicaoDoCanteiro } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA } from './medidas'
import { ComReserva, copiarNo, MODELOS, materiaisDe, useModelo } from './modelos'

const ORDEM: Semente[] = ['alface', 'tomate', 'milho']
const COR_DA_PLANTA: Record<Semente, string> = {
  alface: '#7fd06a',
  tomate: '#e0584f',
  milho: '#f2c94c',
}

function sementeQueDaParaPlantar(inv: Record<string, number>): Semente | null {
  return ORDEM.find((s) => quantidade(inv, `semente-${s}`) > 0) ?? null
}

function Canteiro({
  indice,
  canteiro,
  agora,
}: {
  indice: number
  canteiro: DadosDoCanteiro
  agora: number
}) {
  const { loja } = useJogo()
  const { x, z } = posicaoDoCanteiro(indice)
  const fase = estagio(canteiro, agora)
  const p = progresso(canteiro, agora)

  useInterativo_(
    `canteiro-${canteiro.id}`,
    x,
    z,
    () => {
      const s = loja.getState().salvamento
      const c = s.horta[indice]
      if (!c) return null
      const f = estagio(c, Date.now())
      if (f === 'vazio') {
        const semente = sementeQueDaParaPlantar(s.inventario)
        return semente ? `Plantar ${ITENS[semente]?.nome.toLowerCase()}` : null
      }
      if (f === 'semente') return 'Regar'
      if (f === 'maduro') return `Colher ${ITENS[c.semente ?? '']?.nome.toLowerCase()}`
      return null
    },
    () => {
      const agoraData = new Date()
      loja.getState().mudar((s) => {
        const c = s.horta[indice]
        if (!c) return s
        const f = estagio(c, agoraData.getTime())
        const horta = [...s.horta]
        if (f === 'vazio') {
          const semente = sementeQueDaParaPlantar(s.inventario)
          const inv = semente && remover(s.inventario, `semente-${semente}`)
          const novo = semente && plantar(c, semente, agoraData)
          if (!inv || !novo) return s
          horta[indice] = novo
          loja.getState().dizer('Plantado. Agora é só regar.')
          return { ...s, horta, inventario: inv }
        }
        if (f === 'semente') {
          const novo = regar(c, agoraData)
          if (!novo) return s
          horta[indice] = novo
          loja.getState().dizer('Regado. Daqui a pouco começa a crescer.')
          return { ...s, horta }
        }
        if (f === 'maduro') {
          const r = colher(c, agoraData.getTime())
          if (!r) return s
          horta[indice] = r.canteiro
          // Uma semente volta junto: a horta nunca acaba.
          const inv = adicionar(adicionar(s.inventario, r.item, r.qtd), `semente-${r.item}`, 1)
          loja.getState().dizer(`Você colheu ${r.qtd} ${ITENS[r.item]?.nome.toLowerCase()}.`)
          return { ...s, horta, inventario: inv }
        }
        return s
      })
    },
  )

  return (
    <group position={[x, ALTURA_DA_TERRA, z]}>
      <ComReserva reserva={<CanteiroDeAntes canteiro={canteiro} fase={fase} p={p} />}>
        <CanteiroDoModelo
          semente={canteiro.semente ?? null}
          regado={Boolean(canteiro.regadoEm)}
          fase={fase}
          p={p}
          indice={indice}
        />
      </ComReserva>
    </group>
  )
}

/** As quatro covas de cada canteiro (a terra fica em y = 0,22). */
const COVAS: [number, number][] = [
  [-0.35, -0.35],
  [0.35, -0.35],
  [-0.35, 0.35],
  [0.35, 0.35],
]
const ALTURA_DA_TERRA_DO_CANTEIRO = 0.22
const TERRA_REGADA = new Color('#4a3220')

/** Qual nó do `horta.glb` mostra a planta neste estágio. */
function noDaPlanta(semente: Semente | null, fase: Estagio): string | null {
  if (fase === 'vazio') return null
  if (fase === 'semente' || !semente) return 'semente'
  const sufixo = fase === 'brotando' ? 'broto' : fase === 'crescendo' ? 'crescendo' : 'maduro'
  return `${semente}-${sufixo}`
}

/** Dentro de cada estágio a planta ainda cresce um pouco (o progresso vai de 0 a 1). */
function tamanhoNoEstagio(fase: Estagio, p: number): number {
  if (fase === 'brotando') return 0.65 + 0.35 * Math.min(1, p / 0.4)
  if (fase === 'crescendo') return 0.75 + 0.25 * Math.min(1, (p - 0.4) / 0.6)
  return 1
}

/** O canteiro de tábuas do Blender, com a planta do estágio em cada cova. */
function CanteiroDoModelo({
  semente,
  regado,
  fase,
  p,
  indice,
}: {
  semente: Semente | null
  regado: boolean
  fase: Estagio
  p: number
  indice: number
}) {
  const raiz = useModelo(MODELOS.horta)
  const { caixa, terra } = useMemo(() => {
    const copia = copiarNo(raiz, 'canteiro', true)
    const [t] = materiaisDe(copia, 'terra')
    return { caixa: copia, terra: t ? { material: t, cor: t.color.clone() } : null }
  }, [raiz])
  useEffect(() => {
    if (terra) terra.material.color.copy(regado ? TERRA_REGADA : terra.cor)
  }, [regado, terra])
  const nome = noDaPlanta(semente, fase)
  const plantas = useMemo(() => (nome ? COVAS.map(() => copiarNo(raiz, nome)) : []), [raiz, nome])
  const tamanho = tamanhoNoEstagio(fase, p)
  return (
    <>
      <primitive object={caixa} />
      {plantas.map((planta, i) => {
        const [dx, dz] = COVAS[i] ?? [0, 0]
        return (
          <group
            key={`${nome}-${dx},${dz}`}
            position={[dx, ALTURA_DA_TERRA_DO_CANTEIRO, dz]}
            rotation-y={indice * 0.9 + i * 1.6}
            scale={tamanho}
          >
            <primitive object={planta} />
          </group>
        )
      })}
    </>
  )
}

/** O canteiro de antes (formas do código). */
function CanteiroDeAntes({
  canteiro,
  fase,
  p,
}: {
  canteiro: DadosDoCanteiro
  fase: Estagio
  p: number
}) {
  const altura = fase === 'vazio' ? 0 : fase === 'semente' ? 0.12 : 0.15 + p * 0.65
  const cor = canteiro.semente ? COR_DA_PLANTA[canteiro.semente] : '#6fae4f'
  return (
    <>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.35, 0.22, 1.35]} />
        <meshStandardMaterial color={canteiro.regadoEm ? '#5a3d24' : '#7c5836'} flatShading />
      </mesh>
      {fase === 'vazio'
        ? null
        : COVAS.map(([dx, dz]) => (
            <group key={`${dx}${dz}`} position={[dx, ALTURA_DA_TERRA_DO_CANTEIRO, dz]}>
              <mesh position={[0, altura / 2, 0]}>
                <coneGeometry args={[0.12 + p * 0.08, Math.max(0.1, altura), 5]} />
                <meshStandardMaterial color="#58b05a" flatShading />
              </mesh>
              {fase === 'maduro' ? (
                <mesh position={[0, altura + 0.08, 0]}>
                  <icosahedronGeometry args={[0.16, 0]} />
                  <meshStandardMaterial
                    color={cor}
                    flatShading
                    emissive={cor}
                    emissiveIntensity={0.15}
                  />
                </mesh>
              ) : null}
            </group>
          ))}
    </>
  )
}

/** Atalho local: registra o canteiro como interativo. */
function useInterativo_(
  id: string,
  x: number,
  z: number,
  rotulo: () => string | null,
  agir: () => void,
) {
  useInterativo(id, { x, z, raio: 1.8, rotulo, agir })
}

/** A borda de cada canteiro segura o corpo: ele cuida da horta de fora, sem pisar nas plantas. */
const COLISORES_DA_HORTA = colisoresDaHorta()

export function Horta() {
  const horta = useEstado((s) => s.salvamento.horta)
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      {horta.map((c, i) => (
        <Canteiro key={c.id} indice={i} canteiro={c} agora={agora} />
      ))}
      <Colisores lista={COLISORES_DA_HORTA} />
    </>
  )
}
