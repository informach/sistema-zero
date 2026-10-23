/**
 * Os três consoles internos da equipe (admin, atendimento, marketing). Cada um tem login
 * próprio, e o menu do avatar de cada um aponta para os outros dois e para os bastidores da
 * Informach — a lista é montada AQUI para os três apps mostrarem os mesmos nomes, na mesma
 * ordem.
 */
export type ConsoleAppId = 'admin' | 'helpdesk' | 'marketing'

export interface ConsoleAppLink {
  id: ConsoleAppId | 'informach'
  label: string
  href: string
}

const CONSOLE_APPS: readonly { id: ConsoleAppId; label: string }[] = [
  { id: 'admin', label: 'Painel administrativo' },
  { id: 'helpdesk', label: 'Atendimento' },
  { id: 'marketing', label: 'Marketing' },
]

/** Os bastidores da Informach: o mesmo endereço em todos os ambientes, por isso fixo aqui. */
export const INFORMACH_BACKSTAGE: ConsoleAppLink = {
  id: 'informach',
  label: 'Bastidores da Informach',
  href: 'https://admin.informach.com.br/',
}

/**
 * Os OUTROS consoles, para o menu do avatar de `current`, e por último os bastidores da
 * Informach. A URL de cada console vem da env do app (opcional): ausente ou vazia → o link
 * some, em vez de apontar para lugar nenhum (o staging não tem domínio fixo).
 */
export function consoleAppLinks(
  current: ConsoleAppId,
  urls: Partial<Record<ConsoleAppId, string | undefined>>,
): ConsoleAppLink[] {
  const consoles = CONSOLE_APPS.flatMap(({ id, label }): ConsoleAppLink[] => {
    const href = urls[id]?.trim()
    return id !== current && href ? [{ id, label, href }] : []
  })
  return [...consoles, INFORMACH_BACKSTAGE]
}
