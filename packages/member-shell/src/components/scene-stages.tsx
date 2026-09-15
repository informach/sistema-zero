'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { SCENE_LIMITS } from '@sistemazero/core/learning/scene'
import { useEffect, useId, useRef, useState } from 'react'
import { DinoFigure } from './exploration-stage'

/**
 * Os palcos das duas cenas que a Aula 1 do Corre Dino pedia.
 *
 * Elas não cabem no palco compartilhado (chão, árvores, pista) porque não são sobre o mundo do
 * jogo: uma é sobre o SISTEMA DE COORDENADAS da tela e a outra sobre o que uma pessoa que não
 * vê a tela recebe. Cada uma tem a própria moldura e o próprio enquadramento.
 */

/** A tela do Corre Dino, nas medidas que a criança digita no bloco. */
const TELA = { w: SCENE_LIMITS.placeX.max, h: SCENE_LIMITS.placeY.max } as const
/** A margem que abriga as réguas dos dois eixos. */
const MARGEM = { x: 46, y: 30 } as const
const VIEW = { w: TELA.w + MARGEM.x + 16, h: TELA.h + MARGEM.y + 22 } as const

/**
 * O endereço na tela.
 *
 * ⚠️ O que faz esta cena ensinar não é o sprite se mexer — é o par de números aparecer LIGADO
 * ao lugar. Por isso ela tem três coisas que nenhuma outra tem: as réguas dos dois eixos com a
 * origem marcada no canto de cima (é o que torna o "y cresce para baixo" visível antes de ser
 * dito), as guias tracejadas do sprite até cada eixo, e o FANTASMA da posição anterior, para
 * comparar sem guardar de memória.
 */
export function CoordinatesStage({ state }: { state: SceneState }) {
  const id = useId()
  const { x, y, fromX, fromY } = state.place
  const mexeu = fromX !== x || fromY !== y
  const px = MARGEM.x + x
  const py = MARGEM.y + y
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-scene-ground">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="block w-full"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>Tela do jogo com o Dino no endereço escolhido</title>
        <desc id={`${id}-desc`}>
          {`Tela de ${TELA.w} por ${TELA.h}. O Dino está em x ${x}, y ${y}.`}
        </desc>
        <defs>
          <pattern id={`${id}-dots`} width="30" height="30" patternUnits="userSpaceOnUse">
            <circle className="fill-scene-grid" cx="1.5" cy="1.5" r="1.5" />
          </pattern>
        </defs>
        {/* As réguas: os números que a criança vai digitar, na borda da tela. */}
        <g className="fill-scene-ink-soft" fontSize="11" fontFamily="inherit">
          {[0, 120, 240, 360, 480].map((v) => (
            <g key={`x${v}`}>
              <text x={MARGEM.x + v} y={18} textAnchor={v === 0 ? 'start' : 'middle'}>
                {v}
              </text>
              <path className="stroke-scene-rule" d={`M${MARGEM.x + v} 22v8`} strokeWidth="1.5" />
            </g>
          ))}
          {[0, 90, 180, 270].map((v) => (
            <g key={`y${v}`}>
              <text x={MARGEM.x - 10} y={MARGEM.y + v + 4} textAnchor="end">
                {v}
              </text>
              <path
                className="stroke-scene-rule"
                d={`M${MARGEM.x - 8} ${MARGEM.y + v}h8`}
                strokeWidth="1.5"
              />
            </g>
          ))}
        </g>
        <rect
          className="fill-scene-sky stroke-scene-line"
          x={MARGEM.x}
          y={MARGEM.y}
          width={TELA.w}
          height={TELA.h}
          strokeWidth="2"
        />
        <rect x={MARGEM.x} y={MARGEM.y} width={TELA.w} height={TELA.h} fill={`url(#${id}-dots)`} />
        {/* A origem. Ela é o que explica o eixo y virado: a contagem começa em CIMA. */}
        <circle className="fill-scene-ink" cx={MARGEM.x} cy={MARGEM.y} r="4" />
        <text
          className="fill-scene-ink"
          x={MARGEM.x + 8}
          y={MARGEM.y + 16}
          fontSize="11"
          fontFamily="inherit"
        >
          0, 0
        </text>
        {mexeu && (
          <g className="text-scene-ink-soft">
            <DinoFigure x={MARGEM.x + fromX} y={MARGEM.y + fromY + 26} ghost />
          </g>
        )}
        {/* As guias levam o olho do sprite até o número de cada eixo. */}
        <path
          className="stroke-scene-a"
          d={`M${MARGEM.x} ${py}H${px}`}
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <path
          className="stroke-scene-b"
          d={`M${px} ${MARGEM.y}V${py}`}
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <g className="text-primary">
          <DinoFigure x={px} y={py + 26} />
        </g>
        <g className="stroke-scene-ink" strokeWidth="1.5">
          <circle cx={px} cy={py} r="5" fill="none" strokeWidth="2" />
          <path d={`M${px - 11} ${py}h22M${px} ${py - 11}v22`} />
        </g>
      </svg>
      <p className="px-3 pb-2 text-center text-xs text-scene-ink-soft">
        O alvo mostra o endereço. O Dino desenhado fica em volta dele.
      </p>
    </div>
  )
}

