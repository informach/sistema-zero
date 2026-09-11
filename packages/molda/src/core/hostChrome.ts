/**
 * O CHROME do host dentro do Molda (11/09/2026, lote 6b): o botão de esconder o menu lateral da
 * comunidade, a seta da galeria de volta para Criar, o selo da nuvem e o sinal de que a conta
 * guarda as criações. Espelho ESTRUTURAL do `HostChrome` do community-kids e cópia por VALOR do
 * contrato do Pinta (os dois pacotes não se importam).
 *
 * Só DADOS, nunca um elemento pronto: é o Molda que desenha, com os botões e os tons dele, o que
 * impede o selo de chegar "colado por cima" com tokens de outra paleta. Os quatro campos são
 * obrigatórios com `| null`, para quem monta o objeto não esquecer nenhum em silêncio.
 */

export interface MoldaHostChromeMenu {
  /** Menu escondido = `aria-pressed` do botão. */
  hidden: boolean
  /** `aria-label` ('Esconder menu' | 'Mostrar menu'). Nunca vira `title`. */
  label: string
  onToggle: () => void
}

export interface MoldaHostChromeStatus {
  tone: 'muted' | 'ok' | 'warn' | 'danger'
  icon: 'upload' | 'download' | 'cloud' | 'offline' | 'alert'
  /** Curto, para a barra do editor. */
  label: string
  /** A frase inteira (cabeçalho da galeria e `title`). */
  text: string
}

/**
 * A seta da GALERIA de volta à seção do host ("Voltar para Criar"). Só a galeria desenha: o
 * editor já volta para a galeria pela seta dele. É um `<a href>`: o clique simples chama
 * `onNavigate` (o host troca de rota sem recarregar) e o com Ctrl/Cmd/do meio fica com o
 * navegador.
 */
export interface MoldaHostChromeBack {
  /** O nome acessível: a seta é só o ícone. Nunca vira `title`. */
  label: string
  href: string
  onNavigate: () => void
}

/**
 * A nuvem da CONTA está ligada. A galeria mostra a pílula `label` em repouso (quando o `status`
 * não tem nada a dizer) e conta as criações "na sua conta" em vez de "neste aparelho". O editor
 * não lê este campo: ali só o `status` fala.
 */
export interface MoldaHostChromeAccount {
  label: string
}

export interface MoldaHostChrome {
  menu: MoldaHostChromeMenu | null
  status: MoldaHostChromeStatus | null
  back: MoldaHostChromeBack | null
  account: MoldaHostChromeAccount | null
}
