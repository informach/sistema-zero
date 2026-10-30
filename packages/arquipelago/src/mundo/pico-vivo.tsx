import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { PERCURSO_DO_CUME, type PontosDoPercurso } from '../sistemas/percurso'
import { BancosDaVila } from './bancos-da-vila'
import { BandaDoPico } from './banda-do-pico'
import { ancorasDosLumis, BorroesDaIlha } from './borroes-da-ilha'
import { percursoNoMundo } from './bosque'
import { CabanaDaIlha } from './cabana-do-bosque'
import { CorrenteDoPico } from './corrente-de-ar'
import { type CoresDoColetavel, CorridaNaIlha } from './corrida-na-ilha'
import { CristalDoPico } from './cristal-do-pico'
import { Floco } from './floco'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { giroDaIlha } from './medidas'
import { ComReserva } from './modelos'
import { lerAncorasDaSubida, subidaNoModelo } from './subida'
import { TrenoDoPico } from './treno-do-pico'

/** Os pés a menos disto do chão em volta da montanha, pisando, contam como queda da subida. */
const CHAO_DO_PICO = 0.3

/** O floco de neve da trilha: branco, com o brilho azul do gelo. */
const CORES_DO_FLOCO: CoresDoColetavel = {
  nucleo: '#f4fbff',
  brilho: '#bfe6ff',
  degrade: ['rgba(255,255,255,1)', 'rgba(170,220,255,0.55)', 'rgba(140,200,255,0)'],
}

/**
 * O Pico Gelado vivo (fase3-06): só existe com a ilha ativa. O Floco no palco, a subida ao cume
 * contra o relógio pela trilha em espiral, o trenó que desce por ela e o cristal raro da caverna
 * (fase3-07); a banda do festival de inverno, o fogareiro e os bancos do iglu (fase3-08); o vento
 * que sobe na frente da parede de gelo, para o planador (fase3-09).
 */
export function PicoVivo({
  ilha,
  centro,
  preparada,
  troca,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  preparada: IlhaPreparada
  troca: Troca
}) {
  const giro = giroDaIlha(ilha)
  const meio = useMemo(() => ({ ...centro, y: 0 }), [centro])
  const lugaresDosLumis = useMemo(
    () => ancorasDosLumis(preparada.modelo, meio, giro),
    [preparada, meio, giro],
  )
  const pecas = useRef<Group>(null)
  const subida = useMemo<PontosDoPercurso | null>(() => {
    const ancoras = lerAncorasDaSubida((nome) => {
      const no = preparada.modelo.getObjectByName(nome)
      return no ? { x: no.position.x, y: no.position.y, z: no.position.z } : undefined
    })
    return ancoras ? percursoNoMundo(subidaNoModelo(ancoras), meio, giro) : null
  }, [preparada, meio, giro])
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  return (
    <group ref={pecas} visible={false}>
      <BorroesDaIlha ilha="pico" ancoras={lugaresDosLumis} meio={meio} />
      {/* O iglu (E04): aparece quando o modelo trouxer as âncoras do lote. */}
      <CabanaDaIlha ilha="pico" modelo={preparada.modelo} meio={meio} giro={giro} />
      <ComReserva reserva={null}>
        <Floco modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      <TrenoDoPico modelo={preparada.modelo} meio={meio} giro={giro} />
      <CristalDoPico modelo={preparada.modelo} meio={meio} giro={giro} />
      <BandaDoPico modelo={preparada.modelo} meio={meio} giro={giro} troca={troca} />
      <BancosDaVila colisores={preparada.colisores} meio={meio} />
      <CorrenteDoPico modelo={preparada.modelo} meio={meio} giro={giro} />
      {subida ? (
        <CorridaNaIlha
          ilhaId={ilha.id}
          config={PERCURSO_DO_CUME}
          pontos={subida}
          largada={subida.largada}
          alturaDoChao={subida.centro.y + CHAO_DO_PICO}
          cores={CORES_DO_FLOCO}
        />
      ) : null}
    </group>
  )
}
