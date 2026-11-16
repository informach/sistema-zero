import { useEffect, useRef } from 'react'
import { useCarga } from './pecas'
import type { Biblioteca, FonteDeMoldes } from './portas'

/** Identifica apenas a vista da fonte; nunca é enviado como id de biblioteca ao servidor. */
export const BIBLIOTECA_MOLDA_ID = 'molda'
export function bibliotecaVivaDoMolda(espacoId: string): Biblioteca {
  return {
    id: BIBLIOTECA_MOLDA_ID,
    espacoId,
    nome: 'Meus moldes',
    fonte: 'molda',
    licenca: 'propria',
    modelos: 0,
    capa: null,
    atualizadaEm: '',
  }
}

export function useMoldes(fonte: FonteDeMoldes | undefined, ativa: boolean) {
  const carga = useCarga(
    (sinal) => (ativa && fonte ? fonte.listar(sinal) : Promise.resolve([])),
    [fonte, ativa],
  )
  const ultima = useRef(0)
  useEffect(() => {
    if (!ativa || !fonte) return
    const atualizar = () => {
      if (document.visibilityState === 'hidden' || Date.now() - ultima.current < 1000) return
      ultima.current = Date.now()
      carga.recarregar()
    }
    window.addEventListener('focus', atualizar)
    document.addEventListener('visibilitychange', atualizar)
    return () => {
      window.removeEventListener('focus', atualizar)
      document.removeEventListener('visibilitychange', atualizar)
    }
  }, [fonte, ativa, carga.recarregar])
  return carga
}
