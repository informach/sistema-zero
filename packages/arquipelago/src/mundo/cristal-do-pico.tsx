import { useEffect, useMemo } from 'react'
import type { Object3D } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import type { Ponto } from '../sistemas/cipo'
import { falaDaColecaoCompleta, grupoCompleto } from '../sistemas/colecoes-das-ilhas'
import { CORPO } from '../sistemas/corpo'
import {
  alcancaOCristalRaro,
  CRISTAL_RARO,
  FALA_DO_CRISTAL_RARO,
  pegarOCristalRaro,
  temOCristalRaro,
} from '../sistemas/cristal-raro'
import { paraOMundo } from './bosque'
import { useInterativo } from './interativos'

/**
 * O cristal raro no fundo da caverna do Pico (fase3-07): a âncora `cristal-raro` é o alto da
 * saliência, e o nó `caverna-joia` é o cristal, que some quando ele já está na mochila.
 */
export function CristalDoPico({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const { loja, movimento, rastro } = useJogo()
  const pego = useEstado((s) => temOCristalRaro(s.salvamento))
  const cristal = useMemo(() => {
    const no = modelo.getObjectByName('cristal-raro')
    return no ? paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 }) : null
  }, [modelo, meio, giro])
  const joia = useMemo(() => modelo.getObjectByName('caverna-joia') ?? null, [modelo])
  useEffect(() => {
    if (!joia) return
    joia.visible = !pego
    return () => {
      joia.visible = true
    }
  }, [joia, pego])

  useInterativo('pico:cristal-raro', {
    x: cristal?.x ?? 0,
    z: cristal?.z ?? 0,
    raio: cristal ? CRISTAL_RARO.alcance : 0,
    rotulo: () => {
      if (!cristal || movimento.modo !== 'chao') return null
      if (temOCristalRaro(loja.getState().salvamento)) return null
      const pes = { x: rastro.x, y: rastro.y - CORPO.doCentroAoPe, z: rastro.z }
      return alcancaOCristalRaro(cristal, pes) ? 'Pegar o cristal' : null
    },
    agir() {
      const s = loja.getState()
      if (temOCristalRaro(s.salvamento)) return
      s.mudar((v) => pegarOCristalRaro(v))
      const depois = loja.getState().salvamento
      if (!temOCristalRaro(depois)) return
      // O rosa também é uma das quatro peças da coleção de cristais (30/10/2026).
      s.dizer(
        grupoCompleto(depois, 'cristais')
          ? `${FALA_DO_CRISTAL_RARO} ${falaDaColecaoCompleta('cristais')}`
          : FALA_DO_CRISTAL_RARO,
      )
    },
  })
  return null
}
