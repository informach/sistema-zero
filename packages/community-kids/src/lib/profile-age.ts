export const PROFILE_AGE_ERROR_MESSAGE = 'Esta comunidade é para crianças menores de 18 anos.'

export const ADULT_COMMUNITY_INSTAGRAM = '@criecomhelenaejulio'
export const ADULT_COMMUNITY_INSTAGRAM_URL = 'https://www.instagram.com/criecomhelenaejulio/'

/** A data representa alguém com 18 anos completos na data `today`? */
export function isProfileAgeRestricted(birthDate: string, today: string): boolean {
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  const current = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today)
  if (!birth || !current) return false

  const birthYear = Number(birth[1])
  const birthMonth = Number(birth[2])
  const birthDay = Number(birth[3])
  const currentYear = Number(current[1])
  const currentMonth = Number(current[2])
  const currentDay = Number(current[3])
  const hadBirthday =
    currentMonth > birthMonth || (currentMonth === birthMonth && currentDay >= birthDay)
  return currentYear - birthYear - (hadBirthday ? 0 : 1) >= 18
}
