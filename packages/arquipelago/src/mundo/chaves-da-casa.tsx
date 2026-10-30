import { chaveAchada } from '@sistemazero/arquipelago-contracts'
import { useMemo } from 'react'
import modeloDaChave from '../assets/itens/chave.glb'
import { useEstado, useJogo } from '../estado/contexto'
import type { EstadoDoJogo } from '../estado/loja'
import {
  CHAVES_DA_CASA,
  type ChaveDaCasa,
  falaDaChave,
  guardarChave,
  TEXTOS_DAS_CHAVES,
} from '../sistemas/chaves-da-casa'
import { alcancaNaPraia } from '../sistemas/colecoes-da-praia'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { useInterativo } from './interativos'
import { alturaDaIlha } from './medidas'
import { ComReserva, useModelo } from './modelos'

function podePegar(s: EstadoDoJogo): boolean {
  return !s.acesso.somenteLeitura && !s.visita && !jogoPausado(s)
}

/** Uma chave ao pé da árvore: some depois de achada (o bit fica no salvamento, N11). */
function Chave({ c }: { c: ChaveDaCasa }) {
  // Suspende antes de registrar a interação: chave sem modelo não se pega.
  const modelo = useModelo(new URL(modeloDaChave, import.meta.url).href)
  const copia = useMemo(() => modelo.clone(true), [modelo])
  const { loja, movimento, rastro } = useJogo()
  const achada = useEstado((s) => chaveAchada(s.salvamento.chaves, c.comodo))
  const y = alturaDaIlha(c.x, c.z)
  const ponto = useMemo(() => ({ x: c.x, y, z: c.z }), [c.x, y, c.z])
  const perto = () => movimento.modo === 'chao' && alcancaNaPraia(ponto, rastro, CORPO.doCentroAoPe)
  useInterativo(`chave:${c.comodo}`, {
    x: c.x,
    z: c.z,
    raio: 1.4,
    rotulo() {
      const s = loja.getState()
      if (!podePegar(s) || !perto() || chaveAchada(s.salvamento.chaves, c.comodo)) return null
      return TEXTOS_DAS_CHAVES.pegar(c)
    },
    agir() {
      const s = loja.getState()
      if (!podePegar(s) || !perto() || chaveAchada(s.salvamento.chaves, c.comodo)) return
      s.mudar((v) => guardarChave(v, c.comodo))
      const depois = loja.getState().salvamento.chaves
      if (chaveAchada(depois, c.comodo)) s.dizer(falaDaChave(c.comodo, depois))
    },
  })
  if (achada) return null
  return (
    <group
      name={`chave-${c.comodo}`}
      position={[c.x, y + 0.03, c.z]}
      rotation={[0, (c.x + c.z) % Math.PI, 0]}
      scale={2.4}
    >
      <primitive object={copia} dispose={null} />
    </group>
  )
}

/** As quatro chaves dos cômodos da casa da Íris, escondidas na sua ilha. */
export function ChavesDaCasa() {
  return (
    <>
      {CHAVES_DA_CASA.map((c) => (
        <ComReserva key={c.comodo} reserva={null}>
          <Chave c={c} />
        </ComReserva>
      ))}
    </>
  )
}
