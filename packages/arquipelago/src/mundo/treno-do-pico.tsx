import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { type Object3D, Vector3 } from 'three'
import { useJogo } from '../estado/contexto'
import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import { corridaDoTreno } from '../sistemas/corrida-de-portoes'
import { PERCURSO_DO_TRENO } from '../sistemas/percurso'
import { pistaDoTreno, TRENO } from '../sistemas/treno'
import { paraOMundo } from './bosque'
import { CorridaDePortoes } from './corrida-de-portoes'
import type { CoresDoColetavel } from './corrida-na-ilha'
import { useInterativo } from './interativos'

/** As bandeirinhas da descida de trenó (lacunas, 01/11/2026). */
const CORES_DA_BANDEIRINHA: CoresDoColetavel = {
  nucleo: '#ff6b6b',
  brilho: '#fff1a8',
  degrade: ['rgba(255,245,245,1)', 'rgba(255,120,120,0.55)', 'rgba(255,220,120,0)'],
}
export const FALA_DO_PRIMEIRO_PORTAO_DO_TRENO =
  'Desça de trenó pelo primeiro portão de bandeira para começar a corrida.'

const tmpV = new Vector3()
/** O desenho do trenó tem a origem 2 cm acima do chão do platô (os patins encostam no chão). */
const ALTURA_DO_DESENHO = 0.02

/**
 * O trenó do Pico Gelado (fase3-07): a pista é a linha `treno-curva-N` do `pico.glb` (do trenó
 * parado no platô, trilha abaixo, até o pé), registrada para o personagem. Perto do trenó,
 * "Descer de trenó" senta a criança (o pedido `escorregar`); na descida o nó `treno-desenho` (com
 * a origem na base do trenó) vai debaixo dela, virado para onde ela desce, e no fim volta ao platô.
 */
export function TrenoDoPico({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const { loja, movimento, rastro } = useJogo()
  const pista = useMemo(() => {
    const pontos: Ponto[] = []
    for (let i = 1; ; i++) {
      const no = modelo.getObjectByName(`treno-curva-${i}`)
      if (!no) break
      pontos.push(paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 }))
    }
    return pistaDoTreno('pico:treno', pontos)
  }, [modelo, meio, giro])
  // O trenó parado e onde ele fica, para voltar ao platô depois da descida. Parado, ele olha para
  // a boca da trilha (o segundo ponto da pista): o giro na descida é somado a partir daí.
  const treno = useMemo(() => {
    const no = modelo.getObjectByName('treno-desenho')
    const [a, b] = pista?.pontos ?? []
    if (!no || !a || !b) return null
    return {
      no,
      posicao: no.position.clone(),
      giro: no.rotation.y,
      olhaPara: Math.atan2(b.x - a.x, b.z - a.z),
    }
  }, [modelo, pista])

  useEffect(() => {
    if (!pista) return
    movimento.escorregadores.push(pista)
    return () => {
      const i = movimento.escorregadores.indexOf(pista)
      if (i >= 0) movimento.escorregadores.splice(i, 1)
    }
  }, [pista, movimento])
  useEffect(
    () => () => {
      if (!treno) return
      treno.no.position.copy(treno.posicao)
      treno.no.rotation.y = treno.giro
    },
    [treno],
  )

  const inicio = pista?.pontos[0]
  useInterativo('pico:treno', {
    x: inicio?.x ?? 0,
    z: inicio?.z ?? 0,
    raio: inicio ? TRENO.alcance : 0,
    // No meio da subida contra o relógio o trenó espera: descer no meio dela não faz sentido.
    rotulo: () => (movimento.modo === 'chao' && !movimento.corrida ? 'Descer de trenó' : null),
    agir() {
      if (!pista) return
      movimento.pedido = { tipo: 'escorregar', escorregador: pista }
      loja
        .getState()
        .dizer('Segure firme. Para os lados, o trenó vai junto. Para sair antes, é só pular.')
    },
  })

  useFrame(() => {
    if (!treno) return
    const { no } = treno
    if (movimento.modo !== 'escorregar' || !pista) {
      if (!no.position.equals(treno.posicao)) {
        no.position.copy(treno.posicao)
        no.rotation.y = treno.giro
      }
      return
    }
    // Debaixo de quem desce: os patins no chão da pista, virado para onde ela desce (a ilha só
    // gira em volta do eixo de cima, então o giro no mundo e no modelo diferem pelo mesmo tanto).
    const pai = no.parent
    if (!pai) return
    tmpV.set(rastro.x, rastro.y - CORPO.doCentroAoPe - CORPO.folga + ALTURA_DO_DESENHO, rastro.z)
    no.position.copy(pai.worldToLocal(tmpV))
    no.rotation.y = treno.giro + rastro.direcao - treno.olhaPara
  })

  // A descida como minijogo: os portões de bandeira pela pista (no Pico, o único escorregador é o
  // trenó, então descendo é estar no trenó).
  const corrida = useMemo(() => (pista ? corridaDoTreno(pista.pontos) : null), [pista])
  if (!corrida) return null
  return (
    <CorridaDePortoes
      config={PERCURSO_DO_TRENO}
      portoes={corrida.portoes}
      coisas={corrida.coisas}
      ponto={(m, r) => (m.modo === 'escorregar' ? r : null)}
      cor="#e8414b"
      coresDaCoisa={CORES_DA_BANDEIRINHA}
      falaDoPrimeiro={FALA_DO_PRIMEIRO_PORTAO_DO_TRENO}
    />
  )
}
