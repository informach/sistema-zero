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

    fireEvent.click(screen.getByRole('button', { name: 'Criar o Dino' }))
    await waitFor(() => expect(screen.queryByText(/ainda vazio/)).toBeNull())
    // O Dino existe nos bastidores e a tela do jogo continua sem o Dino.
    // ⚠️ Mudou de propósito no lote 1 do Raio-X (16/09/2026): a tela perguntava "Existe. E
    // aqui?" com o texto escrito POR CIMA da árvore do meio, ilegível. Quem diz que ela está
    // vazia agora é o desenho (e a descrição dele, para quem não enxerga).
    const descricoes = [...document.querySelectorAll('desc')].map((d) => d.textContent ?? '')
    expect(descricoes).toContain('A tela do jogo sem o Dino.')
    // O título apresenta o assunto, mas o player não antecipa a resposta da explicação.
    expect(document.body.textContent).not.toMatch(/Ele existe de um lado e não aparece do outro/)
    // O primeiro passo ganha uma confirmação e o próximo continua claro.
    expect(screen.getByText('O Dino já existe nos bastidores.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mostrar o Dino na tela' })).toBeTruthy()
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

  test('⚠️ a tela não mostra o Dino quando uma configuração tenta pular a criação', async () => {
    // Mesmo um manifesto inválido não pode fazer a tela mostrar um personagem que ainda não existe
    // nos bastidores. O motor ignora o pedido de mostrar antes da criação.
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
    expect(descricoes).toContain('A tela do jogo sem o Dino.')
  })

  test('⭐⭐ os bastidores são uma FICHA com nome e lugar, e a tela desenha o MESMO Dino ali (lote 5)', async () => {
    // A diferença que a cena ensina (guardado × mostrado) não aparecia na forma: os bastidores eram
    // outra tela de jogo, com céu e grama. Hoje são papel liso com a ficha do personagem, e a ficha
    // ACENDE na cor do desenho enquanto ele está ligado.
    render(<InteractiveLessonBlock block={bloco} previewContent={conteudo} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
    const bastidores = screen.getByTitle('Nos bastidores').closest('svg')
    await waitFor(() => expect(bastidores?.textContent).toContain('nome: dino'))
    expect(bastidores?.textContent).toContain('x 110 · y 150')
    // Sem céu nem grama do lado dos bastidores.
    expect(bastidores?.querySelector('.fill-scene-sky, .fill-scene-grass')).toBeNull()
    const ficha = () => document.querySelector('[data-ficha]')
    expect(ficha()?.hasAttribute('data-acesa')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
    await waitFor(() => expect(ficha()?.hasAttribute('data-acesa')).toBe(true))
    const tela = screen.getByTitle('Na tela do jogo').closest('svg')
    expect(tela?.querySelectorAll('[data-figure="dino"]')).toHaveLength(1)
  })

  test('⚠️ a ação que MOVE a cena é o botão em destaque', () => {
    // O item 1 do diagnóstico do print: "Criar o Dino" era um botãozinho cinza dentro de uma
    // caixa tracejada, e "Ver de novo" era o azul grande do rodapé. Estava invertido.
    render(<InteractiveLessonBlock block={bloco} previewContent={conteudo} />)
    const criar = screen.getByRole('button', { name: 'Criar o Dino' })
    expect(criar.className).toContain('bg-primary')
    expect(criar.className).toContain('text-primary-foreground')
  })
})
