'use client'

import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  chaveDeVoz,
  falasDaCena,
  roteiroDoZappy,
  type SceneVozes,
  textoFalado,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { Volume2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiSend } from '@/lib/api'
import type { LessonBlockContent } from '@/lib/types'
import { type FalaParaGerarVozDoZappy, MAX_TEXTOS_POR_PEDIDO } from '@/lib/voz-zappy-limites'

/**
 * "Gerar a voz do Zappy": grava o áudio de TODAS as falas da aula, de uma vez.
 *
 * ⭐⭐ Decisão da dona (17/09/2026): um botão só, na aula inteira — "o que já tiver não gera de
 * novo, o que tiver alterado gera de novo, e o que ainda não tem, gera". É o que este botão faz, e
 * sem precisar saber o que mudou: a key do MP3 no R2 é o hash do texto falado, então frase intocada
 * é reaproveitada (HEAD no bucket, zero crédito), frase editada tem hash novo e é gerada, e frase
 * nova também. Rodar duas vezes seguidas não custa nada na segunda.
 *
 * ⚠️ O dicionário gravado em cada bloco é ENXUTO (só as falas daquele bloco), mas o ÁUDIO é
 * compartilhado por hash entre blocos e aulas: a mesma pergunta em dez cenas é um arquivo só.
 *
 * ⚠️⚠️ Os textos saem da PROJEÇÃO PÚBLICA do bloco (`publicInteractiveBlock`), que é o que o
 * navegador da criança recebe: é ela que resolve a previsão e a pergunta do MODELO da cena quando o
 * professor não escreveu as suas. Gerando do rascunho cru, a cena que herda o palpite do modelo
 * ficaria sem áudio justamente na pergunta que tranca o palco.
 */

interface BlocoDoRascunho {
  id: string
  content: LessonBlockContent
}

interface FalasDoBloco {
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
    if (content.kind !== 'interactive') continue
    const atividade = content.activity
    if (atividade?.type !== 'demonstration' && atividade?.type !== 'experimentation') continue
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

/** A fala já tem áudio com ESTE roteiro? (trocar a pronúncia derruba a cobertura, por desenho). */
const coberto = (falas: FalasDoBloco) =>
  falas.falas.every((fala) => Boolean(falas.vozes?.[chaveDeVoz(fala.speechText)]))

/**
 * Separa o que a rota confirma que já existia do que ficou sem áudio.
 *
 * ⚠️ Não se pode derivar `prontas` por diferença: uma fala que falhou também não é nova, mas
 * certamente não estava pronta. A contagem explícita de `reaproveitadas` é a única que sustenta a
 * mensagem que a autora lê depois de gerar.
 */
export function resumoDaGeracaoDeVoz({
  total,
  geradas,
  reaproveitadas,
  longasDemais,
}: {
  total: number
  geradas: number
  reaproveitadas: number
  longasDemais: number
}) {
  return {
    prontas: reaproveitadas,
    faltou: Math.max(0, total - geradas - reaproveitadas - longasDemais),
  }
}

export function VozZappyButton({
  blocos,
  disabled,
  onVozes,
}: {
  blocos: readonly BlocoDoRascunho[]
  disabled?: boolean
  /** Grava o dicionário no bloco (o chamador enfileira o comando do rascunho). */
  onVozes: (blockId: string, vozes: SceneVozes) => void
}) {
  const [gerando, setGerando] = useState(false)
  const falas = falasDaAula(blocos)
  const semVoz = falas.filter((f) => !coberto(f)).length
  if (!falas.length) return null

  async function gerar() {
    setGerando(true)
    try {
      // Todas as falas da aula, sem repetição: a rota reaproveita o que já existe no R2 e só paga
      // pelo que falta, então mandar tudo é o que cobre "alterado" e "novo" no mesmo clique.
      const todos = [
        ...new Map(
          falas.flatMap((f) => f.falas).map((fala) => [chaveDeVoz(fala.speechText), fala]),
        ).values(),
      ]
      const vozes: Record<string, string> = {}
      let geradas = 0
      let reaproveitadas = 0
      let longas = 0
      // ⚠ O passo do lote É o teto da rota (fonte única): um número maior aqui dá 400 em toda aula
      // grande, e um menor multiplica idas sem motivo.
      for (let i = 0; i < todos.length; i += MAX_TEXTOS_POR_PEDIDO) {
        const lote = await apiSend<{
          vozes: Record<string, string>
          geradas: number
          reaproveitadas: number
          longasDemais: number
        }>('/api/media/voz-zappy', 'POST', { falas: todos.slice(i, i + MAX_TEXTOS_POR_PEDIDO) })
        Object.assign(vozes, lote.vozes)
        geradas += lote.geradas
        reaproveitadas += lote.reaproveitadas
        longas += lote.longasDemais
      }
      let blocosComVoz = 0
      for (const fala of falas) {
        // ⚠️ Só as falas DESTE bloco, e só as que voltaram: uma frase que falhou fica de fora, e o
        // player já sabe o que fazer com dicionário incompleto (lê tudo na voz do navegador).
        const dicionario: Record<string, string> = {}
        for (const falaDoBloco of fala.falas) {
          const key = chaveDeVoz(falaDoBloco.speechText)
          if (vozes[key]) dicionario[key] = vozes[key]
        }
        if (!Object.keys(dicionario).length) continue
        onVozes(fala.id, dicionario)
        blocosComVoz += 1
      }
      const { faltou, prontas } = resumoDaGeracaoDeVoz({
        total: todos.length,
        geradas,
        reaproveitadas,
        longasDemais: longas,
      })
      toast.success(
        `Voz do Zappy em ${blocosComVoz} ${blocosComVoz === 1 ? 'bloco' : 'blocos'}: ${geradas} ${
          geradas === 1 ? 'fala nova' : 'falas novas'
        }, ${prontas} já ${prontas === 1 ? 'pronta' : 'prontas'}.` +
          (faltou ? ` ${faltou} não saiu, tente de novo.` : '') +
          // ⚠ A fala longa demais NÃO é erro: ela segue na voz do navegador. Dizer isso evita a
          // caçada por um defeito que não existe quando o contador nunca zera.
          (longas
            ? ` ${longas} ${longas === 1 ? 'fala é longa demais' : 'falas são longas demais'} para gravar e continua${longas === 1 ? '' : 'm'} na voz do navegador.`
            : ''),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu para gerar a voz agora.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={() => void gerar()}
      disabled={disabled || gerando}
      // O rótulo diz o ESTADO da aula, não só a ação: é o que responde "preciso clicar de novo?"
      title={
        semVoz
          ? `${semVoz} ${semVoz === 1 ? 'bloco está' : 'blocos estão'} sem voz ou com a fala alterada.`
          : 'Todas as falas desta aula já têm a voz do Zappy.'
      }
    >
      {gerando ? <Spinner /> : <Volume2 size={16} aria-hidden />}
      {semVoz ? `Gerar a voz do Zappy (${semVoz})` : 'Voz do Zappy: em dia'}
    </Button>
  )
}
