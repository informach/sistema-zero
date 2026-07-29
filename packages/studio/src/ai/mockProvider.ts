import type { IDEMode } from '#core'
import type { SZIRV2 } from '#ir'
import type {
  AIChallengeLevel,
  AIFreeFormRequest,
  AIProvider,
  AIRequestOptions,
  ProjectContext,
} from './contracts'

/**
 * Mock pedagógico. **Não** chama nenhum serviço externo. Responde com
 * mensagens estáticas adaptadas pelo modo da IDE, apenas para demonstrar a
 * UX do painel de IA.
 *
 * No futuro, substituir por uma implementação que chame a Claude API
 * (com prompt caching) ou OpenAI atrás da mesma interface.
 */
export class MockAIProvider implements AIProvider {
  async explainSelectedBlock(
    _blockJson: object,
    mode: IDEMode,
    _options?: AIRequestOptions,
  ): Promise<string> {
    return tone(
      mode,
      'Esse bloco é uma instrução visual que vira código quando o programa roda.',
      'No modo Ponte você pode comparar este bloco com a linha de código equivalente à direita.',
      'No modo Código, edite diretamente a linha gerada por este bloco.',
    )
  }
  async explainSelectedCode(
    _code: string,
    lang: 'html' | 'css' | 'js',
    mode: IDEMode,
    _options?: AIRequestOptions,
  ): Promise<string> {
    return tone(
      mode,
      `Esse trecho de ${lang.toUpperCase()} pode estar marcado como Código avançado.`,
      'Como estamos no modo Ponte, compare com os blocos: se não houver bloco equivalente, é porque o subset suportado não inclui este padrão.',
      'Como par programador, eu sugeriria revisar nomes e isolar efeitos colaterais.',
    )
  }
  async explainError(
    err: { message: string; stack?: string },
    _options?: AIRequestOptions,
  ): Promise<string> {
    return `Erro detectado no preview:\n\n> ${err.message}\n\n(Mock) A explicação real virá quando a IA estiver conectada.`
  }
  async suggestNextStep(context: ProjectContext, _options?: AIRequestOptions): Promise<string> {
    const hasCanvas = context.ir?.html.some((n) => n.type === 'canvas') ?? false
    if (!hasCanvas && context.installedExtensions.includes('game-2d')) {
      return 'Você instalou Jogo 2D mas ainda não criou um canvas. Adicione o bloco "Criar canvas" para começar.'
    }
    return 'Mock: experimente trocar para o modo Ponte e ver como cada bloco vira código.'
  }
  async generateChallenge(level: AIChallengeLevel, _options?: AIRequestOptions): Promise<string> {
    if (level === 'iniciante')
      return 'Desafio iniciante: crie um botão que, ao clicar, mostra "Olá Mundo!" no console.'
    return 'Desafio intermediário: faça um contador que aumenta a cada clique e mostra o valor na tela.'
  }
  async refactorCode(
    code: string,
    _lang?: 'html' | 'css' | 'js',
    _options?: AIRequestOptions,
  ): Promise<string> {
    return `// Mock — refatoração real virá em fase futura.\n${code}`
  }
  async convertIdeaToBlocks(_idea: string, _options?: AIRequestOptions): Promise<SZIRV2> {
    return {
      version: 2,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [] },
      extensions: [],
    }
  }
  async ask(req: AIFreeFormRequest): Promise<string> {
    const text = `(Mock) Recebi: "${req.question}". Configure uma chave OpenRouter em "Configurar IA" para conversar com um modelo real.`
    req.onToken?.(text)
    return text
  }
}

function tone(mode: IDEMode, blocks: string, bridge: string, code: string): string {
  if (mode === 'blocks') return blocks
  if (mode === 'bridge') return bridge
  return code
}