/**
 * O que o leitor de tela lê.
 *
 * Duas colunas, e é a comparação entre elas que é a aula: o que APARECE (um desenho, que não
 * informa nada a quem não o vê) contra o que a pessoa OUVE (só o que estiver escrito).
 *
 * ⚠️ O painel escuro é uma citação do terminal onde um leitor de tela mostra o que fala, e as
 * cores dele são literais de propósito: ele representa outro programa, não a nossa cena.
 */
export function ScreenReaderStage({
  state,
  dispatch,
  interactive,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
  interactive: boolean
}) {
  const id = useId()
  const { text, heard } = state.description
  /**
   * ⚠️⚠️ O texto não sobe tecla a tecla.
   *
   * Cada `describe` é um COMANDO: vai para o histórico do desfazer, entra no segmento que sobe
   * ao servidor (com o texto inteiro dentro) e conta uma ação na evidência. Despachando por
   * tecla, escrever a frase da Aula 1 gerava ~50 comandos, ~10 KB de segmento e um relatório
   * dizendo que a criança fez cinquenta coisas — quando ela escreveu uma frase.
   *
   * O campo passa a ser local e só avisa o motor quando ela PARA (meio segundo) ou sai dele.
   * O botão de ouvir tira o foco antes do clique, então o que se ouve é sempre o que está
   * escrito. E o efeito abaixo mantém o campo em dia quando o motor muda por fora (desfazer,
   * recomeçar, retomar a aula noutro dia).
   */
  const [rascunho, setRascunho] = useState(text)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    setRascunho(text)
  }, [text])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  function escrever(valor: string) {
    setRascunho(valor)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (valor !== text) dispatch({ type: 'describe', text: valor })
    }, 500)
  }
  function confirmar(valor: string) {
    if (timer.current) clearTimeout(timer.current)
    if (valor !== text) dispatch({ type: 'describe', text: valor })
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          O que aparece na tela
        </p>
        <div className="overflow-hidden rounded-2xl border border-primary/15 bg-scene-ground">
          <svg
            viewBox="0 0 240 150"
            className="block w-full"
            role="img"
            aria-label="Um dinossauro correndo diante de cactos, com o placar no canto."
          >
            <rect className="fill-scene-sky" width="240" height="150" />
            <rect className="fill-scene-ground" y="118" width="240" height="32" />
            <path className="stroke-scene-line" d="M0 118h240" strokeWidth="2" />
            {/* ⚠️ O pé do Dino assenta NA linha do chão: `y` é o solo dele, e a escala do
                grupo entra na conta (118 = 44 + 87 × 0,85). */}
            <g className="text-primary" transform="translate(10 44) scale(0.85)">
              <DinoFigure x={52} y={87} />
            </g>
            <g className="fill-scene-leaf">
              <rect x="168" y="92" width="7" height="26" />
              <rect x="161" y="99" width="7" height="8" />
              <rect x="175" y="96" width="7" height="8" />
              <rect x="212" y="98" width="6" height="20" />
            </g>
            <text className="fill-scene-ink-soft" x="10" y="20" fontSize="11">
              pontos 0
            </text>
          </svg>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          O que a pessoa ouve
        </p>
        {/* ⚠️ `role="status"`: quem usa leitor de tela precisa OUVIR o que este painel mostra —
            é literalmente o assunto da cena. */}
        <div
          role="status"
          className="min-h-[9rem] rounded-2xl border border-[#2c4657] bg-[#12202b] p-4 text-[#cfe3f0]"
        >
          <p className="text-[11px] uppercase tracking-[.14em] text-[#6f8ea3]">Leitor de tela</p>
          <p className={`mt-2 text-sm leading-relaxed ${heard ? '' : 'italic text-[#7d95a6]'}`}>
            {heard || 'Ainda não leu nada. Aperte Ouvir a tela.'}
          </p>
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-semibold" htmlFor={`${id}-desc`}>
          Descrição do jogo
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          É o campo do bloco Descrever o jogo para leitor de tela.
        </p>
        <textarea
          id={`${id}-desc`}
          rows={2}
          maxLength={SCENE_LIMITS.describe.max}
          disabled={!interactive}
          value={rascunho}
          placeholder="Escreva o que é o seu jogo e como se joga"
          onChange={(e) => escrever(e.target.value)}
          onBlur={(e) => confirmar(e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm"
        />
      </div>
    </div>
  )
}

/**
 * A tela e o limite dela.
 *
 * ⚠️ O que ensina aqui é o CONTRASTE entre a área de fora e a tela: sem a moldura, a cor do
 * fundo cobre tudo e a criança não tem como saber onde o jogo acontece — que é exatamente a
 * queixa que o roteiro da Aula 1 usa para introduzir o bloco da borda. Por isso o palco desenha
 * o espaço em volta, e não só o retângulo.
 */
export function StageSizeStage({ state }: { state: SceneState }) {
  const id = useId()
  const { width, height, border } = state.stage
  const VIEW = { w: 560, h: 330 } as const
  // A tela cabe na caixa com folga, preservando a proporção que a criança escolheu.
  const escala = Math.min((VIEW.w - 80) / width, (VIEW.h - 70) / height)
  const w = width * escala
  const h = height * escala
  const x = (VIEW.w - w) / 2
  const y = (VIEW.h - h) / 2 + 6
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-scene-ground">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="block w-full"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>A tela do jogo dentro do espaço em volta</title>
        <desc id={`${id}-desc`}>
          {`Tela de ${width} por ${height}, com a moldura ${border ? 'à vista' : 'escondida'}.`}
        </desc>
        {/* O espaço em volta tem a MESMA cor do céu: é isso que faz o limite sumir sem a borda. */}
        <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
        <rect className="fill-scene-sky" x={x} y={y} width={w} height={h} />
        {border && (
          <>
            <rect
              className="stroke-scene-alert"
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              strokeWidth="4"
            />
            {/* As medidas ficam ao lado da moldura, do lado de fora, para não sujar a tela. */}
            <text
              className="fill-scene-ink"
              x={x + w / 2}
              y={y - 10}
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
            >
              {width}
            </text>
            <text
              className="fill-scene-ink"
              x={x - 10}
              y={y + h / 2}
              textAnchor="end"
              fontSize="13"
              fontWeight="600"
            >
              {height}
            </text>
          </>
        )}
        <g className="text-primary">
          <DinoFigure x={x + w / 2} y={y + h - 8} />
        </g>
      </svg>
      <p className="px-3 pb-2 text-center text-xs text-scene-ink-soft">
        {border
          ? 'O que está fora da moldura é só o espaço em volta.'
          : 'A cor do fundo cobriu tudo: onde começa a tela do jogo?'}
      </p>
    </div>
  )
}

