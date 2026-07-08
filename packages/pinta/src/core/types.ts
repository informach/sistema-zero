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
  /** Missão de arte do Pensa: abre a criação pré-configurada 1x no mount. */
  initialIntent?: PintaInitialIntent
}
