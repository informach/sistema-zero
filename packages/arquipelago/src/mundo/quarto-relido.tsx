import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { relerOQuarto } from '../estado/quarto'

/**
 * Quando a criança volta para casa, o jogo relê o quarto da plataforma (§6.28, A10): o que ela
 * arrumou no Meu Quarto aparece aqui. Na visita, a casa é do irmão e nada é relido.
 */
export function QuartoRelido() {
  const { loja, plataforma } = useJogo()
  const emCasa = useEstado((s) => s.dentroDeCasa && !s.visita)
  const antes = useRef(emCasa)
  useEffect(() => {
    const entrou = emCasa && !antes.current
    antes.current = emCasa
    if (!entrou) return
    relerOQuarto(loja, plataforma).catch((erro) => plataforma.relatarErro(erro, 'quarto'))
  }, [emCasa, loja, plataforma])
  return null
}
