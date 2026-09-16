'use client'

import { numero } from '@sistemazero/core/learning/scene'
import { type ReactNode, useEffect, useId, useState } from 'react'
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

/**
 * MEDIDA — um deslizante com o valor à vista e dois botões de passo.
 *
 * ⚠️ Os botões existem para quem não arrasta. Um `<input type="range">` sozinho é alcançável
 * pelo teclado, mas exige saber que a seta funciona; o par −/+ diz isso na tela, e num celular
 * dá um alvo de 44px para a mão pequena que erra o cursor do deslizante.
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
  soltar = false,
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
   * do valor, para acompanhar o deslizante enquanto ele ainda não foi SOLTO (`soltar`).
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
  /**
   * ⚠️⚠️ O deslizante só manda o valor quando a mão SOLTA (lote 5 do Raio-X, `onion-skin`). Cada
   * `onChange` é um comando, e arrastar de 40 até 0 passava por todos os valores do meio: a meta
   * "deixou o fogo um pouco maior" caía no caminho, sem a criança ter parado ali. Enquanto arrasta,
   * o valor à vista acompanha o dedo; o motor recebe o valor no `pointerup`, no `keyup` (a seta do
   * teclado é um gesto inteiro) ou ao sair do controle. Os botões −/+ continuam mandando na hora.
   */
  soltar?: boolean
  onChange: (valor: number) => void
}) {
  const id = useId()
  const salto = passo ?? step
  const [arrastando, setArrastando] = useState<number | null>(null)
  const mostrado = arrastando ?? value
  const escrito = typeof texto === 'function' ? texto(mostrado) : texto
  const soltou = () => {
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
  return (
    <div className="rounded-2xl border border-border p-4 text-sm font-semibold">
      {digitavel ? (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id}>{label}</label>
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
            className={`h-11 w-20 rounded-xl border border-border bg-background px-2 text-right text-lg tabular-nums ${tom} ${
              disabled ? 'cursor-not-allowed border-dashed opacity-60' : ''
            }`}
          />
        </div>
      ) : (
        <label className="flex justify-between gap-2" htmlFor={id}>
          {label}
          {/* O negativo com o sinal de menos do conteúdo ("−9"), como a instrução escreve. */}
          <output className={`text-lg tabular-nums ${tom}`}>{escrito ?? numero(mostrado)}</output>
        </label>
      )}
      <div className="mt-2 flex items-center gap-2">
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
          onChange={(e) => {
            if (disabled) return
            if (soltar) setArrastando(Number(e.target.value))
            else onChange(Number(e.target.value))
          }}
          onPointerUp={soltar ? soltou : undefined}
          onKeyUp={soltar ? soltou : undefined}
          onBlur={soltar ? soltou : undefined}
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
        <p id={descrito} className="mt-2 font-normal text-muted-foreground">
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
    <fieldset className="rounded-2xl border border-border p-4 text-sm font-semibold">
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
