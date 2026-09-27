'use client'

import { numero, type SceneState } from '@sistemazero/core/learning/scene'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { SceneButton } from './exploration-stage'

/**
 * O VOCABULÁRIO da bancada: as peças com que toda cena é controlada.
 *
 * ⭐⭐ São três, e o número é o ponto. Antes cada bancada inventava a sua: `Medida` vivia na do
 * núcleo e era importada pela do motor, `Chave` era privada da do motor, e as quatorze bancadas
 * que moravam dentro do player escreviam `<label><input type="range">` à mão — sem os botões de
 * passo que as outras vinte e uma tinham. **A régua desta casa é que toque, teclado e leitor de
 * tela levem ao MESMO lugar**, e ela se perde exatamente assim: numa cópia que ninguém comparou.
 *
 * ⚠️ A quarta peça, o GESTO (a ação que move a cena), não mora aqui: ela é um `SceneButton` com
 * `tom="gesto"`, porque é um botão do aplicativo como qualquer outro — o que muda é o peso.
 */

/** As metas desta atividade, já avaliadas, como a bancada as recebe. */
export type MetasDaBancada = readonly { id: string; complete: boolean }[]

/**
 * A meta que ABRE um controle ("fechado não é escondido") já aconteceu?
 *
 * ⚠️⚠️ UMA régua para toda bancada (full review de 16/09/2026). Havia três grafias (a lista de metas com o
 * estado de reserva, o estado com a lista de reserva, e só o estado), e as bancadas do núcleo e do motor
 * liam só `discoveries`: o "Agora é sua vez", que passa TODAS as metas completas para nada ficar
 * esperando, deixava a chave fechada nelas quando o roteiro do professor era mais curto que o do modelo.
 * Aberta = completa na lista da atividade OU já vista pelo motor (meta fora do caso do professor ainda
 * abre o controle pelo que a criança viu).
 */
export function metaAberta(goals: MetasDaBancada, state: SceneState) {
  return (meta: string) =>
    goals.some((g) => g.id === meta && g.complete) || state.evidence.discoveries.includes(meta)
}

/**
 * MEDIDA — um deslizante com o valor à vista e dois botões de passo.
 *
 * ⚠️ Os botões existem para quem não arrasta. Um `<input type="range">` sozinho é alcançável
 * pelo teclado, mas exige saber que a seta funciona; o par −/+ diz isso na tela, e num celular
 * dá um alvo de 44px para a mão pequena que erra o cursor do deslizante.
 *
 * ⚠️⚠️ O deslizante só manda o valor ao motor quando o GESTO termina, em TODA cena. É regra da peça, e
 * não opção de quem a usa (full review de 16/09/2026): nasceu como `soltar` numa cena (`onion-skin`,
 * lote 5 do Raio-X), a bancada do motor precisou de uma constante `SOLTAR = true` para não esquecer em
 * dez lugares, e seis medidas continuavam mandando cada valor do caminho. Cada `onChange` é um comando:
 * arrastar de 40 até 0 passava por todos os valores do meio, e uma meta ("deixou o fogo um pouco maior")
 * caía ou um palpite se revelava num valor em que a criança nunca parou; e cada valor do caminho era um
 * passo do Desfazer. Enquanto o dedo ou a tecla estão apertados, o número à vista acompanha e o motor
 * espera; ele recebe o valor no `pointerup`, `pointercancel`, `lostpointercapture`, `keyup` ou ao sair do
 * controle. ⚠️ Um `change` que chega SEM dedo nem tecla apertados vai na hora: é o ajuste do leitor de
 * tela (no VoiceOver do iOS, deslizar para cima ou para baixo muda o valor sem `keyup` nem `pointerup`),
 * e cada ajuste ali já é um gesto inteiro. Os botões −/+ mandam na hora.
 */
