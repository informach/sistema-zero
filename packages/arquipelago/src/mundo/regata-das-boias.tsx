import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useJogo } from '../estado/contexto'
import { criarRotaDaRegata, type RotaDoBarco } from '../sistemas/barco'
import { jogoPausado } from '../sistemas/pausa'
import {
  type Corrida,
  criarCorrida,
  indiceDoSegredo,
  PERCURSO_DA_REGATA,
  segredoAparece,
  vagalumesPegos,
} from '../sistemas/percurso'
import { boiasDaRegata, RAIO_DA_BOIA } from '../sistemas/regata'
import { Coletavel, type CoresDoColetavel, terminarCorrida } from './corrida-na-ilha'
import { PORTOS_DA_ARTE } from './portos-da-arte'

export const FALA_DA_REGATA =
  'Valendo a volta das boias. Para a frente, você rema; para os lados, o barco vai junto. Pegue as boias de presente.'

/** As boias de presente: vermelho e branco, como as boias da borda. */
const CORES_DA_BOIA: CoresDoColetavel = {
  nucleo: '#ff6b6b',
  brilho: '#ffffff',
  degrade: ['rgba(255,255,255,1)', 'rgba(255,120,120,0.55)', 'rgba(255,200,200,0)'],
}

let rotaGuardada: RotaDoBarco | null = null
/** A rota da regata (uma vez: o cais da sua ilha não muda). */
export function rotaDaRegata(): RotaDoBarco {
  rotaGuardada ??= criarRotaDaRegata(PORTOS_DA_ARTE['sua-ilha'])
  return rotaGuardada
}

/**
 * A corrida da volta das boias (lacunas, 01/11/2026): começa quando o barco da regata sai do cais,
 * as boias se pegam passando o barco perto delas, e a chegada é a volta ao mesmo cais, com o
 * cronômetro, o resultado e o melhor do percurso `barco-regata`.
 */
export function RegataDasBoias() {
  const { loja, movimento, rastro } = useJogo()
  const boias = useMemo(() => boiasDaRegata(rotaDaRegata()), [])
  const corrida = useRef<Corrida | null>(null)
  const marcas = useRef<(Group | null)[]>([])

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    const v = movimento.barco
    // Pedidos da tela: "Parar" deixa o barco voltar ao cais sem cronômetro; "Correr de novo" lembra
    // que a regata começa no cais da sua ilha.
    const pedido = movimento.pedidoDoPercurso
    if (pedido?.percurso === PERCURSO_DA_REGATA.id) {
      movimento.pedidoDoPercurso = null
      if (pedido.acao === 'parar' && corrida.current) {
        corrida.current.situacao = 'desistiu'
        if (movimento.corrida === corrida.current) movimento.corrida = null
        s.definirCorrida(null)
        s.dizer(PERCURSO_DA_REGATA.falaDoFim)
      } else if (pedido.acao === 'recomecar') {
        s.mostrarResultado(null)
        s.dizer(PERCURSO_DA_REGATA.falaDoFim)
      }
    }
    const c = corrida.current
    const naRegata = v?.regata !== undefined
    for (let i = 0; i < marcas.current.length; i++) {
      const g = marcas.current[i]
      const b = boias[i]
      if (g)
        g.visible =
          naRegata &&
          c?.situacao === 'correndo' &&
          !c.pegos[i] &&
          (i !== c.segredo || (b !== undefined && segredoAparece(b, rastro)))
    }
    if (!v || !naRegata) {
      if (c) {
        corrida.current = null
        if (movimento.corrida === c) movimento.corrida = null
        if (s.corrida?.percurso === PERCURSO_DA_REGATA.id) s.definirCorrida(null)
      }
      return
    }
    // Começa quando sai do cais.
    if (!c && v.fase === 'viagem') {
      const inicio = PORTOS_DA_ARTE['sua-ilha'].barco
      const nova = criarCorrida(boias.length, indiceDoSegredo(inicio, inicio, boias))
      corrida.current = nova
      movimento.corrida = nova
      s.mostrarResultado(null)
      s.definirCorrida({
        percurso: PERCURSO_DA_REGATA.id,
        vagalumes: 0,
        totalDeVagalumes: boias.length,
      })
      return
    }
    if (c && c.situacao !== 'correndo') {
      // Parou no meio: espera o barco voltar ao cais para a próxima regata começar limpa.
      if (v.fase === 'atracado') corrida.current = null
      return
    }
    if (!c) return
    if (v.fase === 'viagem' || v.fase === 'espera') {
      if (!jogoPausado(s)) c.tempoMs += dt * 1000
      for (let i = 0; i < boias.length; i++) {
        const b = boias[i]
        if (!b || c.pegos[i]) continue
        if (Math.hypot(v.pose.x - b.x, v.pose.z - b.z) < RAIO_DA_BOIA) {
          c.pegos[i] = true
          s.definirCorrida({
            percurso: PERCURSO_DA_REGATA.id,
            vagalumes: vagalumesPegos(c),
            totalDeVagalumes: boias.length,
          })
        }
      }
      return
    }
    // De volta ao cais: chegou.
    if (v.fase === 'desembarque' || v.fase === 'atracado') {
      c.situacao = 'chegou'
      c.tempoMs = Math.round(c.tempoMs)
      corrida.current = null
      movimento.corrida = null
      terminarCorrida(loja, PERCURSO_DA_REGATA, c)
    }
  })

  return (
    <>
      {boias.map((b, i) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: as boias são fixas e na ordem
          key={i}
          ref={(g) => {
            marcas.current[i] = g
          }}
          position={[b.x, b.y + 0.8, b.z]}
          scale={2.2}
          visible={false}
        >
          <Coletavel cores={CORES_DA_BOIA} />
        </group>
      ))}
    </>
  )
}
