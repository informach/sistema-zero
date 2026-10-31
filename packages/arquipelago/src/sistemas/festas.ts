import type { Festa } from '@sistemazero/arquipelago-contracts'

// O calendário puro mora no contrato (o serviço concede as roupas da época, §6.28 A21).
export {
  CALENDARIO_DAS_FESTAS,
  carnavalDoAno,
  type Festa,
  festaDoDia,
  pascoaDoAno,
  sabadoDeCarnaval,
} from '@sistemazero/arquipelago-contracts'

export const NOMES_DAS_FESTAS: Record<Festa, string> = {
  carnaval: 'Carnaval',
  junina: 'Festa Junina',
  lanternas: 'Noite das Lanternas',
  'fim-de-ano': 'Festa de fim de ano',
}

export function lerFesta(texto: string | null): Festa | null {
  return texto && Object.hasOwn(NOMES_DAS_FESTAS, texto) ? (texto as Festa) : null
}

export const PAINEL_DA_FOGUEIRA = 'fogueira-da-festa'
export const avisoDaFesta = (festa: Festa) =>
  `${NOMES_DAS_FESTAS[festa]} chegou à Vila Doce. Ela volta todo ano.`
export const chaveDoAvisoDaFesta = (perfil: string, festa: Festa) =>
  `arquipelago:festa:${encodeURIComponent(perfil)}:${festa}`
