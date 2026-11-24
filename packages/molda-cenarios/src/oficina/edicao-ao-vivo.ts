import { useEffect, useRef } from 'react'
import type { ControladorDaOficina, EstadoDaOficina } from './controlador'
import type { CenariosHost } from './portas'

/**
 * Edição ao vivo: com a aba à vista, a oficina pergunta a revisão guardada a cada poucos segundos
 * e, quando outra pessoa (um agente, outra aba) mudou o cenário, abre a versão nova sozinha. Só
 * recarrega sem nada local pendente e fora de um gesto ou ferramenta aberta, as mesmas condições
 * do retrato automático; depois de recarregar, o retrato da revisão nova sai como sempre (é o que
 * a captura "pela oficina aberta" do agente espera).
 */

export const INTERVALO_DA_EDICAO_AO_VIVO_MS = 4000

export function deveRecarregar(
  local: Pick<EstadoDaOficina, 'revisao' | 'salvamento' | 'ocupado'>,
  revisaoGuardada: number,
  livre: boolean,
): boolean {
  return (
    livre && !local.ocupado && local.salvamento === 'guardado' && revisaoGuardada > local.revisao
  )
}

export function useEdicaoAoVivo({
  host,
  controlador,
  cenarioId,
  livre,
}: {
  host: Pick<CenariosHost, 'historicoDoCenario'>
  controlador: Pick<ControladorDaOficina, 'getState' | 'recarregar'>
  cenarioId: string
  /** Lido na hora: fora de gesto, ensaio e ferramenta aberta. */
  livre: () => boolean
}) {
  const livreAgora = useRef(livre)
  livreAgora.current = livre
  useEffect(() => {
    let parado = false,
      consultando = false
    const consultar = async () => {
      if (parado || consultando || document.visibilityState !== 'visible') return
      if (!deveRecarregar(controlador.getState(), Number.POSITIVE_INFINITY, livreAgora.current()))
        return
      consultando = true
      try {
        const { revisao } = await host.historicoDoCenario(cenarioId)
        if (!parado && deveRecarregar(controlador.getState(), revisao, livreAgora.current()))
          await controlador.recarregar()
      } catch {
        // Sem conexão agora: a próxima consulta tenta de novo.
      } finally {
        consultando = false
      }
    }
    const relogio = setInterval(() => void consultar(), INTERVALO_DA_EDICAO_AO_VIVO_MS)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void consultar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      parado = true
      clearInterval(relogio)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [host, controlador, cenarioId])
}
