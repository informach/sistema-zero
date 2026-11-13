import { expect, test } from 'bun:test'
import { VESTUARIO_DAS_FESTAS } from '@sistemazero/arquipelago-contracts'
import { AVATAR_CATALOG as C } from '@sistemazero/core/avatar'
import { renderToStaticMarkup } from 'react-dom/server'
import { SeasonalAvatarChoices } from '../src/components/cosmetics/avatar3d/seasonal-choices'

/**
 * As sugestões da festa do jogo só mostram peças que o catálogo do pack tem, com o nome e o preço
 * do catálogo. ⚠️ Até a etapa do jogo o contrato cita peças do avatar antigo: elas não aparecem
 * (nada de peça que a tela não consegue vestir).
 */
const festas = Object.keys(VESTUARIO_DAS_FESTAS) as (keyof typeof VESTUARIO_DAS_FESTAS)[]

test('só peças do catálogo do pack, com o nome e o preço dele; sem nenhuma, nada aparece', () => {
  for (const festa of festas) {
    const colecao = VESTUARIO_DAS_FESTAS[festa]
    const html = renderToStaticMarkup(
      <SeasonalAvatarChoices
        festa={festa}
        owned={new Set()}
        disabled={false}
        onSelect={() => {}}
      />,
    )
    const doPack = [...colecao.conquista, ...colecao.pecas].filter((id) => C.parts[id])
    if (doPack.length === 0) {
      expect(html).toBe('')
      continue
    }
    for (const id of doPack) expect(html).toContain(C.parts[id]?.label ?? '?')
  }
})

test('o render não seleciona nada sozinho', () => {
  for (const festa of festas)
    renderToStaticMarkup(
      <SeasonalAvatarChoices
        festa={festa}
        owned={new Set()}
        disabled
        onSelect={() => {
          throw new Error('o render não escolhe')
        }}
      />,
    )
})
