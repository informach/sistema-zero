/**
 * Contrato público entre o <PintaApp> e o HOST (community-kids). O Pinta não
 * conhece o Estúdio nem faz rede: capabilities entram por callbacks opcionais
 * — ausentes, a UI degrada escondendo o recurso (mesmo padrão do Pensa).
 */
import type { PintaProjectRef } from './project'

/** Uma animação nomeada da folha (from/to = índices row-major na folha inteira). */
export interface PintaSpriteAnimMeta {
  name: string
  from: number
  to: number
  fps: number
  loop: boolean
}

/** Metadados de SPRITESHEET que atravessam a ponte (quadro + animações nomeadas). */
export interface PintaSpriteMeta {
  frameW: number
  frameH: number
  animations: PintaSpriteAnimMeta[]
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
 * Intent inicial vindo do PENSA (07/2026): abre o "Criar novo" pré-configurado
 * com o vínculo de projeto (agrupamento + paleta). `artKind` sugere o TIPO
 * (personagem/cenário/peças); a criança ainda escolhe o estilo (pixel/vetor).
 */
export interface PintaInitialIntent {
  projectRef: PintaProjectRef
  artKind?: 'sprite' | 'background' | 'tileset'
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
   */
  resyncToStudio?: (asset: PintaExportedAsset) => Promise<{ updated: boolean }>

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
}
