import { VERSAO_CONTRATO_PLATAFORMA, versaoCompativel } from '@sistemazero/arquipelago-contracts'

/** A versão do contrato da plataforma que este jogo fala (a atual; a anterior também vale, A35). */
export const versaoContrato = VERSAO_CONTRATO_PLATAFORMA

/**
 * Recusa a plataforma de contrato incompatível antes de a entrada tocar no elemento. Fica fora de
 * `entrada.tsx` para o teste não carregar o jogo inteiro (o jogo baixa modelos ao ser importado, e
 * no Bun o carregador do three não tem `ProgressEvent`).
 */
export function conferirContrato(plataforma: { versaoContrato: number }): void {
  // A atual e a anterior valem (A35): o jogo e a plataforma podem subir em dias diferentes.
  if (!versaoCompativel(plataforma.versaoContrato)) {
    throw new Error(
      `Contrato da plataforma ${plataforma.versaoContrato} não é o deste jogo (${VERSAO_CONTRATO_PLATAFORMA})`,
    )
  }
}
