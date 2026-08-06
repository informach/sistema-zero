/**
 * Tutorial guiado de primeiro acesso — o CÉREBRO puro (testável, sem DOM).
 *
 * A decisão de produto (04/08/2026): o guia SEGUE O ESTADO REAL, não um roteiro
 * fixo. "Conta sem perfil" É o primeiro acesso e retoma do ponto certo se o pai
 * parar no meio. "Pular tutorial" encerra o fluxo inteiro neste navegador; os
 * controles normais da tela continuam disponíveis sem se passarem por tutorial.
 *
 * Reuso planejado: a fase 2 (tour da criança na home) usa os MESMOS helpers de
 * storage com chave por profileId; só o resolver muda.
 */

export type ParentGuideStep =
  /** Grade sem perfil, fora da gestão → apontar o botão "Área dos pais". */
  | 'welcome-area'
  /** Gestão aberta, sem perfil, com vaga → apontar o "Adicionar". */
  | 'plus'
  /** Formulário de criação aberto → dica de preenchimento. */
  | 'form'
  /** Perfil antigo, ainda em gestão → orientar o "Concluir" sem fingir uma criação. */
  | 'conclude'
  /** Perfil realmente criado durante este fluxo → celebrar e apontar o "Concluir". */
  | 'conclude-created'
  /** Grade normal com perfil → apontar a bolinha ("é aqui que a criança entra"). */
  | 'tile'

export interface ParentGuideInput {
  profilesCount: number
  managing: boolean
  /** O plano confirmou que a conta pode criar mais um perfil. */
  canCreateProfile: boolean
  /** Uma criação retornou sucesso desde que a gestão foi aberta. */
  profileCreated: boolean
  /** O ProfileForm de CRIAÇÃO está aberto (early return da página). */
  creatingOpen: boolean
  /** O pai concluiu/pulou o guia (flag versionada `tour-complete`). */
  dismissed: boolean
  /** Sessão de PERFIL (criança trocando de irmão) — o guia é dos PAIS, nunca aparece. */
  isProfileSession: boolean
}

/**
 * O próximo passo do guia dos pais, derivado do que a tela realmente mostra.
 * `null` = nada a guiar (fluxo completo, guia dispensado ou sessão da criança).
 */
export function resolveParentGuideStep(input: ParentGuideInput): ParentGuideStep | null {
  if (input.isProfileSession) return null
  // "Pular tutorial" e o arremate final são uma saída global: nenhum passo pode
  // reaparecer só porque a conta ainda não tem perfil.
  if (input.dismissed) return null
  if (input.creatingOpen) return 'form'
  if (input.profilesCount === 0) {
    if (!input.managing) return 'welcome-area'
    return input.canCreateProfile ? 'plus' : null
  }
  if (!input.managing) return 'tile'
  return input.profileCreated ? 'conclude-created' : 'conclude'
}

// ---- Fase 2: o guia da CRIANÇA (home) ----

export type ChildGuideStep =
  /** Nunca montou o avatar → convite ao configurador (o que mais motiva). */
  | 'avatar'
  /** Nunca abriu uma aula e há um alvo de "Começar" → apontar o ContinueHero. */
  | 'start'

export interface ChildGuideInput {
  /** O perfil já tem a foto do avatar 3D; `null` = API indisponível, estado desconhecido. */
  hasAvatar: boolean | null
  /** Algum curso já foi aberto ou teve aula concluída. */
  hasCourseActivity: boolean
  /** Existe um curso liberado para apontar (sem curso, a cobrança é dos pais). */
  startAvailable: boolean
  avatarDismissed: boolean
  startDismissed: boolean
}

export interface GuideWelcomeStep {
  id: 'avatar' | 'start' | 'xp' | `parent-${number}`
  emoji: string
  text: string
}

type ChildWelcomeInput = Pick<ChildGuideInput, 'hasAvatar' | 'hasCourseActivity' | 'startAvailable'>

/**
 * O modal infantil descreve somente ações que ainda existem. A numeração também
 * é derivada, evitando um "passo 2" órfão quando avatar ou primeira aula já foram feitos.
 */
export function childWelcomeSteps(input: ChildWelcomeInput): readonly GuideWelcomeStep[] {
  const steps: Array<Omit<GuideWelcomeStep, 'emoji'>> = []
  if (input.hasAvatar === false) {
    steps.push({ id: 'avatar', text: 'Monte o seu avatar do seu jeito: cabelo, roupa, tudo!' })
  }
  if (input.startAvailable && !input.hasCourseActivity) {
    steps.push({ id: 'start', text: 'Toque em "Começar" e a sua primeira aula abre na hora.' })
  }
  steps.push({ id: 'xp', text: 'Cada aula e cada jogo que você cria valem XP e conquistas!' })

  const numbers = ['1️⃣', '2️⃣', '3️⃣'] as const
  return steps.map((step, index) => ({ ...step, emoji: numbers[index] ?? '⭐' }))
}

