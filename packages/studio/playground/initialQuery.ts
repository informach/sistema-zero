// A lista inicial carrega antes do editor. Guarde os parâmetros de demonstração
// aqui para a importação tardia do editor não lê-los depois do pushState.
const initialQuery = new URLSearchParams(window.location.search)

export const PLAYGROUND_DEMO_MISSION = initialQuery.get('missao')
export const E2E_AUTOSAVE_MS = Number(initialQuery.get('autosave-ms'))

// `/aula?aula=<curso>/<aula>&bloco=<chave>`: monta o Estúdio de uma aula dos cursos gravados
// (ver `lessonHarness.tsx`). Sem o parâmetro, nada muda.
const aula = initialQuery.get('aula')
export const PLAYGROUND_LESSON =
  window.location.pathname === '/aula' && aula ? { aula, bloco: initialQuery.get('bloco') } : null
