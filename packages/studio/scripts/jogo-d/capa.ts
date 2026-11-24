/**
 * A capa do jogo D na galeria "Ver os jogos prontos" (lote 9 da conclusão do plano do Estúdio,
 * 22/11/2026): a vila em volta do início, desenhada com as MESMAS peças, moedas, inimigos, baús e
 * herói do jogo (as camadas de trás, as entidades e as camadas da frente, na ordem do tocador), e
 * reduzida pela metade. Determinística, como o resto do jogo D.
 */
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { figuras, PECA, recortar, reduzir, Tela } from './arte'

/** A janela da capa, em peças: as casas de cima da vila, o início do herói e o caminho. */
const JANELA = { x: 1, y: 5, colunas: 24, linhas: 14 }
const FIGURA_DO_TIPO: Record<string, keyof ReturnType<typeof figuras>> = {
  moeda: 'moeda',
  bau: 'bau',
  inimigo: 'gosma',
}

export function capa(mundo: PintaScene, pecas: Tela, colunasDoTileset: number) {
  const t = new Tela(JANELA.colunas * PECA, JANELA.linhas * PECA),
    desenhos = figuras()
  const peca = (indice: number) =>
    recortar(
      pecas,
      (indice % colunasDoTileset) * PECA,
      Math.floor(indice / colunasDoTileset) * PECA,
      PECA,
      PECA,
    )
  const camadas = (frente: boolean) => {
    for (const l of mundo.layers) {
      if (l.kind !== 'tiles' || l.collision || !!l.front !== frente) continue
      for (let y = 0; y < JANELA.linhas; y++)
        for (let x = 0; x < JANELA.colunas; x++) {
          const v = l.cells[(JANELA.y + y) * mundo.cols + JANELA.x + x]!
          if (v >= 0) t.colar(peca(v & 4095), x * PECA, y * PECA)
        }
    }
  }
  camadas(false)
  const dentro = (px: number, py: number) =>
    px >= JANELA.x * PECA &&
    py >= JANELA.y * PECA &&
    px < (JANELA.x + JANELA.colunas) * PECA &&
    py < (JANELA.y + JANELA.linhas) * PECA
  for (const l of mundo.layers)
    if (l.kind === 'objects')
      for (const o of l.objects) {
        const figura = FIGURA_DO_TIPO[o.type]
        if (figura && dentro(o.x, o.y))
          t.colar(desenhos[figura]!, o.x - JANELA.x * PECA, o.y - JANELA.y * PECA)
        if (o.role === 'start' && dentro(o.x, o.y))
          t.colar(
            desenhos.heroi!,
            o.x - PECA / 2 - JANELA.x * PECA,
            o.y - PECA / 2 - JANELA.y * PECA,
          )
      }
  camadas(true)
  return reduzir(t, 2)
}
