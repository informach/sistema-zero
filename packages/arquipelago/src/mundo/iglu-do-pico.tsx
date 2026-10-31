import type { Obra } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo } from 'react'
import type { Object3D } from 'three'
import type { FonteDaObra } from '../estado/construcao'
import { useJogo } from '../estado/contexto'
import { lojaDaObraEstendida, useObraEstendida } from '../estado/obra-estendida'
import { CabanaDaIlha } from './cabana-do-bosque'

/**
 * O iglu do Pico Gelado (E04, a proposta: "Pico: construir o iglu"; arte de 31/10/2026, a clareira
 * com as âncoras `lote-cabana-a` e `-b`): a mesma cabana do Bosque, com a obra guardada no
 * documento à parte do serviço (`obra-estendida`, campo `iglu`), porque o salvamento está cheio.
 */
export function IgluDoPico({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const { loja, plataforma } = useJogo()
  const extensa = lojaDaObraEstendida(loja, plataforma)
  const iglu = useObraEstendida(extensa, (s) => s.obra?.iglu ?? null)
  // A obra do iglu chega do serviço com a ilha (a primeira leitura; as outras usam a mesma loja).
  useEffect(() => {
    if (extensa.getState().situacao !== 'pronta') void extensa.getState().carregar()
  }, [extensa])
  const fonte = useMemo<FonteDaObra>(
    () => ({
      ler: () => extensa.getState().obra?.iglu ?? null,
      gravar: (obra: Obra) => extensa.getState().mudar((o) => ({ ...o, iglu: obra })),
    }),
    [extensa],
  )
  return (
    <CabanaDaIlha
      ilha="pico"
      modelo={modelo}
      meio={meio}
      giro={giro}
      fonte={fonte}
      obraDeFora={iglu}
    />
  )
}