/**
 * Por que o desenho se repete.
 *
 * O palco mostra os três estados do par de chaves: congelado (ninguém manda desenhar), rastro
 * (desenha sem limpar) e movimento (limpa e desenha). O rastro é desenhado de verdade — cópias
 * do Dino nas posições por onde ele passou —, porque é vendo os desenhos acumulados que a
 * criança entende o que a limpeza faz.
 */
export function DrawLoopStage({ state }: { state: SceneState }) {
  const id = useId()
  const { loop, erase, frames, trail } = state.render
  const VIEW = { w: 560, h: 220 } as const
  const passo = 52
  const primeiro = 70
  const atual = loop ? Math.min(frames, 7) : 0
  const copias = erase ? [atual] : Array.from({ length: Math.max(1, trail) }, (_, i) => i)
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-scene-ground">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="block w-full"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>A tela do jogo enquanto o relógio anda</title>
        <desc id={`${id}-desc`}>
          {loop
            ? erase
              ? 'Um Dino só, num lugar novo a cada quadro.'
              : `${Math.max(1, trail)} Dinos desenhados, um em cada lugar por onde ele passou.`
            : 'A tela não muda: ninguém está mandando desenhar de novo.'}
        </desc>
        <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
        <rect className="fill-scene-ground" y={VIEW.h - 46} width={VIEW.w} height={46} />
        <path className="stroke-scene-line" d={`M0 ${VIEW.h - 46}h${VIEW.w}`} strokeWidth="2" />
        {copias.map((i) => (
          <g
            key={i}
            className="text-primary"
            // O desenho antigo fica mais apagado: ele é o que SOBROU, não o de agora.
            opacity={i === copias[copias.length - 1] ? 1 : 0.45}
          >
            <DinoFigure x={primeiro + i * passo} y={VIEW.h - 46} />
          </g>
        ))}
        <text
          className="fill-scene-ink-soft"
          x="16"
          y="26"
          fontSize="12"
          fontWeight="600"
          letterSpacing="0.5"
        >
          {`quadro ${frames}`}
        </text>
      </svg>
      <p className="px-3 pb-2 text-center text-xs text-scene-ink-soft">
        {loop
          ? erase
            ? 'Limpa e desenha: sobra um Dino só, num lugar novo.'
            : 'Desenha sem limpar: cada quadro deixa o desenho anterior.'
          : 'Nada muda enquanto ninguém mandar desenhar de novo.'}
      </p>
    </div>
  )
}
