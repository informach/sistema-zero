import { createContext, useContext } from 'react'

/**
 * CHROME DO HOST na Topbar e na lista de projetos (07/09/2026): o botão de esconder o
 * menu lateral da comunidade e o selo "Guardado na sua conta". O host (community-kids)
 * só manda DADOS — o Studio desenha com os próprios `IconButton`/`Badge` e, abaixo do
 * tier wide, encolhe o selo para uma bolinha, como faz com o "Salvo". Espelho
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

export interface StudioHostChrome {
  menu: StudioHostChromeMenu | null
  status: StudioHostChromeStatus | null
}

const StudioHostChromeContext = createContext<StudioHostChrome | null>(null)

export const StudioHostChromeProvider = StudioHostChromeContext.Provider

/** O chrome do host (`null` fora do community-kids). */
export function useStudioHostChrome(): StudioHostChrome | null {
  return useContext(StudioHostChromeContext)
}

/** Tom do `Badge` para cada tom do host. */
export const HOST_STATUS_BADGE_TONE: Record<
  StudioHostChromeStatus['tone'],
  'neutral' | 'success' | 'warn' | 'error'
> = { muted: 'neutral', ok: 'success', warn: 'warn', danger: 'error' }

/** Cor da BOLINHA (tiers narrow/compact) para cada tom do host. */
export const HOST_STATUS_DOT_CLASS: Record<StudioHostChromeStatus['tone'], string> = {
  muted: 'bg-sz-fg-mute',
  ok: 'bg-sz-success',
  warn: 'bg-sz-warn',
  danger: 'bg-sz-error',
}
