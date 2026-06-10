import type { CSSProperties, Ref } from 'react'
import type { IDEMode, Locale, Project } from '#core'
import type { StudioPersistence } from '../persistence/types'
import type { StudioTheme } from './theme'

export type StudioLocale = Locale

/** Acesso imperativo à instância (prop `ref` do <Studio> — React 19). */
export interface StudioHandle {
  /** Snapshot atual do projeto (síncrono). */
  getProject(): Project | null
  /** Força flush: persiste via adapter (se houver) e emite onChange/onSave. */
  save(): Promise<void>
  /** Substitui o projeto inteiro (ex.: host recarregou do servidor). Remonta os editores. */
  replaceProject(project: Project): void
  setMode(mode: IDEMode): void
  isDirty(): boolean
}

export interface StudioProps {
  /**
   * Projeto inicial (uncontrolled: o Studio é dono do estado a partir daqui).
   * É sanitizado com as mesmas regras de projetos persistidos; um payload
   * inválido renderiza um aviso no lugar do editor. Para recarregar de fora,
   * use `handle.replaceProject()` ou troque a referência da prop.
   */
  initialProject: Project
  /**
   * Onde persistir: 'local' (IndexedDB embutido, default), 'none' (o host
   * salva via onChange/onSave) ou um adapter custom. ESTÁTICO por instância:
   * trocar exige remount.
   */
  persistence?: StudioPersistence
  /**
   * Snapshot completo do projeto no MESMO debounce do autosave (1s) e em todo
   * flush (salvar explícito, pagehide, unmount). Emitido também com
   * persistence 'none' — é assim que o host persiste no backend.
   */
  onChange?: (project: Project) => void
  /** Após salvar explícito (botão Salvar / handle.save()). Promise rejeitada marca erro no badge. */
  onSave?: (project: Project) => void | Promise<void>
  /** Erros não-fatais de persistência (autosave/save que falhou). */
  onError?: (error: { kind: 'persistence'; message: string }) => void
  onModeChange?: (mode: IDEMode) => void
  /** Editor montado e projeto hidratado. */
  onReady?: () => void
  /**
   * Tema visual. Sem a prop, segue o tema das configurações internas do
   * próprio Studio (Settings/toggle da Topbar). Aplicado como data-sz-theme no
   * ROOT do componente — nunca no <html> do host.
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
   * Hosts SPA com navegação própria podem desligar e usar handle.isDirty().
   */
  blockUnloadWhenDirty?: boolean
  /** Classes extras no root. O Studio preenche 100% do container do host. */
  className?: string
  style?: CSSProperties
  ref?: Ref<StudioHandle>
}
