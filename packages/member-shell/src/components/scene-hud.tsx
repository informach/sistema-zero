'use client'

import { CORACAO, caminhoDoCoracao, PincelSvg } from '@sistemazero/studio/arte'
import { Texto } from './scene-canvas'

/**
 * O PLACAR DA CENA, no molde do HUD do Jogo 2D.
 *
 * ⭐⭐ Relato dela (18/09/2026): *"quando tiver placar dentro da cena, ou em algum outro elemento, a
 * gente tem que seguir o mesmo design lá da extensão Jogo 2D"*. Antes disto a cena tinha inventado
 * DUAS linguagens que não existem em jogo nenhum:
 *
 * - o `Cartao` das cenas de número — um retângulo 176×92 com `rx=16` e borda de 2px, rótulo em 13 e
 *   número em 40, ancorado no canto de cima à direita;
 * - o HUD solto da `lives` — número 30 alinhado à direita, sem caixa, com corações desenhados à mão.
 *
 * O jogo escreve o placar assim (`game-2d/runtime/arcadeKitsHud.ts:16`, `drawScore`):
 * `label + ' ' + valor`, **numa linha só**, `bold` na fonte da interface, **sem caixa e sem
 * sombra**, alinhado à esquerda. A vida é `drawSpriteHealth`: corações vetoriais, lado 22 e vão 6.
 *
 * ⚠️ **As duas FORMAS, e quando usar cada uma.** `linha` é o `drawScore` literal, e é o que vai onde
 * a cena desenha a TELA DO JOGO por dentro (o placar da `variable`): ali o que a criança precisa
 * reconhecer é o HUD do jogo dela. `empilhado` é a adaptação para os CONTADORES da cena (o placar da
 * `score`, os cactos da `restart`, a base da `acceleration`), que a criança lê de relance enquanto
 * mexe na bancada: mesma forma — sem caixa, número gordo, tinta do par —, só que o rótulo sai menor
 * e em versalete acima do número, na régua da faixa de estado. Num jogo o HUD tem a tela inteira;
 * aqui ele divide 600 × 310 com a pista. A caixa alta é do CSS (`sz-scene-placar-rotulo`),
 * nunca um `.toUpperCase()`: ver o comentário da régua em `styles/scene.css`.
 *
 * ⚠️ **O que mais foi ADAPTADO, e por quê.** No jogo o HUD é branco porque o fundo é escuro; na cena
 * o céu é claro, então a TINTA vem dos tokens da cena (e o halo de 3px do `scene.css` faz o resto).
 *
 * ⚠️⚠️ O coração NÃO é um path copiado: vem de `@sistemazero/studio/arte`, portado verbatim do
 * runtime e travado por paridade (`arte/__tests__/paridade.test.ts`). Um `0.3` virado `0.31` na
 * covinha reprova dois casos.
 */

/** Onde o placar encosta: o canto do desenho de onde ele cresce. */
export type CantoDoPlacar = 'esquerda' | 'direita'

export function PlacarDoJogo({
  x,
  y,
  rotulo,
  valor,
  classeDoValor = 'fill-scene-a',
  canto = 'esquerda',
  tamanho = 34,
  forma = 'empilhado',
}: {
  x: number
  y: number
  /** O nome curto, como a criança o chama. */
  rotulo: string
  valor: string
  /** A cor do número — o par da cena (`fill-scene-a`, `fill-scene-b-ink`, `fill-scene-alert`). */
  classeDoValor?: string
  canto?: CantoDoPlacar
  tamanho?: number
  forma?: 'empilhado' | 'linha'
}) {
  const fim = canto === 'direita'
  const ancora = fim ? 'end' : 'start'
  if (forma === 'linha') {
    // O `drawScore` do jogo, literal: `rotulo + ' ' + valor` numa linha, `bold`, UMA tinta só (o
    // jogo escreve os dois em branco). Sem caixa e sem sombra.
    return (
      <Texto
        x={x}
        y={y}
        tamanho={tamanho}
        fontWeight="800"
        textAnchor={ancora}
        className={classeDoValor}
      >
        {rotulo} {valor}
      </Texto>
    )
  }
  return (
    <g>
      <Texto
        x={x}
        y={y}
        tamanho={12}
        fontWeight="700"
        textAnchor={ancora}
        className="sz-scene-placar-rotulo fill-scene-ink-soft"
      >
        {rotulo}
      </Texto>
      <Texto
        x={x}
        y={y + tamanho}
        tamanho={tamanho}
        fontWeight="800"
        textAnchor={ancora}
        className={classeDoValor}
      >
        {valor}
      </Texto>
    </g>
  )
}

