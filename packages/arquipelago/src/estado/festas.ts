import type { Plataforma } from '@sistemazero/arquipelago-contracts'
import { useEffect, useState } from 'react'
import { type Festa, festaDoDia } from '../sistemas/festas'
import { useJogo } from './contexto'

// Só o entrypoint do playground registra isto. A URL da plataforma não muda o calendário.
const ensaios = new WeakMap<Plataforma, Festa>()
export function definirFestaDoPlayground(plataforma: Plataforma, festa: Festa) {
  ensaios.set(plataforma, festa)
}
export function festaAtual(plataforma: Plataforma): Festa | null {
  return ensaios.get(plataforma) ?? festaDoDia(new Date())
}

export function useFesta(): Festa | null {
  const { plataforma } = useJogo()
  const [festa, definir] = useState(() => festaAtual(plataforma))
  useEffect(() => {
    const atualizar = () => definir(festaAtual(plataforma))
    atualizar()
    const timer = setInterval(atualizar, 30_000)
    document.addEventListener('visibilitychange', atualizar)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', atualizar)
    }
  }, [plataforma])
  return festa
}
