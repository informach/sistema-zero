import type { CSSProperties, Ref } from 'react'
import type { AnyBlockLevel, IDEMode, Locale, Project } from '#core'
import type { StudioPersistence } from '../persistence/types'
import type { StudioLimits } from '../state/projectStore'
import type { ActivityRunResult, LessonActivity } from './activity'
import type { StudioFeatures } from './config'
import type { StudioShareAdapter } from './share'
import type { StudioTheme } from './theme'

export type StudioLocale = Locale

/** Acesso imperativo à instância (prop `ref` do Studio — React 19). */
export interface StudioHandle {
  /** Snapshot atual do projeto (síncrono). */
  getProject(): Project | null
  /** Força flush: persiste via adapter (se houver) e emite onChange/onSave. */
  save(): Promise<void>
  /** Substitui o projeto inteiro (ex.: host recarregou do servidor). Remonta os editores. */
  replaceProject(project: Project): void
  setMode(mode: IDEMode): void
  isDirty(): boolean
  /**
   * Último resultado da auto-correção da atividade (`null` se ainda não rodou ou
   * não há atividade). O host (member-shell) anexa este resultado reportado no
   * envio — o servidor recalcula só as checagens de estrutura (correção híbrida).
   */
  getActivityResult(): ActivityRunResult | null
}

/**
 * Props de EDITOR — comuns ao núcleo e aos dois componentes públicos
 * (<StudioEditor> e <StudioLesson>). NÃO inclui curadoria de aprendizado (essa
 * vive só no <StudioLesson> via {@link StudioLearningProps}).
 */
export interface StudioCommonProps {
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
   * Liga/desliga partes do editor. Defaults: preview/console/extensões ON;
   * terminal OFF (exige COOP/COEP no host — ver docs/embedding.md); IA OFF
   * (`true` = BYOK; objeto injeta chave/modelo do host).
   */
  features?: StudioFeatures
  /**
   * Modos exibidos na Topbar (default: os 3). Se o modo do projeto não estiver
   * na lista, o editor abre no primeiro permitido.
   */
  allowedModes?: readonly IDEMode[]
  /** Abre neste modo (sobrepõe o modo salvo no projeto, sem marcar sujo). */
  initialMode?: IDEMode
  /**
   * Limites de política (tamanho de arquivo/projeto, nº de extras). Defaults
   * generosos; anti-DoS profundos continuam internos. Estático por instância.
   */
  limits?: StudioLimits
  /**
   * Snapshot completo do projeto no MESMO debounce do autosave (1s) e em todo
   * flush (salvar explícito, pagehide, unmount). Emitido também com
   * persistence 'none' — é assim que o host persiste no backend.
   *
   * `ctx.reason` distingue o autosave do debounce (`'autosave'`) do flush de
   * fechamento (`'flush'`): no flush o transporte normal (fetch) é abortado pela
   * navegação, então o host deve usar `navigator.sendBeacon` / `fetch` com
   * `keepalive` — a biblioteca não pode fazer isso por você. Ver docs/embedding.md.
   */
  onChange?: (project: Project, ctx?: { reason: 'autosave' | 'flush' }) => void
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
  /**
   * Adapter de "Compartilhar" (publicar no Mural dos Criadores). Quando
   * presente, a Topbar mostra o botão Compartilhar ao lado do Salvar; o host
   * implementa `generateDescription` (servidor) + `publish`. Ausente (default)
   * → sem botão. Estável por instância (latchado, igual à `activity`). Serve
   * ao estúdio de aula (hoje) e ao estúdio completo (produto futuro).
   */
  share?: StudioShareAdapter
  /**
   * Motivo para DESABILITAR o botão Compartilhar (vira a dica/tooltip). Texto
   * presente → o botão aparece, porém desabilitado; `undefined` → habilitado.
   * Ao contrário do `share` (latchado), é VOLÁTIL: o host pode trocá-lo conforme
   * o estado — ex.: "Envie o projeto ao professor primeiro", que some após a
   * entrega liberar o compartilhamento.
   */
  shareDisabledReason?: string
  /**
   * Callback OPCIONAL "Sincronizar com o enviado" (Estúdio da AULA): quando
   * presente, a Topbar mostra o item ⋯ → "Sincronizar com o enviado" que o
   * dispara. O HOST puxa do servidor o projeto enviado ao professor e substitui o
   * editor via `StudioHandle.replaceProject`. Ausente (default) → sem item.
   * Estável por instância (latchado, igual à `share`).
   */
  onCloudSync?: () => void
  /**
   * Mostra os EXEMPLOS prontos (CORE_EXAMPLES + os `examples` das extensões) no
   * painel de Extensões. Default `false` — os exemplos são material de TESTE do
   * admin e podem estar desatualizados/com erro, então ficam escondidos para
   * clientes; hoje só o playground local liga. Latchado por instância (igual à
   * `share`). Ver {@link useStudioExamplesVisible}. (A vitrine de kits da
   * `ProjectList` recebe a mesma flag por prop direta — ela vive fora do núcleo.)
   */
  showExamples?: boolean
  /** Classes extras no root. O Studio preenche 100% do container do host. */
  className?: string
  style?: CSSProperties
  ref?: Ref<StudioHandle>
}

