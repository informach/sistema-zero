import { setOnDemandMountingForTests } from '../src/blockly/offscreenThreshold'

// A lista inicial carrega antes do editor. Guarde os parâmetros de demonstração
// aqui para a importação tardia do editor não lê-los depois do pushState.
const initialQuery = new URLSearchParams(window.location.search)

// `&montagem=inteira` (lote 3, comparação de dois braços do `scripts/measure-classic-opening.mjs`):
// o projeto grande abre pelo caminho dos pequenos, sem a abertura adiada nem a montagem sob
// demanda. Pelo caminho RELATIVO, como o `?autosave-ms=`: é o mesmo módulo que o editor usa, e ele
// não importa nada. Sem o parâmetro, nada muda.
if (initialQuery.get('montagem') === 'inteira') setOnDemandMountingForTests(false)

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
        // `&forma=sequencia` (lote 3, conserto B): em vez de repetir eventos curtos, põe a escala
        // numa sequência ÚNICA de instruções no corpo do primeiro evento.
        forma:
          initialQuery.get('forma') === 'sequencia' ? ('sequencia' as const) : ('jogo' as const),
        // `&marca=1` (lote 3, "Procurar no programa"): um bloco com o texto "marca do fim" no corpo
        // do último evento repetido, lá na cauda que nasce sem desenho.
        marca: initialQuery.get('marca') === '1',
      }
    : null

// `?casca=1` (lote 3.2): a prévia do Clássico roda dentro da casca servida pelo próprio servidor
// do playground na OUTRA origem local (127.0.0.1 ⇄ localhost são sites diferentes). Só testes.
const outroHost = window.location.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
export const PLAYGROUND_PREVIEW_SHELL_URL =
  initialQuery.get('casca') === '1'
    ? `${window.location.protocol}//${outroHost}:${window.location.port}/v1/classic-shell/1.html`
    : undefined
