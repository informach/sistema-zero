/**
 * Contrato público entre o <PintaApp> e o HOST (community-kids). O Pinta não
 * conhece o Estúdio nem faz rede: capabilities entram por callbacks opcionais
 * — ausentes, a UI degrada escondendo o recurso (mesmo padrão do Pensa).
 */
import type { PintaAsset, PintaProjectRef } from './project'

/** Uma animação nomeada da folha (from/to = índices row-major na folha inteira). */
export interface PintaSpriteAnimMeta {
  name: string
  from: number
  to: number
  fps: number
  loop: boolean
}

/** Metadados de SPRITESHEET que atravessam a ponte (quadro + animações nomeadas). */
/**
 * Caixa de colisão tirada do DESENHO, em FRAÇÃO do quadro (0..1).
 *
 * Fração e não pixel porque o mesmo desenho entra no jogo em qualquer tamanho.
 * União de TODOS os quadros: por quadro, a caixa pulsaria com a animação.
 */
export interface PintaSpriteHitbox {
  x: number
  y: number
  w: number
  h: number
}

export interface PintaSpriteMeta {
  frameW: number
  frameH: number
  animations: PintaSpriteAnimMeta[]
  /** OMITIDA quando o desenho preenche o quadro inteiro (payload byte-idêntico). */
  hitbox?: PintaSpriteHitbox
}

/** Metadados de TILESET que atravessam a ponte (tamanho + índices sólidos). */
export interface PintaTilesetMeta {
  tileSize: number
  solid: number[]
  /** Índices de peça PLATAFORMA (one-way). Omitido quando vazio (retrocompat). */
  platform?: number[]
}

/**
 * Metadados de MAPA DE TILES que atravessam a ponte: a grade jogável + a folha
 * de peças EMBUTIDA (auto-contida — a criança pode nunca ter enviado o tileset
 * separado). Mesmo shape do `ProjectTilemapMeta` do Estúdio (o dono do formato,
 * que re-sanitiza na chegada).
 */
export interface PintaTilemapMeta {
  tileSize: number
  cols: number
  rows: number
  /** Formato do bloco do Estúdio: células por espaço, linhas por `;`, `.` = vazio. */
  grid: string
  solid: number[]
  /** Índices de peça PLATAFORMA (one-way). Omitido quando vazio (retrocompat). */
  platform?: number[]
  /**
   * Grade SÓ das camadas "da frente" (desenhadas por cima do jogador). Mesmo
   * formato do `grid`. Omitida quando o mapa não tem camada de frente. O Jogo 2D
   * Avançado (gk) desenha essa grade na opção "frente" do "Desenhar o mapa".
   */
  frontGrid?: string
  tileset: { dataUrl: string; width: number; height: number }
}

export interface PintaExportedAsset {
  /** Id do desenho no Pinta — reenvio do mesmo desenho = upsert no destino. */
  id: string
  /** Nome kebab-case (vira o nome que os blocos do Estúdio referenciam). */
  name: string
  /** PNG como `data:image/png;base64,...`. */
  dataUrl: string
  width: number
  height: number
  /**
   * Metadados de SPRITESHEET (quando o asset é um sprite animado): o Estúdio usa
   * para o SELETOR de animação por nome no bloco "Animar sprite" (a criança escolhe
   * "andar"/"pular" em vez de digitar os índices). Ausente = fallback manual.
   */
  sprite?: PintaSpriteMeta
  /** Metadados de TILESET (quando o asset é um tileset): seletor de tiles sólidos. */
  tileset?: PintaTilesetMeta
  /**
   * Metadados de MAPA (quando o asset é um tilemap): grade + folha embutida —
   * o bloco "Criar mapa do meu desenho" do Estúdio monta tudo sozinho.
   */
  tilemap?: PintaTilemapMeta
  /**
   * Só mapas com camada "da frente": a grade das camadas desenhadas POR CIMA do
   * jogador (copa de árvore, telhado). Usado pelo "Jogar meu mapa".
   */
  tilemapFront?: PintaTilemapMeta
}

export interface PintaSendResult {
  ok: boolean
  /** Nome final no destino (pode ganhar sufixo em colisão). */
  name?: string
  /** Mensagem de erro amigável quando `ok: false`. */
  error?: string
}

