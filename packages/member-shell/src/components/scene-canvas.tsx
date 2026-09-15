'use client'

import { castText, type SceneCast } from '@sistemazero/core/learning/scene'
import { type CSSProperties, type ReactNode, type RefObject, useId } from 'react'
import { cn } from '../lib/cn'

/**
 * O PALCO das 45 cenas: a moldura, o desenho e o que se lê em volta dele — num lugar só.
 *
 * ⭐⭐ Havia CINCO cromos de palco, um por família de cena, e três deles chamavam a própria cópia
 * de `Moldura`. As cinco desenhavam a mesma coisa: a caixa com borda e recorte, o `<svg>` com
 * `role="img"`, o `<title>`/`<desc>` ligados por `aria-labelledby` e o rodapé de legenda. Enquanto
 * foi assim, **qualquer melhoria de desenho custava cinco edições** — é por isso que a faixa
 * cortada só foi consertada numa família e a caixa vazia sobreviveu a quatro revisões.
 *
 * ⚠️⚠️ **O ENQUADRAMENTO continua sendo por família, e é deliberado.** Três das cinco já usam
 * 560×300 (`SCENE_VIEW`, agora o padrão), mas o palco do Corre Dino é 600×310 e o da tela é
 * derivado do tamanho do jogo — e as centenas de coordenadas dos `d="…"` de cada desenho estão
 * NESSAS unidades. Unificar o `viewBox` não é mudar um número: é redesenhar 45 cenas. O que este
 * componente garante é que a cena NOVA nasce no enquadramento comum, então a deriva para de
 * crescer enquanto as antigas não forem redesenhadas uma a uma.
 *
 * ⚠️ O `overlay` existe para o palco compartilhado: ele põe controles HTML POR CIMA do SVG (as
 * alças de arraste, o "Toque para começar"), e eles precisam ser irmãos do `<svg>` dentro da
 * moldura posicionada. Quem não tem overlay não paga nada por ele.
 */

/** O enquadramento comum. Cena nova não escolhe o seu — herda este. */
export const SCENE_VIEW = { w: 560, h: 300 } as const

/**
 * A MOLDURA, sozinha. Interna de propósito: quem desenha uma cena usa o `SceneCanvas`.
 *
 * ⚠️⚠️ **Cromo é do APP; mundo é da CENA.** A borda e o recorte vestem a identidade do
 * aplicativo (`border-border`, que no kids é a linha do Pen) porque é a moldura que encosta no
 * cartão da aula. O que fica DENTRO — céu, chão, árvores, o personagem — continua com a paleta
 * ilustrada `--color-scene-*`: a cena é o retrato de um JOGO, e pintá-la de branco e azul a
 * transformaria num formulário. `bg-scene-ground` é o papel do mundo, e por isso fica aqui.
 */
function SceneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('overflow-hidden rounded-2xl border border-border bg-scene-ground', className)}
    >
      {children}
    </div>
  )
}

/**
 * Um LADO da comparação. Ele tem nome porque é o nome que a criança compara: "nos bastidores"
 * contra "na tela do jogo" é a descoberta inteira da primeira cena do Corre Dino.
 */
export interface LadoDaComparacao {
  titulo: string
  /** O que está desenhado deste lado, para quem não enxerga. */
  descricao: string
  desenho: ReactNode
  /** O enquadramento deste lado, quando ele não é o do canvas. */
  view?: { w: number; h: number }
}

