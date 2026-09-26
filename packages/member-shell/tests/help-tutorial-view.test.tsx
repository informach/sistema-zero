import { describe, expect, test } from 'bun:test'
import type { HelpTutorialDocument } from '@sistemazero/core/help'
import { renderToStaticMarkup } from 'react-dom/server'
import { HelpTutorialView } from '../src/components/help-tutorial-view'
import { helpLinkHref, renderInline } from '../src/lib/markdown'

/**
 * O tutorial do "Como fazer" como a criança lê. O que este arquivo protege:
 * 1. o vídeo do Vimeo entra pelo `VimeoPlayer` com a MARCA D'ÁGUA (decisão da dona) e o `src`
 *    cru nunca vai para o HTML;
 * 2. os passos saem numerados, com o texto alternativo da imagem;
 * 3. o link interno do markdown para `/como-fazer/<slug>` abre em outra aba e leva o `voltar`.
 */
const doc: HelpTutorialDocument = {
  title: 'Como ver meu jogo na Pré-visualização',
  summary: 'Onde o jogo aparece enquanto você monta os blocos.',
  keywords: ['prévia'],
  video: { provider: 'vimeo', src: 'https://vimeo.com/123456789/abcd1234' },
  steps: [
    { id: 'a', title: 'Abra a aba', body: 'Toque em **Pré-visualização**.' },
    {
      id: 'b',
      title: 'Use o olhinho',
      body: 'Leia [como salvar](/como-fazer/estudio-salvar).',
      imageUrl: 'https://cdn.x/olho.webp',
      imageAlt: 'A barra do Estúdio com o olhinho',
    },
  ],
  related: ['estudio-criar-projeto'],
}

describe('HelpTutorialView', () => {
  test('passos numerados, imagem com alt e links relacionados vindos de dados', () => {
    const html = renderToStaticMarkup(
      <HelpTutorialView
        tutorial={doc}
        watermark="Perfil 1234abcd"
        relatedItems={[
          {
            slug: 'estudio-criar-projeto',
            label: 'Como criar um projeto',
            href: '/como-fazer/estudio-criar-projeto',
          },
        ]}
      />,
    )
    expect(html).toContain('Passo 1: ')
    expect(html).toContain('Abra a aba')
    expect(html).toContain('<strong>Pré-visualização</strong>')
    expect(html).toContain('alt="A barra do Estúdio com o olhinho"')
    expect(html).toContain('href="/como-fazer/estudio-criar-projeto"')
    expect(html).toContain('Como criar um projeto')
    // O src cru do vídeo não vai ao HTML; o SDK monta a URL a partir do id e do hash.
    expect(html).not.toContain('https://vimeo.com/123456789/abcd1234')
    expect(html).toContain('Perfil 1234abcd')
  })

  test('sem relatedItems não desenha "Veja também"; sem vídeo não desenha player', () => {
    const html = renderToStaticMarkup(<HelpTutorialView tutorial={{ ...doc, video: undefined }} />)
    expect(html).not.toContain('Veja também')
    expect(html).not.toContain('sz-help-video')
  })

  test('a prévia do admin mostra o endereço relacionado sem criar link', () => {
    const html = renderToStaticMarkup(
      <HelpTutorialView
        tutorial={{ ...doc, video: undefined }}
        relatedItems={[
          { slug: 'estudio-criar-projeto', label: '/como-fazer/estudio-criar-projeto' },
        ]}
      />,
    )
    expect(html).toContain('/como-fazer/estudio-criar-projeto')
    expect(html).not.toContain('href="/como-fazer/estudio-criar-projeto"')
  })
})

describe('link interno do "Como fazer" no markdown', () => {
  test('só o prefixo /como-fazer/<slug> vira link, em outra aba, com o voltar da aula', () => {
    const html = renderToStaticMarkup(
      <>
        {renderInline('[ajuda](/como-fazer/estudio-salvar)', {
          helpReturnPath: '/cursos/corre-dino/aulas/abc',
        })}
      </>,
    )
    expect(html).toContain(
      'href="/como-fazer/estudio-salvar?voltar=%2Fcursos%2Fcorre-dino%2Faulas%2Fabc"',
    )
    expect(html).toContain('target="_blank"')
    expect(html).toContain('data-sz-help-link')
    // Outro caminho interno continua texto puro (não é allowlist).
    const outro = renderToStaticMarkup(<>{renderInline('[x](/perfil)')}</>)
    expect(outro).not.toContain('<a')
    expect(outro).toContain('[x](/perfil)')
    // Slug fora do formato também não vira link.
    expect(renderToStaticMarkup(<>{renderInline('[x](/como-fazer/Maiusculo)')}</>)).not.toContain(
      '<a',
    )
  })

  test('helpLinkHref sem caminho de volta devolve o próprio caminho', () => {
    expect(helpLinkHref('/como-fazer/x')).toBe('/como-fazer/x')
    expect(helpLinkHref('/como-fazer/x', '/cursos/a/aulas/b')).toBe(
      '/como-fazer/x?voltar=%2Fcursos%2Fa%2Faulas%2Fb',
    )
  })
})