/**
 * Resultado do REENVIO automático ao Estúdio (`resyncToStudio`), espelho do
 * `MoldaStudioResyncResult`. `reason` é OPCIONAL de propósito: o host que só
 * devolve `{updated: false}` (o desenho não está na biblioteca) continua valendo;
 * só `'failed'` (com `error` opcional) vira aviso para a criança.
 */
export type PintaStudioResyncResult =
  | { updated: true }
  | { updated: false; reason?: 'not-linked' | 'failed'; error?: string }

/**
 * Intent inicial vindo do PENSA (07/2026): abre o "Criar novo" pré-configurado
 * com o vínculo de projeto (agrupamento + paleta). `artKind` sugere o TIPO
 * (personagem/cenário/peças); a criança ainda escolhe o estilo (pixel/vetor).
 */
export interface PintaInitialIntent {
  projectRef: PintaProjectRef
  artKind?: 'sprite' | 'background' | 'tileset' | 'tilemap'
  style?: 'pixel' | 'vector' | 'either'
}

export interface PintaTaskGuideItem {
  id: string
  text: string
  hint?: string
  required: boolean
}
export interface PintaTaskSession {
  taskId: string
  project: { id: string; name: string }
  cycle: { id: string; number: number; goal: string | null }
  title: string
  summary: string | null
  brief: {
    /** Item correspondente no inventário da Bíblia Visual. */
    assetId: string
    artKind: 'sprite' | 'background' | 'tileset' | 'tilemap'
    style: 'pixel' | 'vector' | 'either'
    preset?: string
    palette: Array<{ role: string; color: string }>
    appearance: string
    animations: string[]
    states: string[]
    usage: string
    requiresStudioUse: boolean
  }
  guide: { steps: PintaTaskGuideItem[]; criteria: PintaTaskGuideItem[] }
  /** Explicação do host quando o cartão exige a ponte, mas o Estúdio não foi liberado. */
  studioUseBlockedReason?: string
  progress: {
    status: 'planned' | 'in_progress' | 'completed'
    completedStepIds: string[]
    completedCriteriaIds: string[]
    startedAt: string | null
    completedAt: string | null
    updatedAt: string | null
    outputRef: {
      kind: 'pinta_asset'
      assetId: string
      assetName?: string
      usedInStudioAt?: string
    } | null
  }
  onProgress(input: {
    status?: 'in_progress' | 'completed'
    completedStepIds?: string[]
    completedCriteriaIds?: string[]
    outputRef?: {
      kind: 'pinta_asset'
      assetId: string
      assetName?: string
      usedInStudioAt?: string
    }
  }): Promise<void>
}

export interface PintaHostAdapter {
  /** Tema fixado pelo host; ausente = claro (default kids). */
  theme?: 'light' | 'dark'
  /**
   * A criança tem o Estúdio Completo? Só muda a COPY do sucesso da ponte
   * ("já está lá" vs "quando o Estúdio for liberado, seu desenho estará lá").
   */
  studioOwned?: boolean
  /** Navega para o Estúdio (link no sucesso da ponte). */
  onOpenStudio?: () => void
  /**
   * Guarda o desenho na biblioteca pessoal que o Estúdio lê ("Meus desenhos").
   * Ausente = o botão "Usar no Estúdio" não aparece.
   */
  sendToStudio?: (asset: PintaExportedAsset) => Promise<PintaSendResult> | PintaSendResult
  /**
   * REENVIO automático ao salvar (08/2026) — o outro lado do botão "Editar" do
   * Estúdio: a criança abre o desenho pelo jogo, ajusta, e o jogo se atualiza
   * sozinho. Chamado ao parar de desenhar (e ao sair/trocar de aba).
   *
   * ⚠️ Só atualiza o que JÁ foi enviado uma vez: o HOST devolve
   * `{updated:false}` quando o desenho não está na biblioteca do Estúdio. Sem
   * essa regra, todo rascunho cairia lá sozinho e o "Usar no Estúdio" deixaria
   * de ser a decisão explícita que é hoje. Ausente = nada acontece.
   * `{updated:false, reason:'failed'}` (ou a promise rejeitada) = a ponte
   * FALHOU de verdade: o Pinta avisa a criança para salvar de novo.
   */
  resyncToStudio?: (asset: PintaExportedAsset) => Promise<PintaStudioResyncResult>

