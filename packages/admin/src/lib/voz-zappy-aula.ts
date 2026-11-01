import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  falasDaCena,
  falasDoQuiz,
  roteiroDoZappy,
  type SceneVozes,
  textoFalado,
  VOZ_LIMITS,
} from '@sistemazero/core/learning/scene'
import type { LessonBlockContent } from './types'
import type { FalaParaGerarVozDoZappy } from './voz-zappy-limites'

export interface BlocoDoRascunho {
  id: string
  content: LessonBlockContent
}

export interface FalasDoBloco {
  id: string
  content: LessonBlockContent
  falas: readonly FalaParaGerarVozDoZappy[]
  vozes: SceneVozes | undefined
}

/** O que cada bloco da aula fala, e o que ele já tem gravado. */
export function falasDaAula(blocos: readonly BlocoDoRascunho[]): FalasDoBloco[] {
  const saida: FalasDoBloco[] = []
  for (const bloco of blocos) {
    const content = bloco.content
    if (content.kind === 'dialogue') {
      const visibleText = textoFalado(content.text)
      const speechText = roteiroDoZappy(visibleText, content.zappySpeech)
      if (speechText) {
        saida.push({ ...bloco, falas: [{ visibleText, speechText }], vozes: content.vozes })
      }
      continue
    }
    if (content.kind === 'quiz') {
      // Pergunta com as alternativas e explicação de cada questão (core `voz-quiz.ts`). ⚠️ O MP3
      // da explicação fica no bloco, mas só sai para a criança na correção (é gabarito).
      // Questão pela metade (enunciado ou alternativa em branco) fica de fora: gravar o rascunho
      // pagaria uma fala que vai mudar.
      const prontas = content.questions.filter(
        (q) => q.prompt.trim() && q.choices.every((c) => c.label.trim()),
      )
      // ⚠️ A rota recusa o LOTE inteiro com um roteiro acima do teto da chave, e um enunciado de
      // 5000 caracteres somado a 20 alternativas passa disso: essa fala fica na voz do navegador.
      const falas = falasDoQuiz({ questions: prontas })
        .filter((fala) => fala.speechText.length <= VOZ_LIMITS.chave)
        .map(({ visibleText, speechText }) => ({ visibleText, speechText }))
      if (falas.length) saida.push({ ...bloco, falas, vozes: content.vozes })
      continue
    }
    if (content.kind !== 'interactive') continue
    const atividade = content.activity
    if (atividade?.type !== 'experimentation') continue
    /**
     * ⚠⚠ O `try` não é zelo: isto roda no RENDER, sobre o RASCUNHO, e o rascunho guarda estado
     * inválido de propósito (é o que deixa a professora sair do meio de uma edição). Uma cena com id
     * que saiu do catálogo faz os resolvedores do core lançarem, e sem o `try` a exceção subiria no
     * render do editor INTEIRO — um botão de voz derrubando a tela de autoria da aula.
     */
    try {
      // A projeção pública é o bloco COMO A CRIANÇA O RECEBE — ver o aviso do topo.
      const publico = publicInteractiveBlock(
        content as Parameters<typeof publicInteractiveBlock>[0],
      )
      const falas = falasDaCena(publico).map(({ visibleText, speechText }) => ({
        visibleText,
        speechText,
      }))
      if (falas.length) saida.push({ ...bloco, falas, vozes: atividade.vozes })
    } catch {
      /* bloco em rascunho que ainda não fecha: fica de fora até a autora terminar */
    }
  }
  return saida
}
