/**
 * A missão do Pensa dentro das oficinas (20/10/2026, desenho aprovado). O pacote não tem DOM de
 * teste: a marcação estática prova o que cada estado mostra. O clique e o foco ficam nos testes
 * do Estúdio, do Pinta e do Molda, que montam o painel de verdade.
 */
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PensaMissionLayout, PensaMissionPanel } from '../src/components/ui/pensa-mission-panel'
import type { PensaMissionSession } from '../src/components/ui/pensa-mission-session'
import { missionSessionFixture } from './mission-fixture'

function html(session: PensaMissionSession, recovery?: string) {
  return renderToStaticMarkup(
    <PensaMissionPanel session={session} recovery={recovery ? <p>{recovery}</p> : undefined} />,
  )
}
const texto = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

describe('PensaMissionPanel', () => {
  test('aberto: topo âmbar com o plano, a oficina, o brief e as ações', () => {
    const session = { ...missionSessionFixture(), order: { index: 4, total: 9 } }
    const markup = html(session)
    const lido = texto(markup)
    expect(markup).toContain('aria-label="Missão do Pensa"')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('title="Recolher a missão"')
    // O botão controla um corpo que EXISTE.
    const controla = /aria-controls="([^"]+)"/.exec(markup)?.[1]
    expect(controla).toBeTruthy()
    expect(markup).toContain(`id="${controla}"`)
    expect(lido).toContain('Pensa · Bosque · missão 4 de 9')
    expect(lido).toContain('Desenhar a nave')
    expect(markup).toContain('sz-tool-mission-panel__chip--pinta')
    expect(lido).toContain('Pinta')
    expect(lido).toContain('O que você vai criar')
    expect(lido).toContain('Para esta missão')
    expect(lido).toContain('Como deve ser')
    expect(lido).toContain('Como conferir')
    expect(lido).toContain('Pronto quando: Você reconhece a nave.')
    expect(lido).toContain('Conferi e está pronto')
    expect(lido).toContain('A missão fica pronta e a próxima aparece aqui.')
    expect(lido).toContain('Preciso de ajuda')
    expect(lido).toContain('Voltar ao plano')
    expect(lido).toContain('Onde parei')
  })

  test('sem o plano carregado, nada de número inventado', () => {
    const lido = texto(html(missionSessionFixture()))
    expect(lido).toContain('Pensa · Bosque')
    expect(lido).not.toMatch(/missão \d+ de \d+/)
  })

  test('recolhido: o trilho "Ver missão" e a linha "Missão 4/9", sem o corpo', () => {
    const session = {
      ...missionSessionFixture(),
      collapsed: true,
      order: { index: 4, total: 9 },
    }
    const markup = html(session)
    const lido = texto(markup)
    expect(markup).toContain('aria-expanded="false"')
    // Recolhido, nenhuma referência ARIA para um corpo que não existe.
    expect(markup).not.toContain('aria-controls')
    expect(markup).toContain('is-collapsed')
    expect(lido).toContain('Ver missão · Desenhar a nave')
    expect(lido).toContain('Missão 4/9 · Desenhar a nave')
    expect(lido).not.toContain('O que você vai criar')
    expect(lido).not.toContain('Conferi e está pronto')
    expect(markup).not.toContain('has-alert')
  })

  test('recolhido com recado, o recado fica e o trilho dá lugar à linha', () => {
    const session = { ...missionSessionFixture(), collapsed: true }
    const markup = html(session, 'Este desenho não está neste aparelho.')
    expect(markup).toContain('has-alert')
    expect(texto(markup)).toContain('Este desenho não está neste aparelho.')
  })

  test('jogo em equipe: a linha lilás diz quem programa e recebe a arte', () => {
    const session = { ...missionSessionFixture(), handoffTo: { name: 'Bia' } }
    const lido = texto(html(session))
    expect(lido).toContain(
      'Você faz as artes. Bia programa e recebe o que você criar nesta missão.',
    )
    expect(lido).toContain('Depois de conferir, Bia encontra esta arte no Estúdio.')
    // Missão de programação não tem entrega para outra pessoa.
    const feature = missionSessionFixture()
    feature.mission = {
      ...feature.mission,
      kind: 'feature',
      destination: 'studio',
    } as PensaMissionSession['mission']
    expect(texto(html({ ...feature, handoffTo: { name: 'Bia' } }))).not.toContain(
      'Você faz as artes',
    )
  })

  test('pronta: o recado da próxima missão, o caminho e o "Quero mexer de novo"', () => {
    const session = missionSessionFixture()
    session.progress = { ...session.progress, status: 'completed' }
    session.nextMission = { title: 'Faça a nave voar', destination: 'studio' }
    session.nextMissionLabel = 'Continuar no Estúdio'
    const lido = texto(html(session))
    expect(lido).toContain('Missão pronta. A próxima é Faça a nave voar, no Estúdio.')
    expect(lido).toContain('Continuar no Estúdio')
    expect(lido).toContain('Quero mexer de novo')
    expect(lido).toContain('Pronta')
    expect(lido).not.toContain('Conferi e está pronto')
  })

  test('as ações da preparação, do teste e da reconferência', () => {
    const setup = missionSessionFixture()
    setup.mission = {
      ...setup.mission,
      kind: 'setup',
      destination: 'studio',
      setup: {
        type: 'extensions',
        authoring: 'blocks',
        runtimeExtensionId: 'game-2d',
        requiredAuxiliaryExtensionIds: [],
        recommendation: 'Recomendo Jogo 2D.',
      },
    } as PensaMissionSession['mission']
    expect(texto(html(setup))).toContain('Já preparei')
    const review = missionSessionFixture()
    review.progress = { ...review.progress, validity: 'needs_review' }
    expect(texto(html(review))).toContain('Conferi de novo')
  })

  test('a ajuda lista só as referências com endereço', () => {
    const session = missionSessionFixture()
    session.references = [
      { kind: 'lesson', id: 'a', title: 'Cliques e sprites', href: '/cursos/x/aulas/y' },
      { kind: 'help', id: 'b', title: 'Sem link', href: null },
    ]
    const markup = html(session)
    expect(texto(markup)).toContain('Ajuda para esta missão')
    expect(markup).toContain('href="/cursos/x/aulas/y"')
    expect(texto(markup)).not.toContain('Sem link')
  })
})

