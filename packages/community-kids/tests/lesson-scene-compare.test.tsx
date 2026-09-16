import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS } from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
const { cleanup, render, screen, fireEvent, waitFor } = await import('@testing-library/react')
const { InteractiveLessonBlock } = await import(
  '@sistemazero/member-shell/components/learning-activity'
)

afterEach(cleanup)

const modelo = SCENE_MODELS.world
const conteudo: InteractiveBlock = {
  kind: 'interactive',
  title: modelo.title,
  instructions: modelo.instruction,
  hints: [...modelo.hints],
  required: false,
  activity: { type: 'experimentation', scene: 'world' },
}
const bloco = {
  id: 'world',
  kind: 'interactive' as const,
  sortOrder: 0,
  content: conteudo,
}

/**
 * A comparação virou ESTRUTURA — o lote 5, e o item 2 do diagnóstico do print.
 *
 * ⚠️⚠️ `world` é a PRIMEIRA experimentação da PRIMEIRA aula do curso carro-chefe, e o assunto
 * dela é *bastidores × tela*. Até 15/09/2026 os dois nunca apareciam juntos: o palco desenhava só
 * a tela do jogo e "bastidores" era um controle lá embaixo. A criança LIA que o Dino existia sem
 * aparecer, em vez de VER.
 */
describe('a cena que compara bastidores e tela', () => {
  test('⚠️⚠️ os DOIS lugares estão na tela ao mesmo tempo, desde o começo', async () => {
    render(<InteractiveLessonBlock block={bloco} previewContent={conteudo} />)
    // Os dois painéis são desenhos com nome próprio: quem não enxerga ouve os dois.
    expect(await screen.findByTitle('Nos bastidores')).toBeTruthy()
    expect(screen.getByTitle('Na tela do jogo')).toBeTruthy()
    // E o grupo diz o que é a comparação inteira.
    expect(screen.getByRole('group', { name: /bastidores e a tela do jogo/i })).toBeTruthy()
  })

  test('⚠️⚠️ criar o Dino muda UM lado só: é isso que a cena ensina', async () => {
    render(<InteractiveLessonBlock block={bloco} previewContent={conteudo} />)
    const bastidoresVazio = await screen.findByText(/ainda vazio/)
    expect(bastidoresVazio).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Criar Dino/ }))
    await waitFor(() => expect(screen.queryByText(/ainda vazio/)).toBeNull())
    // O Dino está guardado de um lado e a TELA continua sem ninguém desenhado.
    // ⚠️ Mudou de propósito no lote 1 do Raio-X (16/09/2026): a tela perguntava "Existe. E
    // aqui?" com o texto escrito POR CIMA da árvore do meio, ilegível. Quem diz que ela está
    // vazia agora é o desenho (e a descrição dele, para quem não enxerga).
    const descricoes = [...document.querySelectorAll('desc')].map((d) => d.textContent ?? '')
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a tela do jogo tem SÓ o fundo. As árvores ficavam lá
    // com o desenho desligado, e a tela ensinava que "desligado" apaga só o Dino.
    expect(descricoes).toContain('A tela do jogo sem nada desenhado.')
    // ⚠️⚠️ Mudou de propósito no review do lote 1: o rodapé "Ele existe de um lado e não aparece
    // do outro. Criar e mostrar são duas coisas." saiu. Tinha pronome que não concorda com a nave
    // e respondia o "Agora explique" antes de a criança chegar nele.
    expect(document.body.textContent).not.toMatch(/Ele existe|Criar e mostrar são duas coisas/)
    // O lugar do botão fica, com o que aconteceu escrito: a chave não pula para o lugar dele.
    expect(screen.getByText('✓ O Dino foi criado')).toBeTruthy()
  })

  test('⚠️⚠️ nenhum texto por cima do desenho, e nenhum rodapé que mente antes de criar', () => {
    // "Quem vai morar aqui?" e "Existe. E aqui?" eram escritos em cima da árvore do meio e
    // ficavam ilegíveis; e "morar" ensinava o contrário (morar é EXISTIR, e o Dino mora nos
    // bastidores sem aparecer). O rodapé "Os dois lados esperam alguém criar o Dino" também era
    // falso: a tela espera o DESENHO, não a criação.
    render(<InteractiveLessonBlock block={bloco} previewContent={conteudo} />)
    const tela = screen.getByTitle('Na tela do jogo').closest('svg')
    expect(tela?.querySelectorAll('text')).toHaveLength(0)
    expect(document.body.textContent).not.toMatch(/morar|E aqui\?|esperam alguém criar/)
  })

  test('⚠️ a tela só mostra o Dino que EXISTE, mesmo com o desenho ligado antes', async () => {
    // Desde o lote 5 a chave do desenho fica à vista e viva antes de criar, e um caso de professor
    // (ou a própria criança) pode ligá-la antes. Olhando só `drawn`, a tela mostrava um Dino que
    // os bastidores diziam não existir.
    const comDesenho: InteractiveBlock = {
      ...conteudo,
      activity: {
        type: 'experimentation',
        scene: 'world',
        setup: { actions: [{ type: 'connect', port: 'draw', enabled: true }] },
      },
    }
    render(
      <InteractiveLessonBlock
        block={{ ...bloco, content: comDesenho }}
        previewContent={comDesenho}
      />,
    )
    expect(await screen.findByText(/ainda vazio/)).toBeTruthy()
    const descricoes = [...document.querySelectorAll('desc')].map((d) => d.textContent ?? '')
    expect(descricoes).toContain('A tela do jogo sem nada desenhado.')
  })

  test('⭐⭐ os bastidores são uma FICHA com nome e lugar, e a tela desenha o MESMO Dino ali (lote 5)', async () => {
    // A diferença que a cena ensina (guardado × mostrado) não aparecia na forma: os bastidores eram
    // outra tela de jogo, com céu e grama. Hoje são papel liso com a ficha do personagem, e a ficha
    // ACENDE na cor do desenho enquanto ele está ligado.
    render(<InteractiveLessonBlock block={bloco} previewContent={conteudo} />)
    fireEvent.click(await screen.findByRole('button', { name: /Criar Dino/ }))
    const bastidores = screen.getByTitle('Nos bastidores').closest('svg')
    await waitFor(() => expect(bastidores?.textContent).toContain('nome: dino'))
    expect(bastidores?.textContent).toContain('x 110 · y 150')
    // Sem céu nem grama do lado dos bastidores.
    expect(bastidores?.querySelector('.fill-scene-sky, .fill-scene-grass')).toBeNull()
    const ficha = () => document.querySelector('[data-ficha]')
    expect(ficha()?.hasAttribute('data-acesa')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /Desenhar o Dino na tela/ }))
    await waitFor(() => expect(ficha()?.hasAttribute('data-acesa')).toBe(true))
    const tela = screen.getByTitle('Na tela do jogo').closest('svg')
    expect(tela?.querySelectorAll('[data-figure="dino"]')).toHaveLength(1)
  })

  test('⚠️ a ação que MOVE a cena é o botão em destaque', () => {
    // O item 1 do diagnóstico do print: "＋ Criar Dino" era um botãozinho cinza dentro de uma
    // caixa tracejada, e "Ver de novo" era o azul grande do rodapé. Estava invertido.
    render(<InteractiveLessonBlock block={bloco} previewContent={conteudo} />)
    const criar = screen.getByRole('button', { name: /Criar Dino/ })
    expect(criar.className).toContain('bg-primary')
    expect(criar.className).toContain('text-primary-foreground')
  })
})
