import {
  type Canteiro as DadosDoCanteiro,
  fraseDaColheitaEspecial,
  type Semente,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useState } from 'react'
import { Color } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { type Clima, climaLiberado, FALA_DO_BONUS, pedeAgua, regarComSede } from '../sistemas/clima'
import { falaDoGanho } from '../sistemas/construcao/projeto-azul'
import { celulaDoCanteiro } from '../sistemas/construcao/quintal'
import { type Estagio, estagio, plantar, progresso, regar } from '../sistemas/horta'
import { ITENS, quantidade, remover } from '../sistemas/itens'
import { colherNaIlha } from '../sistemas/primeiro-pedido'
import { hortaVisivel } from '../sistemas/visitas'
import {
  ALTURA_QUE_SEGURA,
  colisoresDaHorta,
  posicaoDoCanteiro,
  type Solido,
} from './colisao-da-ilha-central'
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

/** O canteiro do quintal cabe numa célula da grade (o da horta de antes tem 1,35). */
export const ESCALA_DO_CANTEIRO_DO_QUINTAL = 0.66

/** Onde fica o canteiro: o da horta de antes pela fila; o do quintal, no meio da célula dele. */
export function lugarDoCanteiro(
  id: string,
  indice: number,
): { x: number; z: number; escala: number } {
  const celula = celulaDoCanteiro(id)
  if (celula) return { x: celula.x + 0.5, z: celula.z + 0.5, escala: ESCALA_DO_CANTEIRO_DO_QUINTAL }
  return { ...posicaoDoCanteiro(indice), escala: 1 }
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
  const { x, z, escala } = lugarDoCanteiro(canteiro.id, indice)
  const fase = estagio(canteiro, agora)
  const p = progresso(canteiro, agora)
  const clima = useEstado((s) => climaDaHorta(s))
  // A planta que pede água (fase4-08) mostra uma gota em cima.
  const sede = clima !== null && pedeAgua(canteiro, agora, clima)

  useInterativo_(
    `canteiro-${canteiro.id}`,
    x,
    z,
    () => {
      // Na horta do irmão só se olha (fase3-12).
      if (loja.getState().visita) return null
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
      const clima = climaDaHorta(loja.getState())
      if (clima && pedeAgua(c, Date.now(), clima)) return 'Regar'
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
        // Crescendo, ela pode estar pedindo água (fase4-08): regar adianta o crescimento.
        const clima = climaDaHorta(loja.getState())
        const comSede = clima && regarComSede(c, agoraData, clima)
        if (comSede) {
          horta[indice] = comSede
          loja.getState().dizer(FALA_DO_BONUS)
          return { ...s, horta }
        }
        if (f === 'maduro') {
          const r = colherNaIlha(s, indice, agoraData, loja.getState().jornada)
          if (!r.ok) {
            if (r.motivo !== 'mochila') return s
            loja
              .getState()
              .dizer(
                'A mochila está cheia. Use ou guarde os alimentos e sementes. A colheita continua no canteiro.',
              )
            return s
          }
          const colheita = r.colheita
          loja
            .getState()
            .dizer(
              r.ganhouGeladeira
                ? falaDoGanho('geladeira')
                : `Você colheu ${colheita.qtd} ${ITENS[colheita.item]?.nome.toLowerCase()}.${fraseDaColheitaEspecial(colheita.bonus)}`,
            )
          return r.salvamento
        }
        return s
      })
    },
  )

  return (
    <group position={[x, ALTURA_DA_TERRA, z]} scale={escala}>
      {sede ? <GotaDaSede /> : null}
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

/**
 * O clima que vale na horta agora: o escolhido, com as Nuvens abertas (a Iriê ensinou) e fora de
 * uma visita (a horta do irmão só se olha). `null` = a horta de sempre, sem pedir água.
 */
function climaDaHorta(s: {
  jornada: number
  visita: unknown
  salvamento: { clima: Clima }
}): Clima | null {
  return climaLiberado(s.jornada) && !s.visita ? s.salvamento.clima : null
}

/** A gota azul em cima da planta que pede água (some quando rega ou quando passa a vontade). */
function GotaDaSede() {
  return (
    <mesh position={[0, 1.15, 0]} scale={[0.12, 0.17, 0.12]} name="gota-da-sede">
      <sphereGeometry args={[1, 12, 10]} />
      <meshStandardMaterial color="#5aa9ff" emissive="#2f6fd0" emissiveIntensity={0.4} />
    </mesh>
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

/** Os canteiros do quintal (modo construção) colidem como os da horta, no tamanho deles. */
function colisoresDoQuintal(horta: readonly DadosDoCanteiro[]): Solido[] {
  const meia = ALTURA_QUE_SEGURA / 2
  const lado = 0.66 * ESCALA_DO_CANTEIRO_DO_QUINTAL
  return horta.flatMap((c) => {
    const celula = celulaDoCanteiro(c.id)
    if (!celula) return []
    return [
      {
        forma: 'caixa' as const,
        nome: `col-canteiro-${c.id}`,
        posicao: [celula.x + 0.5, ALTURA_DA_TERRA + meia, celula.z + 0.5] as [
          number,
          number,
          number,
        ],
        meio: [lado, meia, lado] as [number, number, number],
        rotacao: [0, 0, 0, 1] as [number, number, number, number],
      },
    ]
  })
}

export function Horta() {
  // Na visita (fase3-12), a horta do irmão.
  const horta = useEstado(hortaVisivel)
  const doQuintal = useMemo(() => colisoresDoQuintal(horta), [horta])
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
      <Colisores lista={doQuintal} />
    </>
  )
}
