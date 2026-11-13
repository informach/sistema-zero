/**
 * O catálogo do avatar (pack Cute Characters mais as peças que a arte faz para completar).
 *
 * O arquivo `catalog.generated.ts` é DADO: quem o escreve é `scripts/avatar/migrar.ts`, a partir
 * do repositório privado da arte. Ele é também o REGISTRO do que já foi migrado: cada peça guarda
 * de onde veio (`origin`). Nenhum arquivo do pack entra neste repositório, que é público: aqui só
 * ficam ids, rótulos, preços e os nomes dos arquivos no bucket.
 */

/** Para quem a peça aparece no filtro do configurador. Só o óbvio é marcado; o resto é `both`. */
export type AvatarAudience = 'girl' | 'boy' | 'both'

/**
 * Como a peça entra na vida da criança:
 * - `free`: de todo mundo;
 * - `coins`: comprada com moedas Zappy;
 * - `festa`: só a festa do jogo concede;
 * - `set`: parte de um conjunto (fantasia); quem se compra é o conjunto;
 * - `auto`: entra sozinha com outra peça (as orelhas, com a cor do corpo).
 */
export type AvatarTier = 'free' | 'coins' | 'festa' | 'set' | 'auto'

export type AvatarPriceBand = 'comum' | 'especial' | 'raro' | 'fantasia'

/** De onde a peça veio na arte. É o que diz se ela já foi migrada e se mudou desde então. */
export interface AvatarPartOrigin {
  /** Id do blob do GLB no git da arte: muda quando o arquivo muda. */
  blob: string
  /** Id do blob da miniatura. */
  thumbBlob: string
  /** Commit da arte lido na migração. */
  commit: string
  /** Dia da migração (AAAA-MM-DD). */
  migratedAt: string
}

export interface AvatarPartEntry {
  slot: string
  group: string
  label: string
  audience: AvatarAudience
  tier: AvatarTier
  /** Moedas; 0 quando não se compra a peça sozinha. */
  price: number
  band?: AvatarPriceBand
  /** Caminho no bucket, a partir da pasta do avatar. */
  file: string
  thumb: string
  tris: number
  /** Cor de amostra (só os corpos). */
  swatch?: string
  /** As orelhas que entram com este corpo. */
  ears?: string
  /** Rosto: o desenho (`fem_01`…) e a expressão. */
  face?: { set: string; expression: string }
  /** Parte de fantasia: o conjunto dela. */
  set?: string
  /** Festa do jogo que dá a peça como prêmio. */
  festa?: string
  /** Não aparece na loja nem no sorteio (rascunho da arte ou peça substituída por outra). */
  hidden?: boolean
  /** Preço e marca vieram da regra automática e ainda não foram conferidos. */
  review?: boolean
  /** Saiu da arte depois de migrada: quem tem continua com ela, mas ela some da loja. */
  retired?: boolean
  origin: AvatarPartOrigin
}

export interface AvatarSetEntry {
  label: string
  parts: { slot: string; part: string }[]
  tier: 'coins' | 'festa'
  price: number
  review?: boolean
}

export interface AvatarSlotRule {
  id: string
  label: string
  required: boolean
  groups: string[]
}

export interface AvatarDrawStep {
  group: string
  probability: number
  /** Grupos que continuam liberados depois deste ligar; `null` = não restringe. */
  compatible: string[] | null
  unlocks?: string
  unlockChance?: number
  /** O `unlocks` só vale se nenhum destes grupos ligou antes. */
  unlocksUnlessOn?: string[]
}

export interface AvatarRules {
  slots: AvatarSlotRule[]
  /** Grupo → peças, na ordem do pack. ⚠️ O grupo `fantasia` lista CONJUNTOS (ids de `sets`). */
  groups: Record<string, { label: string; parts: string[] }>
  /** Encaixes que a fantasia desliga; qualquer outro encaixe, ligado, desliga a fantasia. */
  setDisables: string[]
  /** Peça → peças com que ela não combina (vale nos dois sentidos). */
  incompatible: Record<string, string[]>
  earsByBody: Record<string, string>
  draw: { steps: AvatarDrawStep[]; excluded: string[] }
  /** Rostos: desenho → expressão → peça. */
  faces: Record<string, Record<string, string>>
  expressions: Record<string, string>
  festas: Record<string, { label: string; prize: string; themed: string[] }>
  /** O avatar de partida do pack. */
  default: Record<string, string>
}

export interface AvatarBaseFiles {
  /** Esqueleto com as poses do configurador. */
  skeleton: { file: string; blob: string; clips: string[] }
  /** Texturas compartilhadas pelas peças: impressão digital → arquivo. */
  textures: Record<string, string>
}

export interface AvatarCatalog {
  version: 1
  source: { repo: string; ref: string; commit: string; syncedAt: string; rulesBlob: string }
  base: AvatarBaseFiles
  parts: Record<string, AvatarPartEntry>
  sets: Record<string, AvatarSetEntry>
  rules: AvatarRules
}
