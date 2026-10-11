'use client'

import { useCallback, useEffect, useRef } from 'react'
import { anyActivityExpandedNow, subscribeActivityExpanded } from './lesson-activity-expansion'

/**
 * A atualização da aula (`router.refresh()`), com duas regras (11/10/2026).
 *
 * Relato dela: com o Estúdio AMPLIADO, "Verificar esta parte" recarregou a página inteira e o
 * editor voltou ao modo reduzido. No Next 16 o `router.refresh()` vira recarregamento completo
 * quando o servidor mudou de build desde que a aba abriu (todo deploy), e a página nova nasce sem
 * nada ampliado. Mesmo sem deploy, cada atualização refaz a aula inteira no servidor.
 *
 * 1. **Junta** os pedidos do mesmo gesto num refresh só (o envio pela galeria pedia dois seguidos).
 * 2. **Espera** a atividade sair do modo ampliado: enquanto houver uma, o pedido fica guardado e
 *    roda quando ela fecha. Nada se perde esperando: ampliada, ela cobre o rodapé com
 *    "Próxima parte", que é o que a atualização libera.
 *
 * Devolve uma função estável: pode ir direto para o contexto do player.
 */
export function useLessonRefresh(refresh: () => void): () => void {
  const atual = useRef(refresh)
  atual.current = refresh
  const pendente = useRef(false)
  const agendado = useRef<ReturnType<typeof setTimeout> | null>(null)

  const disparar = useCallback(() => {
    agendado.current = null
    if (anyActivityExpandedNow()) {
      pendente.current = true
      return
    }
    pendente.current = false
    atual.current()
  }, [])

  const agendar = useCallback(() => {
    if (agendado.current !== null) return
    // Fora da volta atual: os pedidos do mesmo gesto caem no mesmo refresh, e o fechamento da
    // ampliação (que avisa durante a limpeza de um efeito) não chama o roteador no meio do commit.
    agendado.current = setTimeout(disparar, 0)
  }, [disparar])

  useEffect(() => {
    const parar = subscribeActivityExpanded(() => {
      if (pendente.current && !anyActivityExpandedNow()) agendar()
    })
    return () => {
      parar()
      if (agendado.current !== null) clearTimeout(agendado.current)
      agendado.current = null
    }
  }, [agendar])

  return agendar
}
