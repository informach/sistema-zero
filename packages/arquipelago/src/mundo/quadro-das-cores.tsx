import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import { type Color, type MeshStandardMaterial, Object3D } from 'three'
import quadroGlb from '../assets/itens/quadro-das-cores.glb'
import { useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import {
  AVISO_DO_DIA,
  diaParaAvisar,
  manchasAcesas,
  quadrosDaIlha,
} from '../sistemas/quadro-das-cores'
import { Colisores } from './colisores'
import type { IlhaPreparada } from './ilha-completa'
import { useInterativo } from './interativos'
import { COLISORES_DO_QUADRO, posicaoDoQuadro } from './lugar-do-quadro'

export { LUGAR_DO_QUADRO, posicaoDoQuadro } from './lugar-do-quadro'

import { CINZA, copiarNo, materiaisDe, useModelo } from './modelos'

const QUADRO_URL = new URL(quadroGlb, import.meta.url).href

/** De que distância o botão "Ver o Quadro das Cores" aparece. */
export const ALCANCE_DO_QUADRO = 2.6
/** Quanto tempo a mancha leva para sair do cinza na festa da cor. */
export const DURACAO_DA_COR_S = 1.6

/** Guarda o último dia em que o Zappy avisou do desafio do dia (por perfil, neste aparelho). */
const chaveDoAviso = (perfil: string) => `arquipelago:aviso-do-dia:${perfil}`

function lerAviso(perfil: string): string | null {
  try {
    return localStorage.getItem(chaveDoAviso(perfil))
  } catch {
    return null
  }
}

function gravarAviso(perfil: string, dia: string) {
  try {
    localStorage.setItem(chaveDoAviso(perfil), dia)
  } catch {
    // Sem armazenamento (aba anônima): o aviso pode voltar na próxima ilha.
  }
}

/** O nome do painel na loja (um por ilha). */
export const painelDoQuadro = (ilha: Ilha) => `quadro:${ilha.id}`

export function QuadroDasCores({
  ilha,
  centro,
  preparada,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  preparada: IlhaPreparada
}) {
  const { loja, plataforma } = useJogo()
  const desafios = lojaDosDesafios(loja, plataforma)
  const dados = useDesafios(desafios, (s) => s.dados)
  const festa = useDesafios(desafios, (s) => s.festa)
  const raiz = useModelo(QUADRO_URL)
  const lugar = useMemo(() => posicaoDoQuadro(preparada.modelo), [preparada])

  const { modelo, manchas } = useMemo(() => {
    const grupo = new Object3D()
    grupo.add(copiarNo(raiz, 'quadro'))
    const manchas: { material: MeshStandardMaterial; cor: Color }[] = []
    for (let i = 1; i <= 6; i++) {
      const no = copiarNo(raiz, `cor-${i}`, true)
      grupo.add(no)
      const material = materiaisDe(no)[0]
      if (material) manchas.push({ material, cor: material.color.clone() })
    }
    return { modelo: grupo, manchas }
  }, [raiz])

  // A cor de cada mancha: 0 (cinza) a 1 (a cor da tinta). Feito acende; a festa anima.
  const quadros = useMemo(
    () => (dados ? quadrosDaIlha(dados.desafios, ilha.id) : []),
    [dados, ilha.id],
  )
  const alvo = useMemo(() => {
    const acesas = quadros.length > 0 ? manchasAcesas(quadros) : []
    return Array.from({ length: 6 }, (_, i) => (acesas[i] ? 1 : 0))
  }, [quadros])
  const atual = useRef<number[]>([0, 0, 0, 0, 0, 0])
  const pintados = useRef(false)

  useEffect(() => {
    // Primeira leitura (ou volta à ilha): as feitas já aparecem pintadas, sem animação.
    if (!pintados.current && dados) {
      atual.current = [...alvo]
      pintados.current = true
    }
  }, [alvo, dados])

  useFrame((_, dt) => {
    for (let i = 0; i < 6; i++) {
      const a = atual.current[i] ?? 0
      const b = alvo[i] ?? 0
      const emFesta = festa?.ilha === ilha.id && festa.quadros.includes(i + 1)
      const passo = emFesta ? dt / DURACAO_DA_COR_S : 1
      const novo = a < b ? Math.min(b, a + passo) : b
      atual.current[i] = novo
      const m = manchas[i]
      if (m) m.material.color.copy(CINZA).lerp(m.cor, novo)
    }
  })

  // Ao chegar na ilha: lê a lista para pintar o quadro.
  useEffect(() => {
    void desafios.getState().carregar()
  }, [desafios])

  // Desafio do dia por fazer: o Zappy avisa uma vez por dia, ao chegar numa ilha completa.
  useEffect(() => {
    if (!dados) return
    const dia = diaParaAvisar(dados, lerAviso(plataforma.perfil.id))
    if (!dia) return
    gravarAviso(plataforma.perfil.id, dia)
    loja.getState().dizer(AVISO_DO_DIA)
  }, [dados, loja, plataforma])

  useInterativo(`quadro-${ilha.id}`, {
    x: centro.x + lugar.x,
    z: centro.z + lugar.z,
    raio: ALCANCE_DO_QUADRO,
    rotulo: () => 'Ver o Quadro das Cores',
    agir: () => {
      loja.getState().abrirPainel(painelDoQuadro(ilha))
      void desafios.getState().carregar()
    },
  })

  return (
    <group position={[lugar.x, lugar.y, lugar.z]} rotation={[0, lugar.giro, 0]}>
      <primitive object={modelo} />
      <Colisores lista={COLISORES_DO_QUADRO} />
    </group>
  )
}
