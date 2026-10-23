import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { isSafePensaText, pensaNarrativeRefusal, privatePensaInput, redactPensaText } = await import(
  '../src/server/pensa/privacy'
)

test('preserves game fiction, scoring and the rest of an idea after personal-data redaction', () => {
  expect(redactPensaText('Meu nome é Ana Clara da Silva. Quero um jogo de gato').text).toBe(
    'Meu nome é [nome removido]. Quero um jogo de gato',
  )
  expect(redactPensaText('moro em São Paulo e quero um jogo de futebol').text).toBe(
    'moro em [local removido] e quero um jogo de futebol',
  )
  for (const idea of [
    'placar até 9999 9999',
    'quero chegar a 1000000000 pontos',
    'tipo Bomberman: o boneco faz uma bomba',
  ]) {
    expect(redactPensaText(idea).text).toBe(idea)
    expect(pensaNarrativeRefusal(idea)).toBeNull()
  }
})

test('refuses contact requests and unsafe real-world instructions without refusing game combat', () => {
  expect(pensaNarrativeRefusal('me passa o seu telefone')).not.toBeNull()
  expect(pensaNarrativeRefusal('não conte para ninguém, fica em segredo')).not.toBeNull()
  expect(pensaNarrativeRefusal('quero fazer uma bomba de verdade')).not.toBeNull()
  expect(pensaNarrativeRefusal('quero morrer')).toContain('188')
  expect(pensaNarrativeRefusal('o ninja luta contra o monstro e ele explode')).toBeNull()
})

test('rejects generated text asking for personal data', () => {
  expect(isSafePensaText('Qual é a sua escola?')).toBe(false)
  expect(isSafePensaText('Qual será a escola do personagem no jogo?')).toBe(true)
})

test('manual edits and provider inputs redact narrative data without changing opaque references', () => {
  expect(
    privatePensaInput({
      objective: 'Ganhe 9999 9999 pontos. Contato: crianca@example.com',
      creationId: '001234567890',
      originalIntent: 'Explorar uma ilha.',
    }),
  ).toEqual({
    objective: 'Ganhe 9999 9999 pontos. Contato: [e-mail removido]',
    creationId: '001234567890',
    originalIntent: 'Explorar uma ilha.',
  })
})
