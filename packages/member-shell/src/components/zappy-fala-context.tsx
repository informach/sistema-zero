'use client'

import { createContext, useContext } from 'react'

/**
 * Quem rege a BOCA do mascote: o botão "Ouvir" da tela.
 *
 * O estado "está falando" nasce aqui no shell (`useSceneVoice`, uma instância por componente),
 * mas o mascote é asset do KIDS e entra no balão por SLOT (`DialogueBlockView.mascot`). Este
 * contexto é a ponte entre os dois: o slot é RENDERIZADO dentro do provider, então o mascote
 * enxerga o estado mesmo tendo sido criado lá no app.
 *
 * ⚠️ `null` (ninguém proveu) é o caso NORMAL, não uma falha: a maioria dos balões não tem
 * caminho de fala, e neles o mascote anima como sempre animou. Só quem tem botão "Ouvir" na
 * tela provê: o balão do bloco `dialogue` e a faixa da instrução da cena.
 */
export interface ZappyFalaInfo {
  /** Existe caminho de fala nesta tela? (é o mesmo que decide o botão "Ouvir") */
  podeFalar: boolean
  /** Está saindo som AGORA — a voz gravada do Zappy ou a do navegador. */
  falando: boolean
}

const ZappyFalaContext = createContext<ZappyFalaInfo | null>(null)
export const ZappyFalaProvider = ZappyFalaContext.Provider
export const useZappyFala = () => useContext(ZappyFalaContext)
