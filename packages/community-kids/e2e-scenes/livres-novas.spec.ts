import { expect, test } from '@playwright/test'

/**
 * As telas livres do Corre Dino e as três experiências novas (02/11/2026) abrem num navegador de
 * verdade: a tela livre aparece (`.sz-scene-prancha` da `Frame`), sem erro na página, e o Zappy fala.
 * O comportamento de cada tela é dos testes do member-shell; aqui é a montagem real.
 */
const CASOS: [curso: string, bloco: string][] = [
  ...[
    'experiencia-uma-vez-e-sempre',
    'experiencia-tela',
    'experiencia-coordenadas',
    'descoberta',
    'experiencia-laco',
    'experiencia-camadas',
    'experiencia-descricao',
    'experiencia-gravidade',
    'experiencia-impulso',
    'experiencia-tres-areas',
    'experiencia-dedo-e-pulo',
    'experiencia-ritmo',
    'experiencia-velocidade',
    'experiencia-visivel-guardado',
    'experiencia-condicao',
    'experiencia-convite',
    'experiencia-contato',
    'experiencia-restart',
    'experiencia-hitbox',
    'experiencia-variavel',
    'experiencia-score',
    'experiencia-random',
    'experiencia-number-line',
    'experiencia-aceleracao',
  ].map((bloco): [string, string] => ['dino', bloco]),
  ['nave', 'experiencia-tamanho-do-passinho'],
  ['nave', 'experiencia-meta-do-jogo'],
  ['ilha', 'experiencia-pergunta-com-nao'],
]

for (const largura of [1366, 320]) {
  for (const [curso, bloco] of CASOS) {
    test(`tela livre em ${largura}px: ${curso} · ${bloco}`, async ({ page }) => {
      const erros: string[] = []
      page.on('pageerror', (erro) => erros.push(erro.message))
      await page.setViewportSize({ width: largura, height: 844 })
      await page.goto(`/?course=${curso}&block=${bloco}&width=900`)
      if (largura === 320 && bloco === 'experiencia-pergunta-com-nao') {
        await page.addStyleTag({
          content:
            '[data-tabela-do-nao] { font-family: monospace; letter-spacing: .12em; word-spacing: .16em; }',
        })
      }
      await expect(page.locator('.sz-scene-prancha')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Recomeçar experiência' })).toBeVisible()
      const medida = await page.evaluate(() => ({
        conteudo: document.documentElement.scrollWidth,
        janela: innerWidth,
      }))
      expect(medida.conteudo, JSON.stringify(medida)).toBeLessThanOrEqual(medida.janela)
      expect(erros).toEqual([])
    })
  }
}