describe('PensaMissionLayout', () => {
  test('a oficina vem primeiro e o painel depois, irmãos e nunca por cima', () => {
    const markup = renderToStaticMarkup(
      <PensaMissionLayout panel={<aside>painel</aside>}>
        <main>oficina</main>
      </PensaMissionLayout>,
    )
    expect(markup.indexOf('oficina')).toBeLessThan(markup.indexOf('painel'))
    expect(markup).toContain('sz-tool-mission-layout__work')
    expect(markup).not.toMatch(/position:\s*(absolute|fixed)/)
  })

  test('sem missão a árvore é a mesma, e o editor não remonta quando ela chega', () => {
    const sem = renderToStaticMarkup(
      <PensaMissionLayout panel={null}>
        <main>oficina</main>
      </PensaMissionLayout>,
    )
    const com = renderToStaticMarkup(
      <PensaMissionLayout panel={<aside>painel</aside>}>
        <main>oficina</main>
      </PensaMissionLayout>,
    )
    // Só o estilo muda de dono (inline sem missão, folha com missão): os elementos são os mesmos.
    const esqueleto = (markup: string) =>
      markup
        .replace('<aside>painel</aside>', '')
        .replace(/ style="[^"]*"/g, '')
        .replace(/ has-panel/g, '')
    expect(esqueleto(com)).toBe(esqueleto(sem))
    expect(sem).toContain('style=')
    expect(com).not.toContain('style=')
  })
})
