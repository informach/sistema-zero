'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * "Alguma atividade da aula está AMPLIADA agora?" (03/10/2026).
 *
 * Quatro peças ampliam por conta própria — a cena (`scene-workspace`), o jogo pronto
 * (`project-play-activity`), o Estúdio e o Pinta —, cada uma com o seu estado. O vídeo da seção
 * precisa saber de QUALQUER uma delas para virar o vídeo flutuante, e por isso elas avisam aqui
 * em vez de alguém subir quatro estados até a aula.
 *
 * Estado de MÓDULO, como o `expandedByProject` do Estúdio: é do navegador, e uma aba só tem uma
 * aula aberta.
 */

const ampliadas = new Set<symbol>()
const ouvintes = new Set<() => void>()

function avisar() {
  for (const ouvinte of ouvintes) ouvinte()
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

const algumaAmpliada = () => ampliadas.size > 0
const nenhumaNoServidor = () => false

/** Cada peça que amplia chama com o PRÓPRIO estado. Desmontar ampliada conta como fechar. */
export function useReportActivityExpanded(expanded: boolean) {
  const chave = useRef<symbol | null>(null)
  chave.current ??= Symbol('atividade-ampliada')
  useEffect(() => {
    const minha = chave.current
    if (!expanded || !minha) return
    ampliadas.add(minha)
    avisar()
    return () => {
      ampliadas.delete(minha)
      avisar()
    }
  }, [expanded])
}

export function useAnyActivityExpanded(): boolean {
  return useSyncExternalStore(assinar, algumaAmpliada, nenhumaNoServidor)
}
