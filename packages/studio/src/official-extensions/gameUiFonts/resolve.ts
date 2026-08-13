/**
 * Descobre QUAL fonte o projeto escolheu, antes de o jogo rodar.
 *
 * ⚠️ Por que precisa ser estático: os bytes da fonte são carregados sob demanda (um
 * chunk por fonte) e quem monta o documento precisa decidir o que injetar ANTES de o
 * runtime existir. Um `useFont` em tempo de execução chegaria tarde demais — e é por
 * isso que o `useFont` do runtime é uma verificação, não um setter.
 */
import { DEFAULT_GAME_UI_FONT, type GameUiFontId, gameUiFontIdOrDefault } from './catalog'

/** Os dois tipos de IR que declaram a escolha, um por extensão. */
const TIPOS = new Set(['g2d:useFont', 'gk:useFont'])

/**
 * O ÚLTIMO vence — é a semântica de execução, e é o que a criança espera quando
 * arrasta um segundo bloco por cima do primeiro.
 *
 * ⚠️ Pilha explícita e `WeakSet`, não recursão: a IR de um exemplo grande passa de
 * 30 mil nós (o Reino Zero tem 32 grades), e recursão aqui estouraria a pilha.
 */
function daIR(raiz: unknown): string | null {
  let achado: string | null = null
  const vistos = new WeakSet<object>()
  const pilha: unknown[] = [raiz]
  while (pilha.length) {
    const atual = pilha.pop()
    if (!atual || typeof atual !== 'object') continue
    if (vistos.has(atual)) continue
    vistos.add(atual)
    // ⚠️ Empilha ao CONTRÁRIO: a pilha é LIFO, então empilhar na ordem natural faria
    // a varredura visitar de trás para frente — e "o último vence" passaria a
    // devolver o PRIMEIRO bloco. Foi o que o teste pegou.
    if (Array.isArray(atual)) {
      for (let i = atual.length - 1; i >= 0; i -= 1) pilha.push(atual[i])
      continue
    }
    const node = atual as Record<string, unknown>
    if (typeof node.type === 'string' && TIPOS.has(node.type) && typeof node.font === 'string') {
      achado = node.font
    }
    const filhos = Object.values(node)
    for (let i = filhos.length - 1; i >= 0; i -= 1) pilha.push(filhos[i])
  }
  return achado
}

/**
 * Rede para quando a IR não está disponível: snapshot antigo sem `ir`, hidratação
 * dos blocos ainda pendente, ou o projeto vindo serializado do Mural. O `script.js`
 * é o artefato que de fato RODA e sempre existe.
 */
const CHAMADA = /(?:SZGame2D|SZGameKit)\.useFont\(\s*['"]([A-Za-z0-9]+)['"]\s*\)/g

function doCodigo(codigo: unknown): string | null {
  if (typeof codigo !== 'string' || !codigo) return null
  let achado: string | null = null
  CHAMADA.lastIndex = 0
  for (;;) {
    const casou = CHAMADA.exec(codigo)
    if (!casou) break
    achado = casou[1] ?? achado
  }
  return achado
}

export interface ProjetoComFonte {
  ir?: unknown
  // ⚠️ Só o arquivo que interessa: `ProjectFiles` tem chaves FIXAS (sem index
  // signature), então pedir `Record<string, string>` recusaria o projeto de verdade.
  files?: { 'script.js'?: string } | undefined
}

/**
 * O id da fonte do projeto. Sem bloco (ou com escolha que não dá para ler de fora),
 * devolve o padrão — e aí a saída fica indistinguível de um projeto que escolheu a
 * fonte padrão de propósito.
 */
export function resolveGameUiFontId(projeto: ProjetoComFonte | null | undefined): GameUiFontId {
  if (!projeto) return DEFAULT_GAME_UI_FONT
  const daArvore = daIR(projeto.ir)
  if (daArvore !== null) return gameUiFontIdOrDefault(daArvore)
  return gameUiFontIdOrDefault(doCodigo(projeto.files?.['script.js']))
}
