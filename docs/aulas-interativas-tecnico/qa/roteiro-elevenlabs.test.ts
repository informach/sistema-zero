import { expect, test } from 'bun:test'
import {
  extrairPartesElevenLabs,
  montarTextoElevenLabs,
  prepararFala,
  renderizarClipe,
  validarIntervencoes,
} from './roteiro-elevenlabs'

test('o texto copiável conserva a fala e separa partes, sem notas de produção', () => {
  const partes = [
    { clipe: 'abertura', texto: '[warmly] Jogue a versão pronta.', intervencoes: [] },
    { clipe: 'montagem', texto: '[thoughtful] No meu jogo ainda não funcionou.', intervencoes: [] },
  ]
  expect(montarTextoElevenLabs(partes)).toBe(
    '[warmly] Jogue a versão pronta.\n\n[long pause]\n\n[thoughtful] No meu jogo ainda não funcionou.\n',
  )
  const roteiro = `# Produção\n${renderizarClipe(partes[0], 'Mostrar o jogo.')}\n**Recado na página:** Não gravar.\n${renderizarClipe(partes[1], 'Mostrar os blocos.')}`
  expect(extrairPartesElevenLabs(roteiro)).toEqual(partes)
  expect(montarTextoElevenLabs(extrairPartesElevenLabs(roteiro))).not.toMatch(
    /Mostrar|Recado|Produção|Não gravar/,
  )
})

test('a condução tem energia e muda de intenção sem alterar a instrução', () => {
  const texto =
    'Agora abra Jogo 2D e encaixe o bloco. Olha só: a nave apareceu! Se no seu jogo ficou diferente, confira o nome.'
  const fala = prepararFala(texto)
  expect(fala).toStartWith('[confident, clear, unhurried voice]')
  expect(fala).toContain('[interested, animated voice] Olha só:')
  expect(fala).toContain('[reassuring, encouraging voice] Se no seu')
  expect(fala.replace(/\[[^\]]+\]\s*/g, '')).toBe(texto)
  expect(prepararFala('Vamos ver como o jogo guarda esse número.')).toStartWith(
    '[engaging, energetic, conversational voice]',
  )
  expect(fala).not.toContain('[calm')
})

test('uma substituição usa exatamente a frase do master e suas âncoras', () => {
  const parte = {
    clipe: 'montagem',
    texto:
      '[thoughtful] Talvez você esteja pensando: “No meu jogo ainda não funcionou.” [warmly] Se aconteceu com você, confira os blocos.',
    intervencoes: [
      {
        id: 'K01',
        clipe: 'montagem',
        personagem: 'Debinha' as const,
        falaPrincipal: 'No meu jogo ainda não funcionou.',
        falaPersonagem: 'No meu jogo ainda não funcionou.',
        ancoraAntes: 'Talvez você esteja pensando:',
        ancoraDepois: 'Se aconteceu com você, confira os blocos.',
        ocorrencia: 1,
        tags: ['[thoughtful]'],
      },
    ],
  }
  expect(extrairPartesElevenLabs(renderizarClipe(parte, 'Manter o teste visível.'))).toEqual([
    parte,
  ])
  expect(() =>
    validarIntervencoes({
      ...parte,
      intervencoes: [{ ...parte.intervencoes[0], falaPersonagem: 'Outra frase.' }],
    }),
  ).toThrow('mesma frase')
  expect(() =>
    validarIntervencoes({
      ...parte,
      intervencoes: [{ ...parte.intervencoes[0], ancoraAntes: 'Ausente' }],
    }),
  ).toThrow('âncora')
  expect(() => validarIntervencoes({ ...parte, texto: `${parte.texto} ${parte.texto}` })).toThrow(
    'ambígua',
  )
})

test('recusa clipes duplicados, SSML e anotações de edição no texto de síntese', () => {
  const parte = { clipe: 'abertura', texto: '[warmly] Olá.', intervencoes: [] }
  expect(() =>
    extrairPartesElevenLabs(renderizarClipe(parte, '') + renderizarClipe(parte, '')),
  ).toThrow('duplicado')
  expect(() => montarTextoElevenLabs([{ ...parte, texto: '<break time="3s"/> Olá.' }])).toThrow(
    'SSML',
  )
  expect(() => montarTextoElevenLabs([{ ...parte, texto: '[cortar aqui] Olá.' }])).toThrow('tag')
  expect(() => montarTextoElevenLabs([{ ...parte, texto: 'Professora: Olá.' }])).toThrow('produção')
  expect(() =>
    montarTextoElevenLabs([
      { ...parte, texto: '[curious] Uma dúvida possível é: como eu começo?' },
    ]),
  ).toThrow('conversada')
})
