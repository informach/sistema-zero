import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import cristalAzul from '../assets/itens/cristal-azul.glb'
import cristalRoxo from '../assets/itens/cristal-roxo.glb'
import cristalVerde from '../assets/itens/cristal-verde.glb'
import estrelaCadente from '../assets/itens/estrela-cadente.glb'
import estrelaCintilante from '../assets/itens/estrela-cintilante.glb'
import estrelaSorriso from '../assets/itens/estrela-sorriso.glb'
import estrelaTrio from '../assets/itens/estrela-trio.glb'
import notaClave from '../assets/itens/nota-clave-de-sol.glb'
import notaColcheia from '../assets/itens/nota-colcheia.glb'
import notaDupla from '../assets/itens/nota-dupla.glb'
import notaSeminima from '../assets/itens/nota-seminima.glb'
import { lojaDoConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import type { EstadoDoJogo } from '../estado/loja'
import type { Ponto } from '../sistemas/cipo'
import {
  alcancaNaIlha,
  descobriuNaIlha,
  falaDaDescoberta,
  type IlhaDaColecao,
  LEMBRANCAS_DAS_ILHAS,
  type PecaDaColecao,
  registrarNaIlha,
} from '../sistemas/colecoes-das-ilhas'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { paraOMundo } from './bosque'
import { useInterativo } from './interativos'
import { ComReserva, useModelo } from './modelos'

const MODELOS: Readonly<Record<string, string>> = {
  'nota-seminima': notaSeminima,
  'nota-colcheia': notaColcheia,
  'nota-dupla': notaDupla,
  'nota-clave-de-sol': notaClave,
  'cristal-azul': cristalAzul,
  'cristal-roxo': cristalRoxo,
  'cristal-verde': cristalVerde,
  'estrela-cadente': estrelaCadente,
  'estrela-sorriso': estrelaSorriso,
  'estrela-cintilante': estrelaCintilante,
  'estrela-trio': estrelaTrio,
}

/** As peças da arte têm de 7 a 23 cm; três vezes maiores, a criança vê de longe na neve. */
export const ESCALA_DA_COLECAO = 3
/** As notas flutuam um pouco acima do chão, girando devagar; cristais e estrelas ficam no chão. */
const FLUTUA = { altura: 0.45, sobe: 0.08, giro: 0.6 } as const

function podeInteragir(s: EstadoDoJogo): boolean {
  return !s.acesso.somenteLeitura && !s.visita && !jogoPausado(s)
}

function Peca({ p, ponto }: { p: PecaDaColecao; ponto: Ponto }) {
  // Suspende antes de registrar a interação: uma peça que ainda não carregou não se pega.
  const modelo = useModelo(new URL(MODELOS[p.id] as string, import.meta.url).href)
  const copia = useMemo(() => modelo.clone(true), [modelo])
  const { loja, movimento, rastro, ambiente } = useJogo()
  const achada = useEstado((s) => descobriuNaIlha(s.salvamento, p.id))
  const pausado = useEstado(jogoPausado)
  const aparelhoPedeMenos = useReducedMotion()
  const grupo = useRef<Group>(null)
  const tempo = useRef(ponto.x * 0.31 + ponto.z * 0.17)
  // A estrela que só cai à noite: o estado só muda na troca do dia, não a cada quadro.
  const [visivel, setVisivel] = useState(!p.noite)
  const flutua = p.grupo === 'notas'

  useFrame((_, dt) => {
    if (p.noite && ambiente.noite !== visivel) setVisivel(ambiente.noite)
    const g = grupo.current
    if (!g || !flutua) return
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!pausado && !menos) tempo.current += Math.min(dt, 0.1)
    g.position.y = ponto.y + FLUTUA.altura + (menos ? 0 : Math.sin(tempo.current * 2) * FLUTUA.sobe)
    g.rotation.y = tempo.current * FLUTUA.giro
  })

  const perto = () => {
    if (movimento.modo !== 'chao') return false
    return alcancaNaIlha(ponto, { x: rastro.x, y: rastro.y - CORPO.doCentroAoPe, z: rastro.z })
  }
  const naHora = () => !p.noite || ambiente.noite
  useInterativo(`colecao:${p.id}`, {
    x: ponto.x,
    z: ponto.z,
    raio: 1.4,
    rotulo() {
      const s = loja.getState()
      if (!podeInteragir(s) || !naHora() || !perto() || descobriuNaIlha(s.salvamento, p.id))
        return null
      return p.pegar
    },
    agir() {
      const s = loja.getState()
      if (!podeInteragir(s) || !naHora() || !perto() || descobriuNaIlha(s.salvamento, p.id)) return
      s.mudar((v) => registrarNaIlha(v, p.id))
      const depois = loja.getState().salvamento
      if (!descobriuNaIlha(depois, p.id)) return
      s.dizer(falaDaDescoberta(p, depois))
    },
  })

  if (achada || !visivel) return null
  return (
    <group
      ref={grupo}
      name={`colecao-${p.id}`}
      position={[ponto.x, ponto.y + (flutua ? FLUTUA.altura : 0.02), ponto.z]}
      scale={ESCALA_DA_COLECAO}
    >
      <primitive object={copia} dispose={null} />
    </group>
  )
}

/**
 * As peças das coleções de uma ilha do anel (o Pico ou as Nuvens), montadas pela ilha viva dela: os
 * lugares do catálogo, no referencial do GLB, levados ao mundo com o meio e o giro da ilha. O
 * cristal rosa não está aqui: é o do pedestal da caverna (`cristal-do-pico.tsx`).
 */
export function ColecoesDaIlha({
  ilha,
  meio,
  giro,
}: {
  ilha: IlhaDaColecao
  meio: Ponto
  giro: number
}) {
  const pecas = useMemo(
    () =>
      LEMBRANCAS_DAS_ILHAS.flatMap((p) =>
        p.ilha === ilha && p.lugar
          ? [{ p, ponto: paraOMundo(p.lugar, meio, giro, { x: 0, y: 0, z: 0 }) }]
          : [],
      ),
    [ilha, meio, giro],
  )
  return (
    <>
      {pecas.map(({ p, ponto }) => (
        <ComReserva key={p.id} reserva={null}>
          <Peca p={p} ponto={ponto} />
        </ComReserva>
      ))}
    </>
  )
}
