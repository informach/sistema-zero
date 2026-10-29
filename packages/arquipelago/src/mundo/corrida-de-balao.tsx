import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, MeshStandardMaterial, TorusGeometry } from 'three'
import { lojaDoConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import type { Ponto } from '../sistemas/cipo'
import {
  ARGOLAS,
  type Argola,
  argolasNaIlha,
  type CorridaDeBalao as EstadoDaCorrida,
  fitasNaIlha,
  passoDaCorridaDeBalao,
} from '../sistemas/corrida-de-balao'
import { jogoPausado } from '../sistemas/pausa'
import { PERCURSO_DO_BALAO, vagalumesPegos } from '../sistemas/percurso'
import { paraOMundo, rumoNoMundo } from './bosque'
import { Coletavel, type CoresDoColetavel, terminarCorrida } from './corrida-na-ilha'

/** As cores dos fios do tear da Iriê (`fio1` a `fio6` do `nuvens.glb`), da argola 1 à 6. */
export const CORES_DAS_ARGOLAS = [
  '#ff5f5f',
  '#ffa04f',
  '#ffd84f',
  '#6cd06a',
  '#5aa9ff',
  '#b07cff',
] as const
/** O brilho da argola: a próxima acende; as outras ficam de leve; as já passadas, mais fracas. */
const BRILHO = { proxima: 0.9, esperando: 0.25, passada: 0.08 } as const
/** O tampo das Nuvens no arquivo (a ilha sobe `meio.y` no jogo). */
const TAMPO = 1

export const FALA_DA_PRIMEIRA_ARGOLA = 'Passe de balão pela argola vermelha para começar a corrida.'

/** A fita do arco-íris da corrida: maior que a dos saltos (o balão é largo). */
const CORES_DA_FITA: CoresDoColetavel = {
  nucleo: '#ffb3e6',
  brilho: '#ffe08a',
  degrade: ['rgba(255,240,250,1)', 'rgba(255,170,220,0.55)', 'rgba(255,210,120,0)'],
}

const GEOMETRIA = new TorusGeometry(ARGOLAS.raio, ARGOLAS.tubo, 10, 56)

/**
 * A corrida de balão das Nuvens (fase4-07, regras em `sistemas/corrida-de-balao.ts`): as seis
 * argolas do arco-íris em volta da ilha, a primeira começa e a sexta chega, com o cronômetro e a
 * tela de resultado do percurso genérico. Sem gravar: o melhor fica na sessão.
 */
export function CorridaDeBalao({ meio, giro }: { meio: Ponto; giro: number }) {
  const { loja, movimento } = useJogo()
  const aparelhoPedeMenos = useReducedMotion()
  const argolas = useMemo<Argola[]>(
    () =>
      argolasNaIlha(TAMPO).map((g) => ({
        ...paraOMundo(g, meio, giro, { x: 0, y: 0, z: 0 }),
        rumo: rumoNoMundo(g.rumo, giro),
      })),
    [meio, giro],
  )
  const fitas = useMemo(
    () => fitasNaIlha(TAMPO).map((f) => paraOMundo(f, meio, giro, { x: 0, y: 0, z: 0 })),
    [meio, giro],
  )
  const materiais = useMemo(
    () =>
      CORES_DAS_ARGOLAS.map(
        (cor) =>
          new MeshStandardMaterial({
            color: cor,
            emissive: cor,
            emissiveIntensity: BRILHO.esperando,
            roughness: 0.6,
          }),
      ),
    [],
  )
  useEffect(
    () => () => {
      for (const m of materiais) m.dispose()
    },
    [materiais],
  )
  const estado = useRef<EstadoDaCorrida>({ corrida: null }).current
  const passo = useRef({
    de: { x: 0, y: 0, z: 0 },
    ate: { x: 0, y: 0, z: 0 },
    valido: false,
  }).current
  const marcas = useRef<(Group | null)[]>([])
  const tempo = useRef(0)

  /** A corrida acabou sem chegar (desceu do balão, "Parar", a ilha saiu). */
  const parar = (fala: string | null) => {
    if (!estado.corrida) return
    estado.corrida = null
    if (movimento.corrida) movimento.corrida = null
    const s = loja.getState()
    if (s.corrida?.percurso === PERCURSO_DO_BALAO.id) s.definirCorrida(null)
    if (fala) s.dizer(fala)
  }
  // Uma corrida não continua numa ilha que não está mais ali.
  useEffect(
    () => () => {
      if (estado.corrida && movimento.corrida === estado.corrida) {
        movimento.corrida = null
        loja.getState().definirCorrida(null)
      }
      estado.corrida = null
    },
    [estado, movimento, loja],
  )

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!jogoPausado(s)) tempo.current += dt

    // Pedidos da tela para esta corrida: correr de novo (espera a primeira argola) ou parar.
    const pedido = movimento.pedidoDoPercurso
    if (pedido?.percurso === PERCURSO_DO_BALAO.id) {
      movimento.pedidoDoPercurso = null
      if (pedido.acao === 'parar') parar(PERCURSO_DO_BALAO.falaDoFim)
      else {
        s.mostrarResultado(null)
        parar(null)
        s.dizer(FALA_DA_PRIMEIRA_ARGOLA)
      }
    }

    // O brilho: a próxima argola acende (pulsa de leve, parada com menos movimento).
    const proxima = estado.corrida ? estado.corrida.deque + 1 : 0
    for (let i = 0; i < materiais.length; i++) {
      const m = materiais[i]
      if (!m) continue
      const pulso = menos ? 0 : Math.sin(tempo.current * 3) * 0.15
      m.emissiveIntensity =
        i === proxima ? BRILHO.proxima + pulso : i < proxima ? BRILHO.passada : BRILHO.esperando
    }
    const c = estado.corrida
    for (let i = 0; i < marcas.current.length; i++) {
      const g = marcas.current[i]
      if (g) g.visible = c?.situacao === 'correndo' && !c.pegos[i]
    }

    // Só no voo: descer do balão (ou a ilha sair) termina a corrida sem chegar.
    const v = movimento.balao
    if (movimento.modo !== 'balao' || v?.fase !== 'voo') {
      passo.valido = false
      if (estado.corrida) parar(PERCURSO_DO_BALAO.falaDoFim)
      return
    }
    if (jogoPausado(s)) return
    passo.ate.x = v.pe.x
    passo.ate.y = v.pe.y + ARGOLAS.meioDoBalao
    passo.ate.z = v.pe.z
    if (!passo.valido) {
      passo.valido = true
      passo.de.x = passo.ate.x
      passo.de.y = passo.ate.y
      passo.de.z = passo.ate.z
      return
    }
    const ev = passoDaCorridaDeBalao(
      estado,
      passo.de,
      passo.ate,
      argolas,
      fitas,
      PERCURSO_DO_BALAO.raioDoVagalume,
      dt * 1000,
    )
    passo.de.x = passo.ate.x
    passo.de.y = passo.ate.y
    passo.de.z = passo.ate.z
    if (!ev || !estado.corrida) return
    const corrida = estado.corrida
    if (ev.tipo === 'comecou') {
      movimento.corrida = corrida
      s.mostrarResultado(null)
      s.definirCorrida({
        percurso: PERCURSO_DO_BALAO.id,
        vagalumes: 0,
        totalDeVagalumes: corrida.pegos.length,
      })
      s.dizer(PERCURSO_DO_BALAO.falaDoComeco)
    } else if (ev.tipo === 'fita') {
      s.definirCorrida({
        percurso: PERCURSO_DO_BALAO.id,
        vagalumes: vagalumesPegos(corrida),
        totalDeVagalumes: corrida.pegos.length,
      })
    } else if (ev.tipo === 'chegou') {
      estado.corrida = null
      movimento.corrida = null
      terminarCorrida(loja, PERCURSO_DO_BALAO, corrida)
    } else if (ev.tipo === 'desistiu') parar(PERCURSO_DO_BALAO.falaDoFim)
  })

  return (
    <>
      {argolas.map((g, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: as argolas são fixas e na ordem
          key={i}
          name={`argola-${i + 1}`}
          geometry={GEOMETRIA}
          material={materiais[i]}
          position={[g.x, g.y, g.z]}
          rotation-y={g.rumo}
        />
      ))}
      {fitas.map((f, i) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: as fitas são fixas e na ordem
          key={i}
          ref={(g) => {
            marcas.current[i] = g
          }}
          position={[f.x, f.y, f.z]}
          scale={2}
          visible={false}
        >
          <Coletavel cores={CORES_DA_FITA} />
        </group>
      ))}
    </>
  )
}
