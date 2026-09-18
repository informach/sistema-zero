'use client'

import {
  isSceneAction,
  openScene,
  type SceneActivity,
  type SceneCommand,
  type SceneId,
  type SceneReading,
  type SceneState,
  sceneLongFrame,
  sceneReadout,
  sceneScript,
  sceneStart,
  sceneStepLabel,
  sceneStepSeconds,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { Pause, Play, StepForward } from 'lucide-react'
import { type ReactElement, type ReactNode, useMemo } from 'react'
import { SceneButton } from './exploration-stage'
import { LugarReservado } from './scene-lugar-reservado'

/**
 * As peças da moldura que o player E a bancada do "Agora é sua vez" desenham iguais: a faixa de
 * estado e os botões que mexem no MUNDO (saltar, o relógio). Saíram do `scene-activity` no lote 2
 * do Raio-X (16/09/2026): duas cópias delas divergiriam no primeiro conserto de texto.
 */

/**
 * A faixa de estado, com um lugar à direita para o medidor de descobertas.
 *
 * ⚠️⚠️ Ela NÃO é `aria-hidden` (achado do full review de 15/09): a faixa é conteúdo ESTÁTICO, e
 * quem anuncia a cada mudança é o `role="status"` da frase embaixo do palco. Escondida, ela tirava de
 * quem usa leitor de tela justamente os números que a cena existe para mostrar. A `<dl>` dá a relação
 * nome/valor de graça.
 *
 * ⚠️ E ela é CROMO: veste o APP (cartão, linha e tinta dele), não o papel da cena. O par de
 * comparação (`scene-a`, `scene-b-ink`, `scene-alert`) sobrevive porque diz QUAL medida é qual.
 *
 * ⚠️ O medidor mora NA LINHA da faixa desde o lote 2 (antes ficava no cabeçalho, ~900px acima da
 * bancada): a descoberta acendia uma bolinha longe de onde o dedo estava.
 */
export function SceneReadoutBand({
  activity,
  state,
  children,
  colada = false,
  relogioAndando = false,
}: {
  activity: SceneActivity
  state: SceneState
  /** O medidor de descobertas, quando há. */
  children?: ReactNode
  /**
   * A faixa é a tira de CIMA do palco, dentro da mesma moldura (review do lote 2): com borda e
   * cantos próprios ela era mais uma caixa numa tela que passava de quatro superfícies.
   */
  colada?: boolean
  /** O ▶ está rodando: nas cenas de quadro longo, a faixa mostra o quadro em andamento. */
  relogioAndando?: boolean
}) {
  const quadroEmAndamento = relogioAndando && sceneLongFrame(activity.scene)
  const leituras = (estado: SceneState) =>
    sceneReadout(activity.scene, estado, activity.cast, activity.pilha)
  /**
   * ⚠️⚠️ A faixa NÃO muda de altura no meio do gesto (full review de experiência, M3). Os valores mudam de
   * tamanho ("desligado" é mais longo que "ligado", "vazio" que "o Dino"), a faixa passava de duas linhas
   * para uma, e o palco e a bancada pulavam 28 px embaixo do dedo: o botão da borda da `stage-size` subia
   * no próprio toque. Hoje ela mora num `LugarReservado` cujo MOLDE são as leituras que a cena atinge (a
   * abertura, cada parte do roteiro do modelo e a de agora) empilhadas numa célula só, mais uma leitura
   * com o rótulo e o valor MAIS LONGOS de cada posição: a altura reservada é a maior delas.
   */
  const moldes = useMemo(
    () =>
      estadosDaCena(activity).map((e) =>
        sceneReadout(activity.scene, e, activity.cast, activity.pilha),
      ),
    [activity],
  )
  const atual = leituras(state)
  const pior = maisLongas([...moldes, atual])
  const candidatos = [...moldes, pior]
  // ⚠️ A chave é só o PIOR caso: com o ▶ andando o valor de agora muda a cada fatia, e uma chave com ele
  // pediria uma medida nova 25 vezes por segundo. O pior caso só muda quando aparece um valor mais longo.
  const chave = pior.map((r) => `${r.label}:${r.value}`).join('|')
  const lista = (rows: readonly SceneReading[]) => (
    /* ⚠️ 14px, e não 12 (lote 2): é texto que a criança LÊ. O separador vem do CSS (`after:content`), e
       não de um caractere no `dt`: sem ele, a leitura corrida dizia "o Dino nos bastidores ainda não
       desenho desligado", e com um caractere no texto o `dt` deixaria de ser o nome da medida. */
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground after:content-[':']">{r.label}</dt>
          <dd
            className={`font-semibold tabular-nums ${
              r.tone === 'a'
                ? 'text-scene-a'
                : r.tone === 'b'
                  ? 'text-scene-b-ink'
                  : r.tone === 'alert'
                    ? 'text-scene-alert'
                    : // ⚠️ O verde do eixo y da `axis-z` (consertos do review da onda B do lote 5).
                      r.tone === 'leaf'
                      ? 'text-scene-leaf'
                      : ''
            }`}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
  const linha = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2'
  return (
    <LugarReservado
      marca="faixa"
      // ⚠️ O fundo e a linha moram no lugar de FORA: a altura reservada é dele, e a tira continua inteira.
      // ⚠️⚠️ A linha é SOMBRA por dentro, e não `border`: a altura mínima que o lugar reserva é a do
      // conteúdo, e com `border-box` a borda de 1px saía dela (medido: a faixa ia de 69 para 68 no toque).
      className={`bg-card ${
        colada
          ? 'shadow-[inset_0_-1px_0_var(--color-border)]'
          : 'mb-2 rounded-2xl ring-1 ring-border ring-inset'
      }`}
      molde={
        <div className="grid" aria-hidden>
          {candidatos.map((rows, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: cada candidato é um lugar fixo do molde
            <div key={i} className={`${linha} [grid-area:1/1]`}>
              {lista(rows)}
              {children}
            </div>
          ))}
        </div>
      }
      chave={chave}
    >
      <div className={linha}>
        {/* ⚠️⚠️ O quadro EM ANDAMENTO nas cenas de 1 ou 2 quadros por segundo (review do lote 4). Com o
            ▶, a primeira mudança da `pool`, da `score` e da `diagonal` vinha 1,1 s depois do clique, e na
            `diagonal` o passo de cada segundo é igual ao anterior: nada na tela dizia que o tempo estava
            correndo. A barra enche até o próximo quadro e zera nele (e a cada gesto, que recomeça o
            quadro no motor). A largura é a própria sobra do motor, que é fração de quadro.
            ⚠️ `aria-hidden` e SEM transição: ela muda a cada fatia do ▶ (0,04 s, ou 0,2 s com menos
            movimento), e anunciada ou animada viraria ruído; quem diz o que mudou é a frase da cena.
            ⚠️ Absoluta, na borda de baixo do LUGAR da faixa (o `relative` é o de fora): não empurra o
            palco quando aparece, e fica na borda mesmo com a altura reservada maior que a linha. */}
        {quadroEmAndamento && (
          <div
            aria-hidden
            data-quadro-em-andamento=""
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-none"
              style={{ width: `${Math.min(100, Math.max(0, state.clock.carry * 100))}%` }}
            />
          </div>
        )}
        {lista(atual)}
        {children}
      </div>
    </LugarReservado>
  )
}

/**
 * Os estados que a cena desta atividade costuma atingir: a abertura e o fim de cada parte do roteiro
 * (o do modelo, ou o da demonstração). É o molde da altura da faixa e da frase da situação (M3).
 * ⚠️ Barato de propósito: o roteiro tem até 12 partes, e quem chama memoriza pela atividade.
 * ⚠️ Um roteiro que não toca a partir do caso não derruba a moldura: sem ele, só a abertura.
 */
export function estadosDaCena(activity: SceneActivity): SceneState[] {
  const start = sceneStart(activity)
  let estado = openScene(start)
  const lista = [estado]
  try {
    for (const passo of sceneScript(activity)) {
      for (const acao of passo.actions) estado = stepScene(start, estado, acao)
      lista.push(estado)
    }
  } catch {
    return lista
  }
  return lista
}

/** A leitura com o rótulo e o valor MAIS LONGOS de cada posição (o pior caso da quebra de linha). */
function maisLongas(candidatos: readonly (readonly SceneReading[])[]): SceneReading[] {
  const tamanho = Math.max(0, ...candidatos.map((c) => c.length))
  const longa = (a: string, b: string) => ([...b].length > [...a].length ? b : a)
  return Array.from({ length: tamanho }, (_, i) => {
    const naPosicao = candidatos.map((c) => c[i]).filter((r): r is SceneReading => Boolean(r))
    const primeira = naPosicao[0] as SceneReading
    const maior = { ...primeira }
    for (const leitura of naPosicao.slice(1)) {
      maior.label = longa(maior.label, leitura.label)
      maior.value = longa(maior.value, leitura.value)
    }
    return maior
  })
}

/**
 * Os botões que mexem no MUNDO, como LISTA.
 *
 * ⚠️⚠️ É a lista que responde se a caixa deve existir (`.length > 0`). Um booleano à parte repetindo
 * as condições de dentro esconde o defeito pior: um botão acrescentado e esquecido no booleano não
 * renderiza, sem erro e sem teste vermelho.
 *
 * ⚠️⚠️ Quem diz se a cena SALTA ou tem RELÓGIO é a régua de legalidade do core (`isSceneAction`),
 * nunca uma lista de cenas escrita aqui: a lista à mão tinha deixado `stage-size` com um "Um passo"
 * que não fazia nada (o motor recusa `advance` fora das cenas com tempo).
 *
 * ⚠️⚠️ O botão de passo avança QUADROS INTEIROS da cena (lote 4 do Raio-X): o tempo e o nome vêm do
 * core (`sceneStepSeconds`, `sceneStepLabel`). "Avançar 1 quadro" anda UM quadro onde o quadro é o
 * assunto; "Um passo" anda os quadros inteiros de ~0,2 s (review do lote 4: um quadro de 1/30 s era um
 * tique invisível, e o pulo pedia 30 cliques). Era 0,2 s em toda cena, e o motor contava UM quadro
 * por clique qualquer que fosse o tempo: o mesmo gesto dava números diferentes no ▶ e no passo.
 */
export function botoesDoMundo({
  scene,
  tocando,
  lento,
  onTocar,
  onLento,
  dispatch,
  gestoEmDestaque = true,
  semRelogio = false,
}: {
  scene: SceneId
  tocando: boolean
  lento: boolean
  onTocar: () => void
  onLento: () => void
  dispatch: (command: SceneCommand) => void
  /**
   * ⚠️ Um azul cheio por vez (lote 2): enquanto a cena espera um gesto, o gesto é o destaque;
   * depois de concluir, o destaque é o "Continuar", e o gesto volta ao peso de ferramenta.
   */
  gestoEmDestaque?: boolean
  /**
   * Sem ▶, "Um passo" e "Mais devagar" (consertos do review da onda A do lote 5): no "Agora é sua vez"
   * das `lives` do Desafio o ponto vem do acerto do tiro, e o relógio só mostrava "o placar continua".
   */
  semRelogio?: boolean
}): ReactElement[] {
  // ⚠️⚠️ Na `frames` a PRÉVIA é o relógio (lote 5 do Raio-X, G4): a chave "Prévia: tocando/parada" da
  // bancada liga o tempo do player. O ▶, o "Um passo" e o "Mais devagar" eram um segundo interruptor
  // para a mesma coisa, e com a prévia parada não mudavam nada na tela.
  const relogio =
    !semRelogio && scene !== 'frames' && isSceneAction({ type: 'advance', seconds: 0.2 }, scene)
  const tempoDoPasso = sceneStepSeconds(scene)
  const nomeDoPasso = sceneStepLabel(scene)
  return [
    isSceneAction({ type: 'jump', input: 'tap' }, scene) && (
      <SceneButton
        key="pular-toque"
        tom={gestoEmDestaque ? 'gesto' : 'ferramenta'}
        onClick={() => dispatch({ type: 'jump', input: 'tap' })}
      >
        {/* ⚠️ "Pular", sem "com toque" (lote 5 do Raio-X): na `gravity` e na `impulse` o jeito de
            pular não importa. Na `jump-sound`, que é sobre o jeito, os dois botões dizem qual é. */}
        {scene === 'jump-sound' ? '✋ Tocar para pular' : '↑ Pular'}
      </SceneButton>
    ),
    scene === 'jump-sound' && (
      <SceneButton
        key="tecla-espaco"
        onClick={(e) => {
          // ⚠️⚠️ O Espaço já pulou no `keydown` (consertos do review da onda A do lote 5, B5): num
          // navegador que ainda ativa o botão no `keyup`, a mesma tecla virava DOIS pulos, e o segundo,
          // com o Dino no ar, fechava "som sem pulo" por acidente. A marca é do próprio botão.
          if (e.currentTarget.dataset.espacoTratado) {
            delete e.currentTarget.dataset.espacoTratado
            return
          }
          dispatch({ type: 'jump', input: 'key' })
        }}
        onKeyUp={(e) => {
          const botao = e.currentTarget
          if (e.code === 'Space')
            setTimeout(() => {
              delete botao.dataset.espacoTratado
            }, 0)
        }}
        onKeyDown={(e) => {
          if (e.code === 'Space') {
            e.preventDefault()
            e.currentTarget.dataset.espacoTratado = '1'
            if (!e.repeat) dispatch({ type: 'jump', input: 'key' })
          }
        }}
      >
        <span aria-hidden>⌨</span> Apertar Espaço
      </SceneButton>
    ),
    relogio && (
      <SceneButton
        key="tocar"
        // ⚠️ `min-w-11`: só com ícone ele media 42 × 44, abaixo dos 44px da casa (lote 2).
        className="min-w-11"
        // ⚠️ O nome diz o que acontece com o TEMPO: "Continuar experiência" num relógio que nunca
        // começou prometia uma coisa que não existia.
        aria-label={tocando ? 'Parar o tempo' : 'Soltar o tempo'}
        onClick={onTocar}
      >
        {tocando ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        {/* ⚠️ A PALAVRA "Tempo" (lote 5 do Raio-X): o ▶ sozinho era "o relógio" das instruções, e
            "relógio" também é a peça do nascimento e da condição. Duas coisas com o mesmo nome na
            mesma frase. O nome acessível continua "Soltar/Parar o tempo". */}
        <span aria-hidden>Tempo</span>
      </SceneButton>
    ),
    relogio && tempoDoPasso !== null && nomeDoPasso !== null && (
      <SceneButton
        key="um-passo"
        onClick={() => dispatch({ type: 'advance', seconds: tempoDoPasso })}
      >
        <StepForward size={16} aria-hidden />
        {nomeDoPasso}
      </SceneButton>
    ),
    relogio && (
      <SceneButton key="devagar" aria-pressed={lento} onClick={onLento}>
        <span aria-hidden>🐢</span> Mais devagar
      </SceneButton>
    ),
  ].filter((b): b is ReactElement => Boolean(b))
}
