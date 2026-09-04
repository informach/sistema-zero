import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import EstudioLoading from '../src/app/(app)/estudio/loading'
import MoldaLoading from '../src/app/(app)/molda/loading'
import PensaLoading from '../src/app/(app)/pensa/loading'
import PintaLoading from '../src/app/(app)/pinta/loading'
import {
  EMBEDDED_APP_FRAME,
  EMBEDDED_STUDIO_FRAME,
  EmbeddedAppLoading,
} from '../src/components/kids/embedded-app-loading'

/**
 * ⚠️ Este teste existe por uma regressão REAL: o card externo saiu dos três
 * clients embarcados e ficou nos três `loading.tsx`, que juravam num comentário
 * estar "espelhando a moldura real". A criança passou a ver duas telas de espera
 * diferentes com o mesmo texto antes do app abrir.
 *
 * A trava é comparar o markup dos `loading.tsx` com o do componente
 * compartilhado: se alguém mudar a moldura de um lado só, isto cai.
 */
describe('a espera dos apps embarcados vem toda do mesmo lugar', () => {
  it('Pensa usa a moldura compartilhada', () => {
    expect(renderToStaticMarkup(<PensaLoading />)).toBe(
      renderToStaticMarkup(<EmbeddedAppLoading label="Carregando o Pensa…" />),
    )
  })

  it('Pinta usa a moldura compartilhada', () => {
    expect(renderToStaticMarkup(<PintaLoading />)).toBe(
      renderToStaticMarkup(<EmbeddedAppLoading label="Carregando o Pinta…" />),
    )
  })

  it('Molda usa a moldura compartilhada', () => {
    expect(renderToStaticMarkup(<MoldaLoading />)).toBe(
      renderToStaticMarkup(<EmbeddedAppLoading label="Carregando o Molda…" />),
    )
  })

  it('Estúdio usa a moldura compartilhada (a variante BLOCO)', () => {
    expect(renderToStaticMarkup(<EstudioLoading />)).toBe(
      renderToStaticMarkup(
        <EmbeddedAppLoading label="Carregando o Estúdio…" frame={EMBEDDED_STUDIO_FRAME} />,
      ),
    )
  })

  it('nenhuma espera tem card — os embarcados são seções, não cartões', () => {
    for (const markup of [
      renderToStaticMarkup(<PensaLoading />),
      renderToStaticMarkup(<PintaLoading />),
      renderToStaticMarkup(<MoldaLoading />),
      renderToStaticMarkup(<EstudioLoading />),
    ]) {
      // Era exatamente esta a moldura que sobrou e causou o piscar.
      expect(markup).not.toContain('rounded-2xl')
      expect(markup).not.toContain('border-border')
      expect(markup).not.toContain('bg-card')
    }
  })

  it('a moldura do Estúdio NÃO é coluna flex', () => {
    // Os filhos do Estúdio (lista, editor, canvas do Blockly) se dimensionam por
    // `h-full` contando com um pai BLOCO. Virar coluna flex é mudança de layout
    // que só se prova no browser — a variante existe para não precisar provar.
    // Por classe exata: `flex-1` (item) é permitido, `flex` (display) não.
    const studio = EMBEDDED_STUDIO_FRAME.split(' ')
    expect(studio).not.toContain('flex')
    expect(studio).not.toContain('flex-col')
    expect(EMBEDDED_APP_FRAME.split(' ')).toContain('flex-col')
  })
})