export function SceneCanvas({
  children,
  titulo,
  descricao,
  rodape,
  cast,
  view = SCENE_VIEW,
  overlay,
  className,
  svgRef,
  comparacao,
  interativo = false,
  estilo,
}: {
  children?: ReactNode
  /**
   * O nome do desenho, para quem usa leitor de tela.
   *
   * ⚠️⚠️ Ele e a `descricao` passam pelo ELENCO aqui dentro. É o invariante do full review de
   * 14/09/2026: sem ele a criança de uma turma de nave lia "nave" na faixa de estado e ouvia "o
   * Dino" do leitor de tela, no mesmo desenho. Texto solto DENTRO do `children` continua
   * precisando do `castText` à mão — o componente não alcança o que o desenho escreve.
   */
  titulo: string
  /** O que está desenhado AGORA. Não é o que acabou de acontecer: isso é da frase abaixo do palco. */
  descricao: string
  /** A legenda dentro da moldura, abaixo do desenho. */
  rodape?: string
  cast?: SceneCast
  view?: { w: number; h: number }
  /** Controles HTML por CIMA do desenho. Pede `className="relative"` na moldura. */
  overlay?: ReactNode
  className?: string
  svgRef?: RefObject<SVGSVGElement | null>
  /**
   * O modo ANTES | DEPOIS: dois desenhos lado a lado, nomeados, dentro da mesma moldura.
   *
   * ⭐⭐ É o padrão número um do estudo do Brilliant, e nenhum dos 45 palcos o tinha como
   * ESTRUTURA: cada um desenhava UM estado e a comparação vivia no texto ("compare", "depois
   * ligue"). É a diferença entre a criança VER a descoberta e LER que ela aconteceu.
   *
   * ⚠⚠ Lado a lado só a partir de `sm`. Num celular de 360px dois painéis dariam 170px cada,
   * e a comparação que existe para ser vista ficaria ilegível — empilhado, os nomes de cada lado
   * seguram a leitura na vertical.
   *
   * ⚠ As cores do PAR (azul e âmbar) marcam os dois nomes. Elas não seguem o tema: dizem QUAL
   * lado é qual, aqui, na faixa de estado e na comparação guardada.
   *
   * ⚠️⚠️⚠️ **QUANDO usar, e quando NÃO.** A galeria das 45 mostrou que a maioria das cenas de
   * contraste JÁ compara estruturalmente, cada uma dentro do próprio desenho: `hold-vs-press` tem
   * duas pistas, `delta-time` tem dois computadores, `pixel-vector` tem as duas pedras,
   * `sheet-vs-sprite` tem a folha e o jogo, `tilemap` tem o texto e o desenho. A regra que separa
   * os casos não é "a cena fala de contraste":
   *
   * - **Os dois estados COEXISTEM no mundo** (o Dino guardado E desenhado; o mesmo jogo em dois
   *   computadores) → lado a lado. Sem isso a criança LÊ que os dois existem.
   * - **A criança ALTERNA entre dois estados** (`layers` troca a ordem, `fill-stroke` liga e
   *   desliga o miolo) → **um estado só, e o gesto é a descoberta.** Mostrar os dois ao mesmo
   *   tempo ali não melhora nada: TIRA o experimento, porque não sobra o que descobrir.
   *
   * A comparação com o que ela viu ANTES é outra coisa, e já existe: o "Guardar para comparar"
   * (`ExperienceComparison`).
   */
  comparacao?: readonly [LadoDaComparacao, LadoDaComparacao]
  /**
   * O desenho recebe gesto DIRETO (arrastar o cacto, tocar no Dino para pular).
   *
   * ⚠⚠ Aí ele deixa de ser `role="img"` e vira `role="group"`: uma imagem é uma coisa só e o
   * leitor de tela não entra nela, mas este palco tem alvos dentro. ⚠ O caminho de teclado
   * continua sendo a BANCADA — o arrasto nunca é a única saída.
   */
  interativo?: boolean
  /** Só para o que o CSS não alcança: o `touch-action` de um palco que se arrasta. */
  estilo?: CSSProperties
}) {
  const id = useId()
  if (comparacao)
    return (
      <SceneFrame className={className}>
        <div role="group" aria-label={castText(titulo, cast)} className="grid sm:grid-cols-2">
          {comparacao.map((lado, i) => (
            <div
              key={lado.titulo}
              // ⚠️ A divisória usa a régua da CENA (`scene-rule`), e não a linha do app: ela fica
              // sobre o papel ilustrado, onde a linha do Pen sumiria. Ela separa DOIS LUGARES —
              // é informação, não moldura.
              className={
                i === 0
                  ? 'border-scene-rule sm:border-r-2'
                  : 'border-scene-rule border-t-2 sm:border-t-0'
              }
            >
              <p
                className={`px-3 pt-2 text-center text-xs font-bold uppercase tracking-[.14em] ${
                  i === 0 ? 'text-scene-a' : 'text-scene-b-ink'
                }`}
              >
                {castText(lado.titulo, cast)}
              </p>
              <svg
                viewBox={`0 0 ${(lado.view ?? view).w} ${(lado.view ?? view).h}`}
                className="block w-full"
                role="img"
                aria-labelledby={`${id}-${i}-t ${id}-${i}-d`}
              >
                <title id={`${id}-${i}-t`}>{castText(lado.titulo, cast)}</title>
                <desc id={`${id}-${i}-d`}>{castText(lado.descricao, cast)}</desc>
                {lado.desenho}
              </svg>
            </div>
          ))}
        </div>
        {rodape ? (
          <p className="px-3 pb-2 text-center text-xs text-scene-ink-soft">
            {castText(rodape, cast)}
          </p>
        ) : null}
        {overlay}
      </SceneFrame>
    )
  return (
    <SceneFrame className={className}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${view.w} ${view.h}`}
        className="block w-full"
        role={interativo ? 'group' : 'img'}
        aria-labelledby={`${id}-t ${id}-d`}
        style={estilo}
      >
        <title id={`${id}-t`}>{castText(titulo, cast)}</title>
        <desc id={`${id}-d`}>{castText(descricao, cast)}</desc>
        {children}
      </svg>
      {rodape ? (
        <p className="px-3 pb-2 text-center text-xs text-scene-ink-soft">
          {castText(rodape, cast)}
        </p>
      ) : null}
      {overlay}
    </SceneFrame>
  )
}
