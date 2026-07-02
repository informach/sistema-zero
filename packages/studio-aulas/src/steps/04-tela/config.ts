// Configuração da gravação. Grava no PLAYGROUND REAL do Estúdio (packages/studio,
// `bun run --filter @sistemazero/studio dev`, porta 5173) — a automação é injetada
// nele via /@fs/ do Vite. Não há app/harness próprio.

export const PLAYGROUND_PORT = 5173
export const PLAYGROUND_HOST = '127.0.0.1'
export const PLAYGROUND_URL = `http://${PLAYGROUND_HOST}:${PLAYGROUND_PORT}`

/** Resolução da gravação (16:9). */
export const TELA_LARGURA = 1280
export const TELA_ALTURA = 720

/** Ritmo didático (ms). Lento de propósito — a criança precisa acompanhar. */
export const RITMO = {
  cursorMs: 900,
  aposCategoriaMs: 800,
  aposEncaixeMs: 800,
  aposCampoMs: 700,
  /** Quanto tempo um balão fica na tela. */
  balaoMs: 2800,
  /** Duração padrão do "testar" (mostra o preview, roda, esconde). */
  testarMs: 3000,
} as const