/**
 * O caminho do coração do jogo numa caixa 1 × 1, calculado UMA vez.
 *
 * ⚠️ É o mesmo `caminhoDoCoracao` de `@sistemazero/studio/arte` (portado verbatim do runtime e
 * travado por paridade): a cena desenha o coração DO JOGO, nunca um path copiado. Sai daqui como
 * string para os corações serem `<path transform>` baratos — a `contact` desenha dez por quadro, e
 * um `PincelSvg` por coração a cada render seria caro sem mudar um pixel.
 */
const D_DO_CORACAO = (() => {
  const p = new PincelSvg('coracao')
  caminhoDoCoracao(p, { x: 0, y: 0, s: 1 })
  p.fill()
  // ⚠️ Pelo `tag`, e não por `[0]`: a árvore começa com um `<defs>` quando o pincel registra algum
  // degradê ou recorte. Aqui não registra, mas depender disso é depender do que o pincel faz por
  // dentro — e o custo de perguntar é zero (roda uma vez, na carga do módulo).
  const no = p.arvore().find((n) => n.tag === 'path')
  const d = no?.attrs.d
  if (typeof d !== 'string' || d.length === 0)
    throw new Error('scene-hud: o caminho do coração do jogo não foi gerado')
  return d
})()

/**
 * UM coração do jogo. `(x, y)` é a PONTA DE BAIXO dele e `lado` é o tamanho.
 *
 * ⚠️ A ponta de baixo (e não o canto de cima à esquerda do `drawSpriteHealth`) porque é assim que
 * os palcos o penduram: acima de um cacto, acima do Dino, na linha do rótulo. Quem desenha a FILA
 * do HUD usa o `VidaDoJogo`, que ancora no canto como o jogo.
 * ⚠️ A vida PERDIDA é o mesmo desenho em CONTORNO: o lugar dela continua à vista, e é o que
 * permite contar quantas faltam.
 */
export function CoracaoDoJogo({
  x,
  y,
  lado = CORACAO.lado,
  cheio = true,
}: {
  x: number
  y: number
  lado?: number
  cheio?: boolean
}) {
  return (
    <path
      className={cheio ? 'fill-scene-alert' : 'fill-none stroke-scene-alert'}
      strokeWidth={cheio ? undefined : 2 / lado}
      opacity={cheio ? 1 : 0.5}
      transform={`translate(${x - lado / 2} ${y - lado}) scale(${lado})`}
      d={D_DO_CORACAO}
    />
  )
}

/**
 * As vidas em fila, no molde do `drawSpriteHealth`: lado 22, vão 6, `(x, y)` no canto de CIMA à
 * esquerda do primeiro coração.
 */
export function VidaDoJogo({
  x,
  y,
  quantas,
  total,
  lado = CORACAO.lado,
  vao = CORACAO.vao,
}: {
  x: number
  y: number
  quantas: number
  total: number
  lado?: number
  vao?: number
}) {
  // ⚠️ O teto de 20 é o do runtime, e vale aqui pelo mesmo motivo: o HUD não pode virar uma tira
  // infinita quando um caso do professor escreve um número grande.
  const n = Math.max(0, Math.min(Math.floor(total), 20))
  return (
    <g aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <CoracaoDoJogo
          // biome-ignore lint/suspicious/noArrayIndexKey: os corações do HUD são contados, não nomeados.
          key={`coracao-${i}`}
          x={x + i * (lado + vao) + lado / 2}
          y={y + lado}
          lado={lado}
          cheio={i < quantas}
        />
      ))}
    </g>
  )
}