  /**
   * "Jogar meu mapa" (só mapas): o host cria um PROJETO-JOGO completo e jogável
   * no Estúdio a partir do mapa (jogador + colisão + câmera montados). Ausente =
   * o botão não aparece.
   */
  sendGameToStudio?: (asset: PintaExportedAsset) => Promise<PintaSendResult> | PintaSendResult
  /** Missão de arte do Pensa: abre a criação pré-configurada 1x no mount. */
  initialIntent?: PintaInitialIntent
  /**
   * Abre DIRETO um desenho da galeria, 1x no mount — o destino do botão
   * "Editar" do Estúdio, que chega numa aba nova por `/pinta?desenho=<id>`.
   * Aplicado só DEPOIS que a galeria carrega (o editor recusa um id que ele
   * ainda não conhece); desenho apagado cai na galeria com um recado gentil.
   */
  initialAssetId?: string
  /** Sessão desacoplada do Pensa, restaurada pelo host a partir de `?tarefa=`. */
  taskSession?: PintaTaskSession
  /**
   * Avisa a cada revisão CONFIRMADA do desenho aberto (o autosave já gravou).
   *
   * ⭐ É por aqui que o host persiste no backend, e por isso ele dispara TAMBÉM quando a
   * persistência local é a de memória (`persistence: 'none'`) — sem isso o bloco de aula não
   * teria o que enviar ao professor. Mesmo contrato do `onChange` do Estúdio.
   *
   * ⚠️ Abrir um desenho NÃO dispara: só edição dispara.
   */
  onChange?: (asset: PintaAsset) => void
  /**
   * Curadoria da CAIXA DE FERRAMENTAS: lista NÃO-VAZIA mostra só esses ids, ausente ou vazia
   * mostra tudo (o Pinta solto nunca cura). É o `allowBlocks` do Estúdio aplicado à caixa —
   * ver `core/toolCuration.ts`, que também traz os presets e a regra da ferramenta ativa.
   */
  allowTools?: readonly string[]
}

/**
 * Chrome do HOST dentro da barra do Pinta (07/09/2026): o botão de esconder o menu lateral
 * da comunidade e o selo "Guardado na sua conta". Espelho ESTRUTURAL do `HostChrome` do
 * community-kids (zero import entre pacotes) — só dados, nunca elemento React: o Pinta
 * desenha com os próprios botões e tons. Chega pelo `PintaHostChromeProvider` (exportado),
 * que o host renderiza em volta do `<PintaApp>`; sem Provider (aula, playground) é `null`.
 */
export interface PintaHostChromeMenu {
  /** Menu escondido = `aria-pressed` do botão. */
  hidden: boolean
  /** `aria-label` ('Esconder menu' | 'Mostrar menu'). Nunca vira `title`. */
  label: string
  onToggle: () => void
}

export interface PintaHostChromeStatus {
  tone: 'muted' | 'ok' | 'warn' | 'danger'
  icon: 'upload' | 'download' | 'cloud' | 'offline' | 'alert'
  /** Curto, para a barra do editor. */
  label: string
  /** A frase inteira (cabeçalho da galeria e `title`). */
  text: string
}

/**
 * A seta da GALERIA de volta à seção do host (11/09/2026: "← Criar"). Só a galeria desenha;
 * o editor já volta para a galeria pela seta dele. É um `<a href>`: o clique simples chama
 * `onNavigate` (navegação do host) e o com Ctrl/Cmd/do meio fica com o navegador.
 */
export interface PintaHostChromeBack {
  /** O nome curto, visível ao lado da seta ("Criar"). */
  text: string
  /** O nome acessível inteiro ("Voltar para Criar"); CONTÉM o `text`. Nunca vira `title`. */
  label: string
  href: string
  onNavigate: () => void
}

/**
 * A nuvem da CONTA está ligada (11/09/2026). A galeria mostra a pílula `label` em repouso,
 * quando o `status` não tem nada a dizer, e conta os desenhos "na sua conta" em vez de
 * "neste aparelho". O editor não lê este campo (ali só o `status` fala).
 */
export interface PintaHostChromeAccount {
  label: string
}

export interface PintaHostChrome {
  menu: PintaHostChromeMenu | null
  status: PintaHostChromeStatus | null
  back: PintaHostChromeBack | null
  account: PintaHostChromeAccount | null
}
