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
    // O Dino está guardado de um lado e a TELA continua perguntando quem vai morar nela.
    expect(screen.getByText(/Existe\. E aqui\?/)).toBeTruthy()
    expect(screen.getByText(/Ele existe de um lado e não aparece do outro/)).toBeTruthy()
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
