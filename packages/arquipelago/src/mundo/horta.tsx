import type { Canteiro as DadosDoCanteiro, Semente } from '@sistemazero/arquipelago-contracts'
import { useEffect, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { colher, estagio, plantar, progresso, regar } from '../sistemas/horta'
import { adicionar, ITENS, quantidade, remover } from '../sistemas/itens'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA, HORTA } from './medidas'

const ORDEM: Semente[] = ['alface', 'tomate', 'milho']
const COR_DA_PLANTA: Record<Semente, string> = {
  alface: '#7fd06a',
  tomate: '#e0584f',
  milho: '#f2c94c',
}

function posicaoDoCanteiro(i: number) {
  const col = i % HORTA.colunas
  const lin = Math.floor(i / HORTA.colunas)
  return {
    x: HORTA.x + (col - (HORTA.colunas - 1) / 2) * HORTA.passo,
    z: HORTA.z + (lin - (HORTA.linhas - 1) / 2) * HORTA.passo,
  }
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

  const altura = fase === 'vazio' ? 0 : fase === 'semente' ? 0.12 : 0.15 + p * 0.65
  const cor = canteiro.semente ? COR_DA_PLANTA[canteiro.semente] : '#6fae4f'
  return (
    <group position={[x, ALTURA_DA_TERRA, z]}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.35, 0.22, 1.35]} />
        <meshStandardMaterial color={canteiro.regadoEm ? '#5a3d24' : '#7c5836'} flatShading />
      </mesh>
      {fase === 'vazio'
        ? null
        : [-0.35, 0.35].flatMap((dx) =>
            [-0.35, 0.35].map((dz) => (
              <group key={`${dx}${dz}`} position={[dx, 0.22, dz]}>
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
            )),
          )}
    </group>
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
    </>
  )
}
