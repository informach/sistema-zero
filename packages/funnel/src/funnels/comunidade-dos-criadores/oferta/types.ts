/**
 * As páginas de oferta da Comunidade Kids (20/10/2026): `9a17` em `/oferta`, `criar-junto` (menor
 * de 9, criando com o responsável) e `continuar` (a família que já começou na plataforma). As cinco
 * páginas de perfil de antes redirecionam para `/oferta` (`COMUNIDADE_OFERTAS_ANTIGAS`).
 */
export type ComunidadeOfertaId = '9a17' | 'criar-junto' | 'continuar'

export interface ComunidadeAction {
  label: string
  href: string
}

export interface ComunidadeGroup {
  title: string | null
  paragraphs: string[]
  comparison?: { headers: string[]; rows: string[][] }
}

export interface ComunidadeSection {
  id: string
  title: string
  eyebrow: string
  /**
   * `cases`: uma carta por situação (grupo com subtítulo), ligadas como etapas de um percurso.
   * `relatos`: a faixa de relatos; as falas de `falas` viram cartas com retrato.
   */
  layout: 'story' | 'cards' | 'band' | 'journey' | 'tools' | 'cases' | 'relatos'
  visuals: string[]
  groups: ComunidadeGroup[]
  /** Relatos reais (`relatos.ts`): a faixa em `relatos`; nas demais, a fala solta do fim da seção. */
  falas?: readonly RelatoId[]
  actions: ComunidadeAction[]
}

/** Uma fala real, com as palavras de quem disse (cartelas do Instagram e trechos conferidos). */
export interface Relato {
  fala: string
  nome: string
  /** "Aluno", "Aluna" ou a relação do responsável com a criança. */
  papel: string
  /** Tema editorial ou curso do relato; fica fora das aspas. */
  contexto: string
  retrato: string
}

export type RelatoId =
  | 'AV02'
  | 'AV03'
  | 'AV04'
  | 'AV06'
  | 'AV07'
  | 'AV08'
  | 'AV09'
  | 'AV10'
  | 'AV11'
  | 'AV12'
  | 'N1'
  | 'N2'
  | 'N4'
  | 'N5'
  | 'N6'
  | 'N7'
  | 'N8'
  | 'N9'
  | 'N11'
  | 'N12'
  | 'N13'
  | 'N14'
  | 'N15'
  | 'N16'
  | 'N17'
  | 'N18'
  | 'N19'

/** Uma captura REAL do kids em staging (1x e @2x, mesma proporção). */
export interface ComunidadeFrame {
  file: string
  retina: string
  alt: string
  /** O nome que a própria tela mostra (área, etapa ou botão): rótulo do passo e da miniatura. */
  label: string
  width: number
  height: number
}

export interface ComunidadeVisual {
  /** Uma tela, ou as telas do mesmo projeto na ordem em que acontecem. */
  frames: ComunidadeFrame[]
  caption: string
  /** `steps`: uma tela leva à outra (numeradas). `set`: telas da mesma área, sem ordem. */
  mode?: 'steps' | 'set'
}
