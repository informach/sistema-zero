import { createContext, useContext } from 'react'

/**
 * CHROME DO HOST na Topbar e na lista de projetos (07/09/2026): o botão de esconder o
 * menu lateral da comunidade e o selo "Guardado na sua conta"; desde 11/09 também a seta
 * da lista de volta à seção do host e o sinal da nuvem da conta (só a lista os lê). O
 * host (community-kids) só manda DADOS — o Studio desenha com as próprias peças (na barra do
 * editor, o `HostStatusSeal`) e, abaixo do tier wide, encolhe o selo para uma bolinha, como faz
 * com o "Salvo". Espelho
 * ESTRUTURAL do `HostChrome` do kids (zero import entre pacotes, mesma regra do
 * `pinta-library.ts`).
 *
 * VOLÁTIL como o `StudioShareDisabledContext`: o valor muda a cada saving↔saved e por
 * isso vive num contexto PRÓPRIO, fora do `StudioCore` — o host embrulha `<ProjectList>`
 * e `<StudioEditor>` (e o editor PRO) num único `<StudioHostChromeProvider>`. Default
 * `null` → nada aparece (playground, bloco de aula, admin, adulto).
 */
export interface StudioHostChromeMenu {
  /** Menu escondido = `aria-pressed` do botão. */
  hidden: boolean
  /** `aria-label` ('Esconder menu' | 'Mostrar menu'). Nunca vira `title`. */
  label: string
  onToggle: () => void
}

export interface StudioHostChromeStatus {
  tone: 'muted' | 'ok' | 'warn' | 'danger'
  icon: 'upload' | 'download' | 'cloud' | 'offline' | 'alert'
  /** Curto, para a Topbar. ⚠️ Nunca contém "Salvo" (o e2e usa `getByText('Salvo')` estrito). */
  label: string
  /** A frase inteira (lista de projetos, `title`, bolinha). */
  text: string
}

/**
 * A seta da LISTA de projetos de volta à seção do host (11/09/2026: "← Criar"). Só a lista
 * desenha; o editor já volta para a lista pela marca da Topbar. É um `<a href>`: o clique
 * simples chama `onNavigate` (navegação do host) e o com Ctrl/Cmd/do meio fica com o navegador.
 */
export interface StudioHostChromeBack {
  /** O nome acessível ("Voltar para Criar"): a seta é só o ícone. Nunca vira `title`. */
  label: string
  href: string
  onNavigate: () => void
}

/**
 * A nuvem da CONTA está ligada (11/09/2026). A lista mostra a pílula `label` em repouso,
 * quando o `status` não tem nada a dizer, e conta os projetos "na sua conta" em vez de
 * "neste aparelho". A Topbar não lê este campo (ali só o `status` fala).
 */
export interface StudioHostChromeAccount {
  label: string
}

export interface StudioHostChrome {
  menu: StudioHostChromeMenu | null
  status: StudioHostChromeStatus | null
  back: StudioHostChromeBack | null
  account: StudioHostChromeAccount | null
}

const StudioHostChromeContext = createContext<StudioHostChrome | null>(null)

export const StudioHostChromeProvider = StudioHostChromeContext.Provider

/** O chrome do host (`null` fora do community-kids). */
export function useStudioHostChrome(): StudioHostChrome | null {
  return useContext(StudioHostChromeContext)
}

/** Cor da BOLINHA (tiers narrow/compact) para cada tom do host. */
export const HOST_STATUS_DOT_CLASS: Record<StudioHostChromeStatus['tone'], string> = {
  muted: 'bg-sz-fg-mute',
  ok: 'bg-sz-success',
  warn: 'bg-sz-warn',
  danger: 'bg-sz-error',
}
