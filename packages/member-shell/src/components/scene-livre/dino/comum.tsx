'use client'

import type { ComponentType } from 'react'
import { useDiscovery } from '../../scene-discovery-frame'

/**
 * O que as telas livres do Corre Dino (frente A, 02/11/2026) dividem com as da Nave contra Asteroides.
 *
 * As cenas compartilhadas têm uma variante do Dino: o cenário do bloco (`activity.cenario`) escolhe a
 * tela, como no core (`guia-livre/variante-dino.ts`) escolhe a fala. Onde a tela da Nave já fala com
 * "o Dino" vestido pelo elenco (`coordinates`, `world`, `draw-loop`, `layers`, `once-vs-always`), ela
 * serve aos dois; as outras têm a tela do Dino nesta pasta.
 */

/** A tela é do Corre Dino? A mesma régua do core (`ehDoDino`). */
export const telaDoDino = (cenario: string | undefined) => cenario === 'corre-dino'

/**
 * O id da fala da Nave que corresponde à fala do Dino (`<cena>-dino-x` → `<cena>-x`). As variantes
 * "espelho" do core seguem a mesma escolha da Nave, então o destaque do botão também é o mesmo, e a
 * tela pergunta à régua da Nave (`proximoGesto…`).
 */
export const semDino = (fala: string | undefined) => fala?.replace('-dino-', '-')

/** A tela de uma cena compartilhada: a do Dino no cenário do Corre Dino, a da Nave nos outros. */
export function comTelaDoDino(Nave: ComponentType, Dino: ComponentType): ComponentType {
  function TelaPorCenario() {
    const { activity } = useDiscovery()
    return telaDoDino(activity.cenario) ? <Dino /> : <Nave />
  }
  return TelaPorCenario
}
