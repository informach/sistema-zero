import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { avatarDaAula, comporMaster, roteiroComAvatar } from './avatares-video'
import { caminhoAula, listarArquivosAulas } from './caminhos'
import { gerarFalas } from './gerar-falas-elevenlabs'
import { extrairPartesElevenLabs, semTags } from './roteiro-elevenlabs'

const section = {
  key: 'teste',
  videoKey: 'video-teste',
  avatar: {
    after: 'O jogo está parado.',
    speech: 'Como eu começo?',
    beforeScreen: 'Mostrar o jogo.',
    afterScreen: 'Mostrar a tecla.',
    reply: 'Vamos começar.',
  },
}
const fala = ['O jogo está parado. Toque em Enter.', 'Depois, mova a nave.']

test('a professora grava a pergunta e a explicação em sequência; a edição substitui só a pergunta', () => {
  const parte = comporMaster(section, fala, 1)
  expect(semTags(parte.texto)).toBe(
    'O jogo está parado. Como eu começo? Vamos começar. Toque em Enter. Depois, mova a nave.',
  )
  expect(parte.intervencoes).toHaveLength(1)
  expect(parte.intervencoes[0]?.personagem).toBe('Dedé')
  expect(parte.intervencoes[0]?.falaPrincipal).toBe('Como eu começo?')
  expect(parte.intervencoes[0]?.falaPersonagem).toBe('Como eu começo?')
  expect(extrairPartesElevenLabs(roteiroComAvatar(section, fala, 'Mostrar o jogo.', 1))).toEqual([
    parte,
  ])
  const producao = roteiroComAvatar(section, fala, 'Mostrar o jogo.', 1)
  expect(producao).toContain('`video-teste-K1`: entrada — Mostrar o jogo.')
  expect(producao).toContain('Saída — Mostrar a tecla.')
  expect(parte.texto).not.toContain('Mostrar a tecla.')
})

test('a dificuldade citada conserva a condição para quem está acompanhando', () => {
  const parte = comporMaster(
    {
      ...section,
      avatar: {
        ...section.avatar,
        leadIn: 'Talvez você esteja pensando:',
        speech: 'No meu jogo ainda não funcionou.',
        reply: undefined,
      },
    },
    ['O jogo está parado. Se aconteceu com você, volte aos blocos.'],
    0,
  )
  expect(semTags(parte.texto)).toContain(
    'Talvez você esteja pensando: No meu jogo ainda não funcionou. Se aconteceu com você, volte aos blocos.',
  )
})

test('âncora ausente, repetida ou fora de ordem impede uma substituição incorreta', () => {
  expect(() => comporMaster(section, ['Outra abertura.'], 0)).toThrow('âncora')
  expect(() => comporMaster(section, [fala[0] ?? '', fala[0] ?? ''], 0)).toThrow('âncora')
  expect(() =>
    comporMaster({ ...section, avatar: [section.avatar, section.avatar] }, fala, 0),
  ).toThrow('ordem')
  expect(() => avatarDaAula(-1)).toThrow()
})

test('as 40 aulas têm master copiável, tabela rastreável e derivados atualizados', () => {
  const arquivos = listarArquivosAulas().filter((n) => n.endsWith('.roteiro.md'))
  expect(arquivos).toHaveLength(46)
  let substituicoes = 0
  for (const arquivo of arquivos) {
    const nome = arquivo.replace('.roteiro.md', '')
    const partes = extrairPartesElevenLabs(readFileSync(caminhoAula(arquivo), 'utf8'))
    expect(gerarFalas(nome, true)).toBeGreaterThanOrEqual(2)
    for (const parte of partes)
      for (const i of parte.intervencoes) {
        expect(i.falaPersonagem).toBe(i.falaPrincipal)
        expect(semTags(parte.texto)).toContain(i.falaPrincipal)
        expect(i.ancoraAntes.length).toBeGreaterThan(0)
        expect(i.ancoraDepois.length).toBeGreaterThan(0)
        substituicoes++
      }
  }
  expect(substituicoes).toBeGreaterThan(30)
}, 60000)
