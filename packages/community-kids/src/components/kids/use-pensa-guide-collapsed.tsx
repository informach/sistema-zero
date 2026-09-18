'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * O guia do Pensa recolhido, lembrado por CRIANÇA (18/09/2026).
 *
 * Relato dela: o painel com o cartão de criação ocupa muito da tela e sobra pouco para criar.
 * Ele recolhe por uma seta, e a escolha fica guardada — recolher uma vez vale para as próximas
 * vezes que ela abrir a ferramenta.
 *
 * ⚠️ O estado mora AQUI, no host, e desce aos painéis como DADO (`collapsed` +
 * `onCollapsedChange`), o mesmo idioma do `menu.hidden`/`onToggle` do `hostChrome`: os painéis
 * do Pinta e do Estúdio vivem nos pacotes e não conhecem `viewerId` nem `localStorage`. Uma
 * chave só para as três oficinas, porque o gosto é da criança, não da ferramenta.
 *
 * ⚠️⚠️ A preferência é lida num efeito PÓS-MOUNT, nunca no inicializador do `useState`: ler
 * `localStorage` na primeira renderização dá mismatch de hidratação (React #418). É a mesma
 * regra load-bearing do modo foco, e ela já custou caro uma vez.
 */
const chave = (viewerId: string) => `sz:kids:pensa-guia-recolhido:${viewerId}`

function ler(viewerId: string): boolean {
  try {
    return localStorage.getItem(chave(viewerId)) === '1'
  } catch {
    // localStorage indisponível (modo privado, cota) → nasce aberto, sem crash.
    return false
  }
}

function gravar(viewerId: string, valor: boolean): void {
  try {
    localStorage.setItem(chave(viewerId), valor ? '1' : '0')
  } catch {
    // best-effort: a preferência é conforto, nunca atrapalha a criação.
  }
}

export function usePensaGuideCollapsed(viewerId: string | null): {
  collapsed: boolean
  setCollapsed: (valor: boolean) => void
} {
  const [collapsed, setEstado] = useState(false)

  useEffect(() => {
    setEstado(viewerId ? ler(viewerId) : false)
  }, [viewerId])

  const setCollapsed = useCallback(
    (valor: boolean) => {
      setEstado(valor)
      if (viewerId) gravar(viewerId, valor)
    },
    [viewerId],
  )

  return { collapsed, setCollapsed }
}
