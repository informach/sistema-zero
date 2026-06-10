import type { CSSProperties } from 'react'
import type { Locale, Project } from '#core'
import type { StudioTheme } from './theme'

export type StudioLocale = Locale

export interface StudioProps {
  /**
   * Projeto inicial (uncontrolled: o Studio é dono do estado a partir daqui).
   * É sanitizado com as mesmas regras de projetos persistidos; um payload
   * inválido renderiza um aviso no lugar do editor.
   */
  initialProject: Project
  /**
   * Tema visual. Sem a prop, segue o tema das configurações internas do
   * próprio Studio (Settings). Aplicado como data-sz-theme no ROOT do
   * componente — nunca no <html> do host.
   */
  theme?: StudioTheme
  /** Idioma da UI (default pt-BR). Estático por instância: trocar exige remount. */
  locale?: StudioLocale
  /**
   * Sai do editor (ex.: volta à lista de projetos do host). Sem ela, a Topbar
   * esconde o botão "Projetos" e o logo vira estático.
   */
  onExit?: () => void
  /**
   * Registra beforeunload enquanto houver mudanças não salvas (default true).
   * Hosts SPA com navegação própria podem desligar e usar o estado de dirty.
   */
  blockUnloadWhenDirty?: boolean
  /** Classes extras no root. O Studio preenche 100% do container do host. */
  className?: string
  style?: CSSProperties
}
