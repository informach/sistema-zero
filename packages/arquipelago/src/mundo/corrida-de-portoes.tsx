import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, CylinderGeometry, type Group, MeshStandardMaterial } from 'three'
import { lojaDoConforto } from '../estado/conforto'
import { type Movimento, type Rastro, useJogo } from '../estado/contexto'
import { lojaDosFantasmas } from '../estado/fantasmas'
import type { Ponto } from '../sistemas/cipo'
import {
  type CorridaDePortoes as EstadoDaCorrida,
  type Portao,
  passoDaCorridaDePortoes,
} from '../sistemas/corrida-de-portoes'
import { jogoPausado } from '../sistemas/pausa'
import { type ConfigDoPercurso, segredoAparece, vagalumesPegos } from '../sistemas/percurso'
import { Coletavel, type CoresDoColetavel, terminarCorrida } from './corrida-na-ilha'

/** O brilho do portão: o próximo acende; os outros ficam de leve; os já passados, mais fracos. */
const BRILHO = { proximo: 0.9, esperando: 0.2, passado: 0.05 } as const
const ALTURA_DO_POSTE = 2.4
const POSTE = new CylinderGeometry(0.09, 0.11, ALTURA_DO_POSTE, 10)
const BANDEIRA = new BoxGeometry(0.7, 0.42, 0.04)

/**
 * Uma corrida de portões de um brinquedo de ilha (lacunas, 01/11/2026; regras em
 * `sistemas/corrida-de-portoes.ts`): os portões de bandeira em ordem, o primeiro começa e o último
 * chega, com o cronômetro, o resultado, o fantasma e o melhor no salvamento do percurso genérico.
 * `ponto` diz onde está quem corre enquanto está no brinquedo (o corpo no trenó, a criança montada)
 * e `null` fora dele: sair do brinquedo no meio termina a corrida sem chegar.
 */
