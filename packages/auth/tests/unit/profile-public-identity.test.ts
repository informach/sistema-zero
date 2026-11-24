import { expect, test } from 'bun:test'
import { toProfileView } from '../../src/application/mappers/profile-view'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'

const create = () =>
  ProfileAggregate.create({
    id: 'profile-identity',
    accountUserId: 'parent',
    name: 'Maria Silva Santos',
    birthDate: '2015-01-01',
  })
test('perfil legado não usa o nome completo como nome público nem confirma identidade por inferência', () => {
  const profile = create()
  expect(profile.name).toBe('Maria Silva Santos')
  expect(profile.displayName).toBe('Criador(a)')
  expect(toProfileView(profile)).toMatchObject({
    name: 'Criador(a)',
    fullName: 'Maria Silva Santos',
    publicNickname: null,
    identityConfirmed: false,
  })
})
test('responsável confirma nome completo e apelido separados; alterações pessoais não viram nomes públicos', () => {
  const profile = create()
  const at = new Date('2026-11-19T12:00:00Z')
  profile.updateDetails({ name: 'Maria Silva Santos', publicNickname: '  Fada   Azul  ' }, at)
  expect(profile.name).toBe('Maria Silva Santos')
  expect(profile.displayName).toBe('Fada Azul')
  expect(profile.identityConfirmedAt).toEqual(at)
  expect(toProfileView(profile)).toMatchObject({
    name: 'Fada Azul',
    fullName: 'Maria Silva Santos',
    publicNickname: 'Fada Azul',
    identityConfirmed: true,
  })
  const restored = ProfileAggregate.restore(profile.toSnapshot())
  expect(restored.displayName).toBe('Fada Azul')
  expect(() => restored.updateDetails({ publicNickname: '  ' })).toThrow()
})
test('trocar só o apelido (a criança, 24/11/2026) preserva a identidade confirmada pelos pais', () => {
  const profile = create()
  const confirmedAt = new Date('2026-11-19T12:00:00Z')
  profile.updateDetails({ name: 'Maria Silva Santos', publicNickname: 'Fada Azul' }, confirmedAt)
  profile.updateDetails({ publicNickname: 'Raio Verde' }, new Date('2026-11-24T12:00:00Z'))
  expect(profile.name).toBe('Maria Silva Santos')
  expect(profile.displayName).toBe('Raio Verde')
  expect(profile.identityConfirmedAt).toEqual(confirmedAt)
  // Mudar o nome completo sozinho continua pedindo nova confirmação dos pais.
  profile.updateDetails({ name: 'Maria Santos' })
  expect(profile.identityConfirmedAt).toBeNull()
})
