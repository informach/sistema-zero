/**
 * Contrato do CHROME DO HOST dentro das ferramentas embarcadas (Pinta, Estúdio, Pensa;
 * Molda no lote seguinte). São DADOS, nunca `ReactNode`: cada ferramenta desenha
 * o selo da nuvem e a seta de voltar no idioma DELA (tokens, tamanho de alvo,
 * tier compacto), e o host só diz o estado e a copy. Um `ReactNode` do host levaria `bg-background/90
 * ring-border` para dentro de `bg-pin-surface`, que é exatamente o "colado por cima" que
 * este lote existe para tirar. Cada pacote declara o ESPELHO estrutural destes tipos
 * (regra da casa: zero import entre pacotes); o host embrulha o app com o Provider que o
 * PRÓPRIO pacote exporta (`mod.PintaHostChromeProvider` etc.).
 *
 * Por que isso existe (07/09/2026): o selo "Guardado na sua conta" vivia numa LINHA acima
 * da ferramenta (0 ou 32px: o canvas pulava na 1ª gravação). O selo entrou na barra
 * da ferramenta; o menu agora é controlado pela alça do shell Kids.
 */

export type HostChromeTone = 'muted' | 'ok' | 'warn' | 'danger'

export type HostChromeIcon = 'upload' | 'download' | 'cloud' | 'offline' | 'alert'

/** Ainda usado por ferramentas autônomas; o host Kids embarcado envia `menu: null`. */
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

/**
 * A seta das GALERIAS de volta à seção-mãe (Criar), pedido dela de 11/09/2026: toda página
 * interna volta para a principal da seção. Só a galeria desenha; o editor e o bloco de aula
 * ignoram o campo (lá a seta já volta para a galeria). O destino sai do `backToSection` do
 * menu (`nav.ts`), nunca de uma lista paralela. Na ferramenta ela é o QUADRADO com a seta, ao
 * início das barras das telas-modelo: o nome existe só para o leitor.
 */
export interface HostChromeBack {
  /** O nome acessível ("Voltar para Criar"). NUNCA vira `title`: vira descrição e o leitor repete. */
  label: string
  /** O destino de verdade do `<a>`: clique com Ctrl/Cmd/do meio abre noutra aba. */
  href: string
  /** Clique simples: a navegação do host, sem recarregar a página. */
  onNavigate: () => void
}

/**
 * A nuvem da CONTA está ligada para esta ferramenta (existe perfil e o navegador guarda).
 * É o que a galeria usa para a pílula em repouso (a imagem-modelo mostra "Guardado na sua
 * conta" com nada acontecendo) e para dizer onde os trabalhos estão ("na sua conta" ×
 * "neste aparelho"). `status` continua sendo o que acontece AGORA; os editores só leem ele.
 */
export interface HostChromeAccount {
  /** A frase da pílula em repouso. */
  label: string
}

export interface HostChrome {
  menu: HostChromeMenu | null
  status: HostChromeStatus | null
  back: HostChromeBack | null
  account: HostChromeAccount | null
}

/** O que uma ferramenta lê quando o host não embrulhou nada (playground, aula, adulto). */
export const EMPTY_HOST_CHROME: HostChrome = {
  menu: null,
  status: null,
  back: null,
  account: null,
}