/**
 * O próximo passo do guia da criança — mesmo espírito do dos pais: deriva do
 * ESTADO e desaparece sozinho quando a coisa acontece (montou o avatar, abriu
 * a 1ª aula). O avatar vem primeiro (a ordem da descrição da usuária): é o
 * gancho de diversão; a aula vem logo atrás.
 */
export function resolveChildGuideStep(input: ChildGuideInput): ChildGuideStep | null {
  if (input.hasAvatar === false && !input.avatarDismissed) return 'avatar'
  if (input.startAvailable && !input.hasCourseActivity && !input.startDismissed) return 'start'
  return null
}

/** Conteúdo do modal dos pais coerente com a família e com o direito de criar. */
export function parentWelcomeSteps({
  profilesCount,
  canCreateProfile,
}: {
  profilesCount: number
  canCreateProfile: boolean
}): readonly GuideWelcomeStep[] {
  if (profilesCount === 0) {
    return [
      {
        id: 'parent-1',
        emoji: '1️⃣',
        text: 'Toque em "Área dos pais" e digite a sua senha. É lá que você cria o primeiro perfil.',
      },
      {
        id: 'parent-2',
        emoji: '2️⃣',
        text: 'Coloque o nome da criança. A data de nascimento é opcional, e você decide se o perfil aparece para outras crianças.',
      },
      {
        id: 'parent-3',
        emoji: '3️⃣',
        text: 'Pronto! Na hora de estudar, é só tocar na bolinha com o nome dela.',
      },
    ]
  }

  return [
    {
      id: 'parent-1',
      emoji: '1️⃣',
      text: 'Escolha quem vai aprender e toque na bolinha com o nome da criança.',
    },
    {
      id: 'parent-2',
      emoji: '2️⃣',
      text: canCreateProfile
        ? 'Na Área dos pais você pode editar, acompanhar o progresso e adicionar outro perfil.'
        : 'Na Área dos pais você pode editar os perfis e acompanhar o progresso das crianças.',
    },
    {
      id: 'parent-3',
      emoji: '3️⃣',
      text: 'Quando terminar, toque em "Concluir" para voltar à escolha de perfis.',
    },
  ]
}

// ---- Storage (padrão da casa: try/catch fail-soft, chave por viewer) ----
// Flags duráveis vivem no localStorage deste navegador/dispositivo. O adiamento
// "Agora não" do avatar usa sessionStorage, para voltar numa nova sessão sem
// importunar repetidamente durante a sessão atual. Storage indisponível nunca
// quebra a tela — o guia apenas perde a memória correspondente.

/** Versão explícita: mudanças relevantes no roteiro podem reapresentar o guia com segurança. */
export const GUIDE_VERSION = 'v2'
const guideKey = (audience: 'parent' | 'child', viewerId: string, flag: string) =>
  `sz:kids:onboarding:${GUIDE_VERSION}:${audience}:${viewerId}:${flag}`

/** O modal de boas-vindas já foi concluído/fechado por esta conta neste navegador. */
export const guideWelcomeSeenKey = (accountId: string) =>
  guideKey('parent', accountId, 'welcome-seen')
/** O pai concluiu ("Entendi" na bolinha) ou pulou o guia. */
export const guideDismissedKey = (accountId: string) =>
  guideKey('parent', accountId, 'tour-complete')

/** O modal de boas-vindas da CRIANÇA já auto-abriu para este perfil neste navegador. */
export const childGuideWelcomeSeenKey = (profileId: string) =>
  guideKey('child', profileId, 'welcome-seen')
/** A criança adiou o convite ao avatar na sessão atual ("Agora não"). */
export const childGuideAvatarDismissedKey = (profileId: string) =>
  guideKey('child', profileId, 'avatar-deferred')
/** A criança dispensou o aponte do "Começar" ("Entendi"). */
export const childGuideStartDismissedKey = (profileId: string) =>
  guideKey('child', profileId, 'start-complete')

export function readGuideFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeGuideFlag(key: string): void {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // fail-soft: sem localStorage o guia reaparece na próxima visita — inócuo.
  }
}

export function clearGuideFlag(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // fail-soft.
  }
}

export function readSessionGuideFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeSessionGuideFlag(key: string): void {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    // fail-soft: sem sessionStorage o convite pode reaparecer nesta sessão.
  }
}

export function clearSessionGuideFlag(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // fail-soft.
  }
}
