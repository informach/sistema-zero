'use client'

import type { ComponentProps } from 'react'
import { ArquipelagoHost } from './arquipelago-host'
import { PELE_ADULTA_DA_PORTA } from './arquipelago-porta-adulta'

/**
 * A ENTRADA da comunidade adulta para o jogo (o padrão do `configurator-adult-entry` e do
 * `room-builder-adult`): o mesmo `ArquipelagoHost`, com o público adulto e a porta adulta. A tela
 * adulta só existe a partir daqui, então a página do Kids, que importa `arquipelago-host`, nunca
 * a baixa (`tests/arquipelago-porta-adulta.test.tsx` confere).
 */
export function ArquipelagoHostAdulto(
  props: Omit<ComponentProps<typeof ArquipelagoHost>, 'publico' | 'pele'>,
) {
  return <ArquipelagoHost {...props} publico="adulto" pele={PELE_ADULTA_DA_PORTA} />
}
