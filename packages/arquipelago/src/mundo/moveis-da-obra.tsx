import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Obra } from '@sistemazero/arquipelago-contracts'
import { memo, useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import banheiroGlb from '../assets/casa/casa-banheiro.glb'
import cozinhaGlb from '../assets/casa/casa-cozinha.glb'
import salaGlb from '../assets/casa/casa-sala.glb'
import { useJogo } from '../estado/contexto'
import {
  areaDoMovel,
  type CategoriaDoMovel,
  DADOS_DO_MOVEL,
  ehDeParede,
  ehTapete,
  FUNDO_DO_GIRO,
  type MovelPosto,
  moveisDaObra,
} from '../sistemas/construcao/moveis'
import { giroEmY, type Solido } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { ComReserva, copiarNo, materiaisDe, useModelo } from './modelos'

/** Os móveis de cada cômodo (`arte/casa/comodos.py`): um nó por móvel, com o nome do id. */
const ARQUIVO_DOS_MOVEIS: Readonly<Record<CategoriaDoMovel, string>> = {
  cozinha: new URL(cozinhaGlb, import.meta.url).href,
  sala: new URL(salaGlb, import.meta.url).href,
  banheiro: new URL(banheiroGlb, import.meta.url).href,
}

export function carregarMoveis() {
  for (const url of Object.values(ARQUIVO_DOS_MOVEIS)) useGLTF.preload(url, false, false)
}

/** A peça de parede fica com a origem a 0,20 da linha da grade (README de `arte/casa`). */
const DA_LINHA_DA_PAREDE = 0.2

/** Onde fica a origem do móvel na grade e o giro do modelo. */
export function lugarDoMovel(m: MovelPosto): { x: number; y: number; z: number; giro: number } {
  const giro = (m.giro * Math.PI) / 2
  if (ehDeParede(m.id)) {
    const [fx, fz] = FUNDO_DO_GIRO[m.giro % 4] ?? [0, -1]
    const recuo = 0.5 - DA_LINHA_DA_PAREDE
    return {
      x: m.x + 0.5 + fx * recuo,
      y: DADOS_DO_MOVEL[m.id].altura ?? 1.5,
      z: m.z + 0.5 + fz * recuo,
      giro,
    }
  }
  const { largura, fundo } = areaDoMovel(m.id, m.giro)
  return { x: m.x + largura / 2, y: 0, z: m.z + fundo / 2, giro }
}

/** A luminária de pé acende à noite (o material `luz`, como as janelas do kit). */
function LuzDosMoveis() {
  const { ambiente } = useJogo()
  const sala = useModelo(ARQUIVO_DOS_MOVEIS.sala)
  const luzes = useMemo(() => materiaisDe(sala, 'luz'), [sala])
  useFrame(() => {
    for (const m of luzes) m.emissiveIntensity = ambiente.noite ? 1.4 : 0.1
  })
  return null
}

/**
 * Um móvel na obra: a cópia do nó, no lugar e com o giro. Os de chão (menos os tapetes) ganham a
 * caixa de colisão do próprio modelo, girada junto; as peças de parede ficam fora do caminho.
 */
const MovelNaObra = memo(function MovelNaObra({
  m,
  base,
}: {
  m: MovelPosto
  base: [number, number, number]
}) {
  const raiz = useModelo(ARQUIVO_DOS_MOVEIS[DADOS_DO_MOVEL[m.id].categoria])
  const no = useMemo(() => copiarNo(raiz, m.id), [raiz, m.id])
  const lugar = lugarDoMovel(m)
  const colisores = useMemo<Solido[]>(() => {
    if (ehDeParede(m.id) || ehTapete(m.id)) return []
    const caixa = new Box3().setFromObject(no)
    const meio = caixa.getCenter(new Vector3())
    const tamanho = caixa.getSize(new Vector3())
    // Girar em quartos de volta: o meio gira com o modelo e a caixa troca largura e fundo.
    const cos = Math.round(Math.cos(lugar.giro))
    const sin = Math.round(Math.sin(lugar.giro))
    const cx = meio.x * cos + meio.z * sin
    const cz = -meio.x * sin + meio.z * cos
    const de = m.giro % 2 === 0
    return [
      {
        forma: 'caixa',
        nome: `col-movel-${m.id}-${m.x}_${m.z}_${m.giro}`,
        posicao: [base[0] + lugar.x + cx, base[1] + meio.y, base[2] + lugar.z + cz],
        meio: [(de ? tamanho.x : tamanho.z) / 2, tamanho.y / 2, (de ? tamanho.z : tamanho.x) / 2],
        rotacao: giroEmY(0),
      },
    ]
  }, [no, m, base, lugar.x, lugar.z, lugar.giro])
  return (
    <>
      <primitive
        object={no}
        position={[base[0] + lugar.x, base[1] + lugar.y, base[2] + lugar.z]}
        rotation-y={lugar.giro}
      />
      <Colisores lista={colisores} />
    </>
  )
})

/** Os móveis postos na obra da casa (os da sua, ou os do irmão na visita). */
export function MoveisDaObra({ obra, base }: { obra: Obra; base: [number, number, number] }) {
  const moveis = useMemo(() => moveisDaObra(obra), [obra])
  if (moveis.length === 0) return null
  return (
    <ComReserva reserva={null}>
      {moveis.map((m) => (
        // Dois móveis nunca têm o mesmo id, célula e giro (as regras de `porMovel` recusam).
        <MovelNaObra key={`${m.id}@${m.x},${m.z},${m.giro}`} m={m} base={base} />
      ))}
      <LuzDosMoveis />
    </ComReserva>
  )
}
