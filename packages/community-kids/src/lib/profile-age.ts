export const PROFILE_AGE_ERROR_MESSAGE = 'Esta comunidade é para crianças menores de 18 anos.'

/**
 * A mesma recusa (`PROFILE_AGE_RESTRICTED`) num perfil que JÁ existe: quem completou 18 anos sem a
 * data cadastrada não perde o perfil, só a data de 18 anos ou mais não entra. A frase não fala de
 * criança (o perfil pode ser de quem já é adulto) e diz que nada mudou.
 */
export const PROFILE_AGE_EDIT_MESSAGE =
  'A plataforma só aceita datas de quem tem menos de 18 anos. O perfil continua funcionando.'

/** A frase da recusa pela idade: a da criação ou a da edição de um perfil que já existe. */
export function profileAgeMessage(editing: boolean): string {
  return editing ? PROFILE_AGE_EDIT_MESSAGE : PROFILE_AGE_ERROR_MESSAGE
}

export const ADULT_COMMUNITY_INSTAGRAM = '@criecomhelenaejulio'
export const ADULT_COMMUNITY_INSTAGRAM_URL = 'https://www.instagram.com/criecomhelenaejulio/'

/** Anos completos entre as duas datas `AAAA-MM-DD`, sem conferir faixa; formato inválido → `null`. */
function yearsBetween(birthDate: string, today: string): number | null {
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  const current = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today)
  if (!birth || !current) return null

  const birthYear = Number(birth[1])
  const birthMonth = Number(birth[2])
  const birthDay = Number(birth[3])
  const currentYear = Number(current[1])
  const currentMonth = Number(current[2])
  const currentDay = Number(current[3])
  const hadBirthday =
    currentMonth > birthMonth || (currentMonth === birthMonth && currentDay >= birthDay)
  return currentYear - birthYear - (hadBirthday ? 0 : 1)
}

/**
 * A idade em anos completos na data `today`, para mostrar. Use `today` do fuso de São Paulo
 * (`saoPauloDayKey`): o servidor e o navegador chegam ao MESMO dia, e a página não muda entre o
 * HTML e a hidratação na virada da meia-noite UTC. Data ausente, inválida ou fora de 0 a 120 → `null`.
 */
export function profileAgeOn(birthDate: string | null | undefined, today: string): number | null {
  const age = yearsBetween(birthDate?.trim() ?? '', today)
  return age === null || age < 0 || age > 120 ? null : age
}

/** A data representa alguém com 18 anos completos na data `today`? */
export function isProfileAgeRestricted(birthDate: string, today: string): boolean {
  return (yearsBetween(birthDate, today) ?? 0) >= 18
}