export function CorridaDePortoes({
  config,
  portoes,
  coisas,
  ponto,
  cor,
  coresDaCoisa,
  falaDoPrimeiro,
}: {
  config: ConfigDoPercurso
  portoes: readonly Portao[]
  coisas: readonly Ponto[]
  ponto: (movimento: Movimento, rastro: Rastro) => Ponto | null
  cor: string
  coresDaCoisa: CoresDoColetavel
  falaDoPrimeiro: string
}) {
  const { loja, movimento, rastro, plataforma, fila } = useJogo()
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  const aparelhoPedeMenos = useReducedMotion()
  const materiais = useMemo(
    () =>
      portoes.map(
        () =>
          new MeshStandardMaterial({
            color: cor,
            emissive: cor,
            emissiveIntensity: BRILHO.esperando,
            roughness: 0.6,
          }),
      ),
    [portoes, cor],
  )
  const madeira = useMemo(() => new MeshStandardMaterial({ color: '#f4efe6', roughness: 0.8 }), [])
  useEffect(
    () => () => {
      for (const m of materiais) m.dispose()
      madeira.dispose()
    },
    [materiais, madeira],
  )
  const estado = useRef<EstadoDaCorrida>({ corrida: null }).current
  const passo = useRef({
    de: { x: 0, y: 0, z: 0 },
    ate: { x: 0, y: 0, z: 0 },
    valido: false,
  }).current
  const marcas = useRef<(Group | null)[]>([])
  const tempo = useRef(0)

  const parar = (fala: string | null) => {
    fantasmas.cancelar(config.id)
    if (!estado.corrida) return
    estado.corrida = null
    if (movimento.corrida) movimento.corrida = null
    const s = loja.getState()
    if (s.corrida?.percurso === config.id) s.definirCorrida(null)
    if (fala) s.dizer(fala)
  }
  // Uma corrida não continua numa ilha que não está mais ali.
  useEffect(
    () => () => {
      fantasmas.cancelar(config.id)
      if (estado.corrida && movimento.corrida === estado.corrida) {
        movimento.corrida = null
        loja.getState().definirCorrida(null)
      }
      estado.corrida = null
    },
    [estado, movimento, loja, fantasmas, config.id],
  )

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!jogoPausado(s)) tempo.current += dt

    // Pedidos da tela: correr de novo (espera o primeiro portão) ou parar.
    const pedido = movimento.pedidoDoPercurso
    if (pedido?.percurso === config.id) {
      movimento.pedidoDoPercurso = null
      if (pedido.acao === 'parar') parar(config.falaDoFim)
      else {
        s.mostrarResultado(null)
        parar(null)
        s.dizer(falaDoPrimeiro)
      }
    }

    const proximo = estado.corrida ? estado.corrida.deque + 1 : 0
    for (let i = 0; i < materiais.length; i++) {
      const m = materiais[i]
      if (!m) continue
      const pulso = menos ? 0 : Math.sin(tempo.current * 3) * 0.15
      m.emissiveIntensity =
        i === proximo ? BRILHO.proximo + pulso : i < proximo ? BRILHO.passado : BRILHO.esperando
    }
    const c = estado.corrida
    for (let i = 0; i < marcas.current.length; i++) {
      const g = marcas.current[i]
      const f = coisas[i]
      // A coisa escondida (o segredo, A9) só aparece de perto.
      if (g)
        g.visible =
          c?.situacao === 'correndo' &&
          !c.pegos[i] &&
          (i !== c.segredo || (f !== undefined && segredoAparece(f, rastro)))
    }

    const aqui = ponto(movimento, rastro)
    if (!aqui) {
      passo.valido = false
      if (estado.corrida) parar(config.falaDoFim)
      return
    }
    if (jogoPausado(s)) return
    passo.ate.x = aqui.x
    passo.ate.y = aqui.y
    passo.ate.z = aqui.z
    if (!passo.valido) {
      passo.valido = true
      passo.de.x = aqui.x
      passo.de.y = aqui.y
      passo.de.z = aqui.z
      return
    }
    const ev = passoDaCorridaDePortoes(
      estado,
      passo.de,
      passo.ate,
      portoes,
      coisas,
      config.raioDoVagalume,
      dt * 1000,
    )
    passo.de.x = passo.ate.x
    passo.de.y = passo.ate.y
    passo.de.z = passo.ate.z
    if (estado.corrida && ev?.tipo !== 'comecou') fantasmas.quadro(estado.corrida.tempoMs, rastro)
    if (!ev || !estado.corrida) return
    const corrida = estado.corrida
    if (ev.tipo === 'comecou') {
      fantasmas.comecar(config.id, rastro)
      movimento.corrida = corrida
      s.mostrarResultado(null)
      s.definirCorrida({
        percurso: config.id,
        vagalumes: 0,
        totalDeVagalumes: corrida.pegos.length,
      })
      s.dizer(config.falaDoComeco)
    } else if (ev.tipo === 'coleta') {
      s.definirCorrida({
        percurso: config.id,
        vagalumes: vagalumesPegos(corrida),
        totalDeVagalumes: corrida.pegos.length,
      })
    } else if (ev.tipo === 'chegou') {
      estado.corrida = null
      movimento.corrida = null
      terminarCorrida(loja, config, corrida)
      fantasmas.terminar(config.id, corrida.tempoMs, rastro)
    } else if (ev.tipo === 'desistiu') parar(config.falaDoFim)
  })

  return (
    <>
      {portoes.map((g, i) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: os portões são fixos e na ordem
          key={i}
          name={`portao-${config.id}-${i + 1}`}
          position={[g.x, g.y, g.z]}
          rotation-y={g.rumo + Math.PI / 2}
        >
          {[-1, 1].map((lado) => (
            <group key={lado} position={[0, 0, lado * g.meiaLargura]}>
              <mesh
                geometry={POSTE}
                material={madeira}
                position={[0, ALTURA_DO_POSTE / 2, 0]}
                castShadow
              />
              <mesh
                geometry={BANDEIRA}
                material={materiais[i]}
                position={[0.38, ALTURA_DO_POSTE - 0.25, 0]}
              />
            </group>
          ))}
        </group>
      ))}
      {coisas.map((f, i) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: as coisas são fixas e na ordem
          key={i}
          ref={(g) => {
            marcas.current[i] = g
          }}
          position={[f.x, f.y, f.z]}
          scale={1.6}
          visible={false}
        >
          <Coletavel cores={coresDaCoisa} />
        </group>
      ))}
    </>
  )
}
