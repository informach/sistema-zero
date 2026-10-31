import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { PontosDoPercurso } from '../sistemas/percurso'
import { PERCURSO_DOS_TELHADOS } from '../sistemas/percurso'
import { segredoObrigatorio } from '../sistemas/segredos'
import { AtalhosDosTelhados } from './atalhos-dos-telhados'
import { BalcoesDaVila } from './balcoes-da-vila'
import { BancosDaVila } from './bancos-da-vila'
import { Bento } from './bento'
import { ancorasDosLumis, BorroesDaIlha } from './borroes-da-ilha'
import { percursoNoMundo } from './bosque'
import { BrinquedoDeMinijogo } from './brinquedo-de-minijogo'
import { type CoresDoColetavel, CorridaNaIlha } from './corrida-na-ilha'
import { FeiraDaVila } from './feira'
import { FestaNaVila } from './festa-na-vila'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { giroDaIlha } from './medidas'
import { ComReserva } from './modelos'
import { SegredoNoAlto } from './segredos-das-ilhas'
import {
  type AncorasDosTelhados,
  NOMES_DAS_ANCORAS_DOS_TELHADOS,
  telhadosNoModelo,
} from './telhados'

/** Os pés a menos disto do chão da praça, pisando, contam como queda da entrega. */
const CHAO_DA_VILA = 0.25

/** O confeito do caminho: cor-de-rosa, com o brilho quente. */
const CORES_DO_CONFEITO: CoresDoColetavel = {
  nucleo: '#ff7eb6',
  brilho: '#ffc2dd',
  degrade: ['rgba(255,240,248,1)', 'rgba(255,150,200,0.55)', 'rgba(255,120,180,0)'],
}

/**
 * O que mexe na Vila Doce (montado pelo `anel.tsx` só com a ilha completa ATIVA, em coordenadas do
 * mundo): o Bento na frente da padaria, os balcões dos turnos (fase2-03), a entrega pelos
 * telhados (fase2-05), a festa da estação (fase2-10), os borrões da noite e os Lumis da Vila
 * (fase2-06), os bancos de sentar (fase2-13) e a barraca do minijogo da ilha (B10).
 */
/** O segredo desta ilha (N12): o baú no alto do vento. */
const SEGREDO_VILA_DOCE = segredoObrigatorio('vila-doce')

export function VilaViva({
  ilha,
  centro,
  preparada,
  troca,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  preparada: IlhaPreparada
  /** A troca da leve pela completa: as peças daqui aparecem quando a completa terminou de entrar. */
  troca: Troca
}) {
  const giro = giroDaIlha(ilha)
  const meio = useMemo(() => ({ x: centro.x, y: 0, z: centro.z }), [centro.x, centro.z])
  const lugaresDosLumis = useMemo(
    () => ancorasDosLumis(preparada.modelo, meio, giro),
    [preparada, meio, giro],
  )
  const pecas = useRef<Group>(null)
  const telhados = useMemo<PontosDoPercurso | null>(() => {
    const ancoras: Partial<AncorasDosTelhados> = {}
    for (const nome of NOMES_DAS_ANCORAS_DOS_TELHADOS) {
      const no = preparada.modelo.getObjectByName(nome)
      if (!no) return null
      ancoras[nome] = { x: no.position.x, y: no.position.y, z: no.position.z }
    }
    return percursoNoMundo(telhadosNoModelo(ancoras as AncorasDosTelhados), meio, giro)
  }, [preparada, meio, giro])
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  return (
    <group ref={pecas} visible={false}>
      <ComReserva reserva={null}>
        <Bento modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      <BalcoesDaVila modelo={preparada.modelo} meio={meio} giro={giro} />
      <BancosDaVila colisores={preparada.colisores} meio={meio} />
      <FeiraDaVila modelo={preparada.modelo} meio={meio} giro={giro} />
      <BrinquedoDeMinijogo ilha="vila-doce" modelo={preparada.modelo} meio={meio} giro={giro} />
      <AtalhosDosTelhados modelo={preparada.modelo} meio={meio} giro={giro} />
      <FestaNaVila meio={meio} giro={giro} />
      <BorroesDaIlha ilha="vila-doce" ancoras={lugaresDosLumis} meio={meio} />
      <SegredoNoAlto segredo={SEGREDO_VILA_DOCE} meio={meio} giro={giro} />
      {telhados ? (
        <CorridaNaIlha
          ilhaId={ilha.id}
          config={PERCURSO_DOS_TELHADOS}
          pontos={telhados}
          largada={telhados.largada}
          alturaDoChao={telhados.centro.y + CHAO_DA_VILA}
          cores={CORES_DO_CONFEITO}
        />
      ) : null}
    </group>
  )
}
