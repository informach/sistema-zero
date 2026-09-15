'use client'

import { type ReactNode, useId } from 'react'
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
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  passo?: number
  /** O valor em PALAVRA, para quem ouve: sem ele o leitor anuncia só o número cru. */
  texto?: string
  tom?: string
  /**
   * ⚠️⚠️ Fechado NÃO é escondido. Uma variável por vez é a régua de várias cenas (na `hitbox` a
   * largura da área só abre depois da primeira descoberta sobre distância), e o controle
   * continua na tela com o motivo escrito na `nota` — sumir com ele faria a criança procurar.
   */
  disabled?: boolean
  nota?: ReactNode
  onChange: (valor: number) => void
}) {
  const id = useId()
  const salto = passo ?? step
  /**
   * ⚠⚠ O botão DIZ o quanto anda, quando anda mais que o deslizante. Na cena do endereço o
   * dedo arrasta de 1 em 1 e o botão pula de 20 em 20: quem usa leitor de tela ouvia só
   * "aumentar x" e não tinha como saber que os dois não fazem a mesma coisa. Quando o salto é o
   * mesmo do deslizante a frase fica fora — "aumentar a lupa em 1" é ruído.
   */
  const quanto = salto !== step ? ` em ${salto}` : ''
  const mover = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)))
  return (
    <div className="rounded-2xl border border-border p-4 text-sm font-semibold">
      <label className="flex justify-between gap-2" htmlFor={id}>
        {label}
        <output className={`text-lg tabular-nums ${tom}`}>{texto ?? value}</output>
      </label>
      <div className="mt-2 flex items-center gap-2">
        <SceneButton
          className="min-w-11 px-2"
          aria-label={`Diminuir ${label}${quanto}`}
          disabled={disabled}
          onClick={() => mover(-salto)}
        >
          −
        </SceneButton>
        <input
          id={id}
          aria-label={label}
          aria-valuetext={texto}
          className="h-11 min-w-0 flex-1 accent-primary"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <SceneButton
          className="min-w-11 px-2"
          aria-label={`Aumentar ${label}${quanto}`}
          disabled={disabled}
          onClick={() => mover(salto)}
        >
          +
        </SceneButton>
      </div>
      {nota ? <p className="mt-2 font-normal text-muted-foreground">{nota}</p> : null}
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
  onToggle: (valor: boolean) => void
}) {
  return (
    <div className="rounded-2xl border border-border p-4 text-sm font-semibold">
      <SceneButton
        aria-pressed={seletor ? undefined : ligado}
        tom={!seletor && ligado ? 'ligado' : 'ferramenta'}
        className="border-primary"
        onClick={() => onToggle(!ligado)}
      >
        {label}: {ligado ? ligadoTexto : desligadoTexto}
      </SceneButton>
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
  onChange,
}: {
  label: string
  valor: T
  opcoes: readonly { id: T; label: string }[]
  onChange: (valor: T) => void
}) {
  return (
    <fieldset className="rounded-2xl border border-border p-4 text-sm font-semibold">
      <legend className="px-1">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <SceneButton
            key={String(o.id)}
            aria-current={o.id === valor ? 'true' : undefined}
            tom={o.id === valor ? 'ligado' : 'ferramenta'}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </SceneButton>
        ))}
      </div>
    </fieldset>
  )
}
