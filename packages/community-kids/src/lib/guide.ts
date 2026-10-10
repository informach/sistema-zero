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

export type ParentGuideStep = 'profile' | 'access' | 'ready'
export interface ParentGuideInput {
  profilesCount: number
  canCreateProfile: boolean
  accessReady: boolean
  dismissed: boolean
}
/** Criar um perfil não autoriza nenhum aparelho. O guia só conclui com uma autorização real. */
export function resolveParentGuideStep(input: ParentGuideInput): ParentGuideStep | null {
  if (input.dismissed) return null
  if (!input.profilesCount) return input.canCreateProfile ? 'profile' : null
  return input.accessReady ? 'ready' : 'access'
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

export type GuideWelcomeStepId =
  | 'avatar'
  | 'start'
  | 'aulas'
  | 'xp'
  | 'jornada'
  | 'criar'
  | 'mural'
  | 'ajuda'
  | 'voltar'
  | `parent-${number}`

export interface GuideWelcomeStep {
  id: GuideWelcomeStepId
  emoji: string
  /** Título curto do passo, quando a tela mostra um (o guia dos pais em `/pais`). */
  title?: string
  text: string
  /** Um link no fim da frase (o "Como fazer"): destino interno e o texto do link. */
  link?: { href: string; label: string }
}

type ChildWelcomeInput = Pick<ChildGuideInput, 'hasAvatar' | 'hasCourseActivity' | 'startAvailable'>

/**
 * Passos que viram BALÃO na tela depois que a modal fecha. O resto é explicação: fica só
 * dentro da modal e não aponta para lugar nenhum.
 */
const ACTION_STEP_IDS = new Set<GuideWelcomeStepId>(['avatar', 'start'])

/** Há alguma AÇÃO a guiar (≠ só explicação)? Decide o auto-abrir e o texto do botão. */
export function hasActionableWelcomeStep(steps: readonly GuideWelcomeStep[]): boolean {
  return steps.some((step) => ACTION_STEP_IDS.has(step.id))
}

/**
 * O que a criança lê no "Como funciona": as AÇÕES que ainda faltam (avatar, primeira aula)
 * seguidas da explicação FIXA do app.
 *
 * ⚠️ O miolo fixo é o conserto de 14/08. Antes só existiam os passos condicionais, então a
 * criança que já tinha avatar e já tinha estudado abria o "Como funciona", lia uma linha
 * sobre XP, apertava "Vamos lá" e não acontecia nada — o botão prometia uma explicação que
 * o app não tinha. Agora a explicação existe sempre, e os passos condicionais só entram na
 * frente quando fazem sentido.
 *
 * Sem numeração de propósito: com 5 a 7 itens, "1️⃣2️⃣3️⃣" acaba e vira ⭐ no meio da lista.
 */
export function childWelcomeSteps(input: ChildWelcomeInput): readonly GuideWelcomeStep[] {
  const steps: GuideWelcomeStep[] = []
  if (input.hasAvatar === false) {
    steps.push({
      id: 'avatar',
      emoji: '😎',
      text: 'Monte o seu avatar do seu jeito: cabelo, roupa, tudo!',
    })
  }
  if (input.startAvailable && !input.hasCourseActivity) {
    steps.push({
      id: 'start',
      emoji: '▶️',
      text: 'Toque em "Começar" e a sua primeira fase abre na hora.',
    })
  }
  steps.push(
    {
      id: 'aulas',
      emoji: '🧭',
      text: 'As suas aventuras ficam em Explorar. Assista, jogue, crie e conclua cada fase.',
    },
    {
      id: 'xp',
      emoji: '⚡',
      text: 'Cada fase te dá XP e mantém o seu foguinho aceso mais um dia.',
    },
    {
      id: 'criar',
      emoji: '🎮',
      text: 'No Estúdio você monta os seus próprios jogos, do seu jeito.',
    },
    {
      id: 'mural',
      emoji: '🌟',
      text: 'Publique o seu jogo no Mural e a turma inteira pode jogar.',
    },
    {
      id: 'jornada',
      emoji: '🗺️',
      text: 'Terminou uma aventura e publicou o jogo? O mapa mostra o seu progresso na jornada.',
    },
    // A biblioteca de ajuda (26/09/2026): consulta, não onboarding. O guia só aponta a porta.
    {
      id: 'ajuda',
      emoji: '❓',
      text: 'Ficou com dúvida de como fazer alguma coisa? O passo a passo está no',
      link: { href: '/como-fazer', label: 'Como fazer' },
    },
    {
      id: 'voltar',
      emoji: '👋',
      text: 'Quando voltar, abra a comunidade neste mesmo navegador e escolha seu nome. Se o acesso vencer, peça ao responsável para renovar.',
    },
  )
  return steps
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
  // Os títulos e os nomes entre aspas são os rótulos REAIS da tela (`/pais` e o painel de
  // aparelhos). Sem criança cadastrada, o primeiro passo é adicionar, não escolher.
  return [
    {
      id: 'parent-1',
      emoji: '1️⃣',
      title: profilesCount > 0 ? '1. Escolha a criança' : '1. Adicione a criança',
      text:
        profilesCount > 0
          ? 'Escolha o perfil que já existe. O progresso continua guardado.'
          : canCreateProfile
            ? 'Use "Adicionar criança" e coloque o nome dela. A data de nascimento é opcional.'
            : 'Confira o acesso da família antes de adicionar um perfil.',
    },
    {
      id: 'parent-2',
      emoji: '2️⃣',
      title: '2. Autorize o aparelho',
      text: 'Em "Acesso nos aparelhos", clique em "Autorizar aparelho". Escolha "Neste aparelho" ou "Em outro aparelho" e o prazo, e clique em "Autorizar este aparelho" ou "Gerar código".',
    },
    {
      id: 'parent-3',
      emoji: '3️⃣',
      title: '3. A criança entra',
      text: 'No aparelho autorizado, a criança entra em "Eu sou aluno" e escolhe o próprio perfil. Se vocês usam este computador, clique antes em "Ir para a área do aluno".',
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
export const PARENT_ACCESS_GUIDE_VERSION = 'v3'
const guideKey = (audience: 'parent' | 'child', viewerId: string, flag: string) =>
  `sz:kids:onboarding:${audience === 'parent' ? PARENT_ACCESS_GUIDE_VERSION : GUIDE_VERSION}:${audience}:${viewerId}:${flag}`

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