/**
 * Curadoria de aprendizado FIXADA pelo host (divulgação progressiva). Nasceu
 * exclusiva do <StudioLesson>; desde 07/2026 o <StudioEditor> também aceita —
 * o host kids abre o editor LIVRE num nível mais calmo (com "revelar
 * avançado" ligado), em vez dos ~500 blocos de uma vez.
 */
export interface StudioLearningProps {
  /**
   * Degrau de aprendizado: cura a paleta de blocos por dificuldade × eixo 2D/3D
   * (escada de 6). Default: 'avancado-3d' (mostra tudo). Aceita também a escala
   * LEGADA de 3 níveis (aulas salvas antes da reforma) — `resolveLearning`
   * normaliza na fronteira. Estático por instância.
   */
  level?: AnyBlockLevel
  /** Tipos de bloco sempre visíveis, independente do nível (allowlist da aula). */
  allowBlocks?: readonly string[]
  /** Nomes de categoria sempre visíveis, independente do nível. */
  allowCategories?: readonly string[]
  /**
   * Permite o aluno revelar blocos avançados (toggle nas configurações). Default
   * true. O professor pode desligar para travar a paleta no nível definido.
   */
  allowLevelReveal?: boolean
}

/**
 * Props do motor {@link StudioCore} — superconjunto: editor + aprendizado +
 * atividade. Os dois componentes públicos repassam um subconjunto destas.
 */
export type StudioCoreProps = StudioCommonProps &
  StudioLearningProps & {
    /**
     * Atividade com auto-correção (fiada para a fase seguinte; ver
     * `studio/activity.ts`). Ausente → o painel de atividade não renderiza nada.
     */
    activity?: LessonActivity | null
  }

/**
 * Props do <StudioEditor> — editor completo independente (sem conceito de
 * AULA/atividade; a curadoria de aprendizado é opcional — default 'avancado-3d'
 * [topo da escada], paleta cheia, zero regressão p/ hosts existentes).
 */
export type StudioEditorProps = StudioCommonProps & StudioLearningProps

/**
 * Props do <StudioLesson> — editor configurável de aula: editor + curadoria de
 * aprendizado + atividade (auto-correção).
 */
export type StudioLessonProps = StudioCommonProps &
  StudioLearningProps & {
    /** Atividade com auto-correção (fiada para a fase seguinte). */
    activity?: LessonActivity | null
  }

/** @deprecated Use {@link StudioEditorProps} ou {@link StudioLessonProps}. Alias do {@link StudioCoreProps}. */
export type StudioProps = StudioCoreProps
