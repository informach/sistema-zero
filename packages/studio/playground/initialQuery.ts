// A lista inicial carrega antes do editor. Guarde os parâmetros de demonstração
// aqui para a importação tardia do editor não lê-los depois do pushState.
const initialQuery = new URLSearchParams(window.location.search)

export const PLAYGROUND_DEMO_MISSION = initialQuery.get('missao')
export const E2E_AUTOSAVE_MS = Number(initialQuery.get('autosave-ms'))

// `/aula?aula=<curso>/<aula>&bloco=<chave>`: monta o Estúdio de uma aula dos cursos gravados
// (ver `lessonHarness.tsx`). Sem o parâmetro, nada muda.
const aula = initialQuery.get('aula')
export const PLAYGROUND_LESSON =
  window.location.pathname === '/aula' && aula
    ? {
        aula,
        bloco: initialQuery.get('bloco'),
        // `&escala=2000`: repete os eventos do projeto até passar desse número de blocos (para o
        // perfil de escala, `e2e/classic-scale.spec.ts`). Sem ele, o projeto é o da aula.
        escala: Number(initialQuery.get('escala')) || 0,
      }
    : null
