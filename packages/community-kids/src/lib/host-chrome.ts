/**
 * Contrato do CHROME DO HOST dentro das ferramentas embarcadas (Pinta, Estúdio, Pensa;
 * Molda no lote seguinte). São DADOS, nunca `ReactNode`: cada ferramenta desenha o botão
 * do menu e o selo da nuvem no idioma DELA (tokens, tamanho de alvo, tier compacto), e o
 * host só diz o estado e a copy. Um `ReactNode` do host levaria `bg-background/90
 * ring-border` para dentro de `bg-pin-surface`, que é exatamente o "colado por cima" que
 * este lote existe para tirar. Cada pacote declara o ESPELHO estrutural destes tipos
 * (regra da casa: zero import entre pacotes); o host embrulha o app com o Provider que o
 * PRÓPRIO pacote exporta (`mod.PintaHostChromeProvider` etc.).
 *
 * Por que isso existe (07/09/2026): o selo "Guardado na sua conta" vivia numa LINHA acima
 * da ferramenta (0 ou 32px: o canvas pulava na 1ª gravação) e o puxador de esconder o menu
 * morava numa calha de 36px ao lado do app. Os dois entraram na barra da ferramenta e o
 * `<main>` ficou de borda a borda.
 */

export type HostChromeTone = 'muted' | 'ok' | 'warn' | 'danger'

export type HostChromeIcon = 'upload' | 'download' | 'cloud' | 'offline' | 'alert'

/** O botão de esconder/mostrar o menu lateral (só existe onde a sidebar existe: ≥768px). */
export interface HostChromeMenu {
  /** Menu escondido = `aria-pressed` do botão. */
  hidden: boolean
  /** `aria-label` do botão ('Esconder menu' | 'Mostrar menu'). NUNCA vira `title`. */
  label: string
  onToggle: () => void
}

/** O selo da nuvem, já em copy de criança. `null` = nada a dizer (idle/unsupported). */
export interface HostChromeStatus {
  tone: HostChromeTone
  /** Dica de ícone; a ferramenta pode ignorar (o Estúdio usa só texto/bolinha). */
  icon: HostChromeIcon
  /** Curto, cabe numa barra de ferramentas. */
  label: string
  /** A frase inteira (cabeçalho da galeria, `title`, região viva do host). */
  text: string
}

export interface HostChrome {
  menu: HostChromeMenu | null
  status: HostChromeStatus | null
}

export const HOST_CHROME_MENU_LABELS = {
  hide: 'Esconder menu',
  show: 'Mostrar menu',
} as const

/** O que uma ferramenta lê quando o host não embrulhou nada (playground, aula, adulto). */
export const EMPTY_HOST_CHROME: HostChrome = { menu: null, status: null }
