// Configuração compartilhada entre o driver e o harness.

export const HARNESS_PORT = 5273
export const HARNESS_HOST = '127.0.0.1'
export const HARNESS_URL = `http://${HARNESS_HOST}:${HARNESS_PORT}`

/** Resolução da gravação da tela (16:9). */
export const TELA_LARGURA = 1280
export const TELA_ALTURA = 720

/** Ritmo didático (ms). Lento de propósito — a criança precisa acompanhar. */
export const RITMO = {
  /** Movimento do cursor entre dois pontos. */
  cursorMs: 900,
  /** Pausa após abrir uma categoria (a criança lê os blocos). */
  aposCategoriaMs: 800,
  /** Pausa após encaixar um bloco. */
  aposEncaixeMs: 700,
  /** Pausa após configurar um campo. */
  aposCampoMs: 600,
  /** Quanto tempo um balão fica na tela. */
  balaoMs: 2600,
  /** Duração padrão do "testar" (rodar o preview). */
  testarMs: 2500,
} as const