export function Medida({
  label,
  value,
  min,
  max,
  step = 1,
  passo,
  texto,
  tom = 'text-scene-a',
  disabled = false,
  nota,
  digitavel = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  passo?: number
  /**
   * O valor em PALAVRA, para quem ouve: sem ele o leitor anuncia só o número cru. Pode ser uma função
   * do valor, para acompanhar o deslizante enquanto o gesto ainda não terminou.
   */
  texto?: string | ((valor: number) => string)
  tom?: string
  /**
   * ⚠️⚠️ Fechado NÃO é escondido. Uma variável por vez é a régua de várias cenas (na `hitbox` a
   * largura da área só abre depois da primeira descoberta sobre distância), e o controle
   * continua na tela com o motivo escrito na `nota` — sumir com ele faria a criança procurar.
   */
  disabled?: boolean
  nota?: ReactNode
  /**
   * Um campo para DIGITAR o número no lugar do valor à vista (lote 5 do Raio-X, `stage-size`): no
   * bloco do Estúdio a criança digita a medida, e de 800 a 480 eram 32 toques no "−".
   * ⚠️ O número só vai ao motor quando ela CONFIRMA (Enter ou sair do campo): cada `onChange` é um
   * comando, e digitar "480" mandaria 4, 48 e 480 (o 4 e o 48 presos no mínimo da faixa).
   */
  digitavel?: boolean
  onChange: (valor: number) => void
}) {
  const id = useId()
  const salto = passo ?? step
  const [arrastando, setArrastando] = useState<number | null>(null)
  /** Um dedo ou uma tecla apertados sobre o deslizante: o gesto ainda não terminou. */
  const segurando = useRef(false)
  const mostrado = arrastando ?? value
  const escrito = typeof texto === 'function' ? texto(mostrado) : texto
  const soltou = () => {
    segurando.current = false
    if (arrastando === null) return
    setArrastando(null)
    if (!disabled && arrastando !== value) onChange(arrastando)
  }
  const [digitado, setDigitado] = useState(String(value))
  useEffect(() => {
    setDigitado(String(value))
  }, [value])
  const confirmarDigitado = () => {
    const lido = Number(digitado.replace(',', '.'))
    if (disabled || digitado.trim() === '' || !Number.isFinite(lido)) {
      setDigitado(String(value))
      return
    }
    const noPasso = Math.round((lido - min) / step) * step + min
    const valor = Math.max(min, Math.min(max, noPasso))
    setDigitado(String(valor))
    if (valor !== value) onChange(valor)
  }
  /**
   * ⚠⚠ O botão DIZ o quanto anda, quando anda mais que o deslizante. Na cena do endereço o
   * dedo arrasta de 1 em 1 e o botão pula de 20 em 20: quem usa leitor de tela ouvia só
   * "aumentar x" e não tinha como saber que os dois não fazem a mesma coisa. Quando o salto é o
   * mesmo do deslizante a frase fica fora — "aumentar a lupa em 1" é ruído.
   */
  const quanto = salto !== step ? ` em ${salto}` : ''
  const mover = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)))
  /**
   * ⚠️⚠️ A nota é LIGADA aos três controles (review do lote 1): ela ficava solta embaixo, e quem
   * usa leitor de tela nunca ouvia por que o deslizante não respondia.
   */
  const descrito = nota ? `${id}-nota` : undefined
  /** Ver o comentário do layout logo abaixo: dez caracteres é o que sobra para o nome numa linha. */
  const umaLinha = label.length <= 10
  return (
    /*
     * ⭐⭐ UMA LINHA onde cabe (18/09/2026): `rótulo · − ▬▬ + · valor`. É a peça da maquete que ela
     * aprovou, e a primeira implantação saiu com o layout de duas linhas de sempre — a prancha
     * ficou com o dobro da altura do que ela viu na tela.
     *
     * ⚠️⚠️ **Só com rótulo CURTO, e o limiar é medido, não chutado.** Numa peça de 400px (duas por
     * linha na coluna da aula) sobram ~240px depois dos dois botões de 44, do valor e dos vãos; o
     * deslizante precisa de uns 160 para ser deslizante, então o rótulo tem ~80px, que são dez
     * caracteres. Dos 23 rótulos de `Medida` das 45 cenas, SEIS cabem (`x`, `y`, `z`,
     * `y (altura)`, `alvo, x`, `Aproximar`) — entre eles os da cena do endereço, que é a que ela
     * olhou. Os outros 17 seguem no layout de duas linhas.
     *
     * ⚠️ Por que um limiar no JS e não o `flex-wrap`: quando não cabe, alguma coisa desce, e o
     * `flex-wrap` faria descer o ÚLTIMO item — o valor, sozinho embaixo do deslizante. O que a
     * peça larga precisa é do contrário: nome e valor juntos em cima, deslizante inteiro embaixo.
     * CSS puro não escolhe QUEM desce; o limiar escolhe.
     * ⚠️ O padding é o da maquete (0,5 × 0,625rem) nos DOIS layouts; era `p-4`, e são 45 cenas de
     * diferença na altura da prancha.
     */
    <div
      className={`rounded-2xl border border-border px-2.5 py-2 text-sm font-semibold ${
        umaLinha ? 'flex flex-wrap items-center gap-x-2 gap-y-1' : ''
      }`}
    >
      {digitavel ? (
        <div className={umaLinha ? 'contents' : 'flex items-center justify-between gap-2'}>
          <label className="shrink-0" htmlFor={id}>
            {label}
          </label>
          <input
            type="text"
            inputMode="numeric"
            aria-label={`Digitar ${label}`}
            aria-describedby={descrito}
            aria-disabled={disabled || undefined}
            readOnly={disabled}
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            onBlur={confirmarDigitado}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarDigitado()
            }}
            className={`h-11 w-20 shrink-0 rounded-xl border border-border bg-background px-2 text-right text-lg tabular-nums ${
              umaLinha ? 'order-last ml-auto' : ''
            } ${tom} ${disabled ? 'cursor-not-allowed border-dashed opacity-60' : ''}`}
          />
        </div>
      ) : (
        <div className={umaLinha ? 'contents' : 'flex justify-between gap-2'}>
          <label className="shrink-0" htmlFor={id}>
            {label}
          </label>
          {/* O negativo com o sinal de menos do conteúdo ("−9"), como a instrução escreve.
              ⚠️ `aria-live="off"` (full review de experiência, B7): o `<output>` é região viva por padrão,
              e cada toque gerava DOIS anúncios (o número e a frase da situação). O número segue no
              `aria-valuetext` do deslizante; o acontecimento, na frase. */}
          <output
            aria-live="off"
            className={`shrink-0 text-right text-lg tabular-nums ${
              umaLinha ? 'order-last ml-auto' : ''
            } ${tom}`}
          >
            {escrito ?? numero(mostrado)}
          </output>
        </div>
      )}
      {/* ⚠️ `min-w-0` no grupo (e não no deslizante sozinho): numa linha só ele precisa poder
          encolher até o piso do `flex-1`, senão empurra o valor para fora da peça. */}
      <div className={`flex min-w-0 items-center gap-2 ${umaLinha ? 'flex-1' : 'mt-1.5'}`}>
        <SceneButton
          className="min-w-11 px-2"
          aria-label={`Diminuir ${label}${quanto}`}
          aria-describedby={descrito}
          fechado={disabled}
          onClick={() => mover(-salto)}
        >
          −
        </SceneButton>
        {/* ⚠️⚠️ `aria-disabled`, e não `disabled`: fechado não é escondido, nem do teclado. O
            deslizante continua no Tab e diz o motivo; a seta do teclado muda o valor do DOM, o
            `onChange` o ignora e o React devolve o valor controlado. */}
        <input
          id={id}
          aria-label={label}
          aria-valuetext={escrito}
          aria-describedby={descrito}
          aria-disabled={disabled || undefined}
          className={`h-11 min-w-0 flex-1 accent-primary ${disabled ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={mostrado}
          onPointerDown={() => {
            segurando.current = true
          }}
          onKeyDown={() => {
            segurando.current = true
          }}
          onChange={(e) => {
            if (disabled) return
            const valor = Number(e.target.value)
            if (segurando.current) {
              setArrastando(valor)
              return
            }
            // Sem dedo nem tecla: o ajuste do leitor de tela, um gesto inteiro.
            setArrastando(null)
            if (valor !== value) onChange(valor)
          }}
          onPointerUp={soltou}
          onPointerCancel={soltou}
          onLostPointerCapture={soltou}
          onKeyUp={soltou}
          onBlur={soltou}
        />
        <SceneButton
          className="min-w-11 px-2"
          aria-label={`Aumentar ${label}${quanto}`}
          aria-describedby={descrito}
          fechado={disabled}
          onClick={() => mover(salto)}
        >
          +
        </SceneButton>
      </div>
      {nota ? (
        <p id={descrito} className="mt-1 w-full font-normal text-muted-foreground">
          {nota}
        </p>
      ) : null}
    </div>
  )
}

/**
 * CHAVE — um interruptor com o ESTADO no rótulo, nunca a ação que o clique vai fazer.
 *
 * ⚠️⚠️ O rótulo que dizia "Desligar a reciclagem" com o botão pintado de primário (o visual de
 * "ativo" desta casa) e `aria-pressed="true"` fazia as três camadas contarem histórias
 * diferentes: o desenho dizia ligado, o texto dizia desligar, e só o `aria-pressed` estava
 * certo. O molde é o do resto do player: `Desenhar a cada quadro: ligado`.
 */
export function Chave({
  label,
  ligado,
  ligadoTexto = 'ligada',
  desligadoTexto = 'desligada',
  seletor = false,
  disabled = false,
  nota,
  onToggle,
}: {
  label: string
  ligado: boolean
  ligadoTexto?: string
  desligadoTexto?: string
  /**
   * ⚠️ Dois VALORES em vez de ligado/desligado (a luz vem da esquerda ou da direita; o jogo
   * conta quadros ou segundos). Aqui não existe "desligado", e o `aria-pressed` dizia
   * "não pressionado" para um estado que está tão ligado quanto o outro — a única das três
   * camadas que ainda contava outra história.
   */
  seletor?: boolean
  /**
   * ⚠️⚠️ Fechado NÃO é escondido, a mesma régua da `Medida`: o interruptor que só faz sentido
   * depois de uma descoberta fica na tela, desligado, com o motivo escrito na `nota`. A nota é o
   * `aria-describedby` do botão, então quem usa leitor de tela ouve POR QUE ele não responde.
   */
  disabled?: boolean
  nota?: ReactNode
  onToggle: (valor: boolean) => void
}) {
  const id = useId()
  return (
    /* ⚠️ SEM caixa própria (lote 2 do Raio-X): uma borda em volta de UM botão era caixa dentro de
       caixa, e a bancada da `gravity` empilhava três só de controles. O botão já é a peça. */
    <div className="text-sm font-semibold">
      {/* ⚠️⚠️ `fechado`, e não `disabled` (review do lote 1): fica no Tab dizendo o motivo, sem a
          borda azul de controle aberto e sem responder ao toque. */}
      <SceneButton
        aria-pressed={seletor ? undefined : ligado}
        aria-describedby={nota ? `${id}-nota` : undefined}
        tom={!seletor && ligado ? 'ligado' : 'ferramenta'}
        className="border-primary"
        fechado={disabled}
        onClick={() => onToggle(!ligado)}
      >
        {label}: {ligado ? ligadoTexto : desligadoTexto}
      </SceneButton>
      {nota ? (
        <p id={`${id}-nota`} className="mt-2 font-normal text-muted-foreground">
          {nota}
        </p>
      ) : null}
    </div>
  )
}

/**
 * ESCOLHA — dois ou três valores, um deles em vigor.
 *
 * ⚠️⚠️ **Sem `aria-pressed`**, e é a razão de ela existir separada da `Chave`: numa escolha
 * nenhum valor é "desligado". O leitor de tela anunciava "não pressionado" para a alternativa
 * que a criança não escolheu, como se ela estivesse apagada — e o que está ali são duas coisas
 * igualmente vivas. O estado vem do `aria-current`, que é o que significa "este é o que vale".
 */
export function Escolha<T extends string | number>({
  label,
  valor,
  opcoes,
  nota,
  onChange,
}: {
  label: string
  valor: T
  /**
   * ⚠️ `fechado` numa opção (lote 5 do Raio-X, `symmetry` e `sheet-vs-sprite`): a mesma régua da
   * `Medida` e da `Chave`. A opção fica na tela, no Tab, sem responder, e diz o motivo pela `nota`.
   */
  opcoes: readonly { id: T; label: string; fechado?: boolean }[]
  nota?: ReactNode
  onChange: (valor: T) => void
}) {
  const id = useId()
  const descrito = nota ? `${id}-nota` : undefined
  return (
    <fieldset className="rounded-2xl border border-border px-2.5 py-2 text-sm font-semibold">
      <legend className="px-1">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <SceneButton
            key={String(o.id)}
            aria-current={o.id === valor ? 'true' : undefined}
            aria-describedby={o.fechado ? descrito : undefined}
            tom={o.id === valor ? 'ligado' : 'ferramenta'}
            // ⚠️ 44 px de LARGURA também (consertos do review da onda B do lote 5, M2): os números da
            // velocidade (2, 4, 8) e do recorte (16, 32, 64) mediam 34 a 42 px no celular.
            className="min-w-11"
            fechado={o.fechado}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </SceneButton>
        ))}
      </div>
      {nota ? (
        <p id={descrito} className="mt-2 font-normal text-muted-foreground">
          {nota}
        </p>
      ) : null}
    </fieldset>
  )
}
