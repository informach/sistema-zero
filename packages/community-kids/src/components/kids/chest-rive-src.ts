import 'server-only'

/**
 * A URL do Rive é lida no servidor e passada para a ilha do baú. Variáveis
 * públicas só são conhecidas pelo browser se existirem NO build; no Railway
 * elas também podem ser definidas para o runtime, então a leitura cliente
 * deixava o valor nulo mesmo com o ambiente configurado.
 */
export function chestRiveSrc(): string | null {
  const src = process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL?.trim()
  return src || null
}
