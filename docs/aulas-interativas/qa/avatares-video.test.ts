import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  avatarDaAula,
  palavrasDoVideo,
  participacoes,
  planoAvatar,
  roteiroComAvatar,
} from './avatares-video'
import { aulasDino, falasSecao as falasDino } from './gerar-corre-dino'
import { aulasMeuJeito, falasSecao as falasMeuJeito } from './gerar-meu-jeito'
import { aulasNave, falasSecao as falasNave } from './gerar-nave-contra-asteroides'

const section = {
  key: 'teste',
  videoKey: 'video-teste',
  avatar: {
    after: 'O jogo está parado.',
    speech: 'Como eu começo?',
    beforeScreen: 'Mostrar a abertura.',
    afterScreen: 'Demonstrar a tecla.',
    reply: 'Vamos começar.',
  },
}
const speech = ['O jogo está parado. Toque em Enter.', 'Depois, mova a nave.']

describe('edição com avatares', () => {
  test('o corte pode ficar dentro de um parágrafo, preservando a sequência e a saída', () => {
    const texto = roteiroComAvatar(section, speech, 'Mostrar os controles.', 1)
    const falas = [...texto.matchAll(/^> “(.+?)”$/gm)].map((m) => m[1]!.replaceAll('\n>\n> ', ' '))
    expect(texto).toContain('**Dedé (avatar):**')
    expect(texto).not.toContain('**Debinha (avatar):**')
    expect(falas.slice(0, 2)).toEqual(['O jogo está parado.', 'Como eu começo?'])
    expect(texto).toContain('> “Vamos começar. Toque em Enter.\n>\n> Depois, mova a nave.”')
    expect(texto).toContain('Dedé sai antes da resposta. Demonstrar a tecla.')
    expect(palavrasDoVideo(section, speech)).toBe(16)
  })

  test('mudança ou repetição da âncora impede gerar uma inserção no lugar errado', () => {
    expect(() => roteiroComAvatar(section, ['Outra abertura.'], '', 0)).toThrow('âncora')
    expect(() => planoAvatar(section, [...speech, speech[0]!], 0)).toThrow('âncora')
    expect(() => planoAvatar(section, ['O jogo está parado.'], 0)).toThrow('retomada')
    expect(() => planoAvatar({ ...section, videoKey: undefined }, speech, 0)).toThrow('exige vídeo')
  })

  test('a alternância usa a ordem das aulas e rejeita uma ordem desconhecida', () => {
    expect(avatarDaAula(0)).toBe('Debinha')
    expect(avatarDaAula(1)).toBe('Dedé')
    expect(avatarDaAula(8)).toBe('Debinha')
    expect(() => avatarDaAula(-1)).toThrow()
  })

  test('duas entradas mantêm os passos entre elas e contam ambas as falas', () => {
    const multi = {
      ...section,
      avatar: [
        section.avatar,
        { ...section.avatar, after: 'Toque em Enter.', speech: 'Agora começou!', reply: undefined },
      ],
    }
    const texto = roteiroComAvatar(multi, speech, 'Mostrar os controles.', 0)
    expect(texto).toContain('video-teste-avatar-01')
    expect(texto).toContain('video-teste-avatar-02')
    expect(texto.match(/\*\*Debinha \(avatar\):\*\*/g)).toHaveLength(2)
    expect(texto).toContain('> “Vamos começar. Toque em Enter.”')
    expect(texto).toContain('> “Agora começou!”')
    expect(texto).toContain('> “Depois, mova a nave.”')
    expect(palavrasDoVideo(multi, speech)).toBe(18)
    expect(planoAvatar(multi, speech, 0)).toContain('Agora começou!')
    expect(() =>
      roteiroComAvatar({ ...multi, avatar: [...multi.avatar].reverse() }, speech, '', 0),
    ).toThrow('ordem')
  })

  test('âncoras podem compartilhar contexto, mas não o mesmo ponto de corte', () => {
    const multi = {
      ...section,
      avatar: [
        section.avatar,
        { ...section.avatar, after: speech[0]!, speech: 'Começou!', reply: undefined },
      ],
    }
    const texto = roteiroComAvatar(multi, speech, '', 0)
    expect(texto).toContain('> “Vamos começar. Toque em Enter.”')
    expect(texto).toContain('> “Depois, mova a nave.”')
    expect(() =>
      roteiroComAvatar({ ...multi, avatar: [section.avatar, section.avatar] }, speech, '', 0),
    ).toThrow('mesmo ponto')
  })
})

for (const [course, lessons, falas] of [
  ['corre-dino', aulasDino, falasDino],
  ['nave-contra-asteroides', aulasNave, falasNave],
  ['meu-jeito', aulasMeuJeito, falasMeuJeito],
] as const) {
  test(`${course}: todas as aulas alternam a criança e sincronizam as falas nos três documentos`, () => {
    for (const [index, lesson] of lessons.entries()) {
      const base = resolve(import.meta.dir, `../aulas/${course}-${lesson.slug}`)
      const roteiro = readFileSync(`${base}.roteiro.md`, 'utf8')
      const proposta = readFileSync(`${base}.md`, 'utf8')
      const manifesto = JSON.parse(readFileSync(`${base}.manifesto.json`, 'utf8'))
      const nome = avatarDaAula(index)
      const entradas = lesson.sections.flatMap((s) => participacoes(s))
      expect(entradas.length, `${course}/${lesson.slug}`).toBeGreaterThan(0)
      expect(roteiro.match(new RegExp(`\\*\\*${nome} \\(avatar\\):\\*\\*`, 'g'))).toHaveLength(
        entradas.length,
      )
      expect(roteiro).not.toContain(`**${nome === 'Debinha' ? 'Dedé' : 'Debinha'} (avatar):**`)
      for (const s of lesson.sections) {
        if (s.questions) expect(s.avatar).toBeUndefined()
        if (!s.avatar) continue
        const fala = falas(s)
        const plano = manifesto.blocks.find(
          (b: { key: string }) => b.key === s.videoKey,
        )?.plannedVideo
        for (const avatar of participacoes(s)) {
          expect(planoAvatar(s, fala, index)).toContain(avatar.speech)
          expect(plano).toContain(avatar.after)
          expect(plano).toContain(`${nome} entra`)
          expect(plano).toContain(avatar.speech)
          expect(proposta).toContain(avatar.speech)
          expect(roteiro).toContain(`> “${avatar.speech}”`)
          expect(fala.join(' ')).not.toContain(avatar.speech)
          expect(s.bridge).not.toContain(avatar.speech)
        }
        // A fala completa da professora continua nos mesmos turnos, acrescida só da ponte de vídeo.
        const render = roteiroComAvatar(s, fala, '', index)
        const teacher = [...render.matchAll(/\*\*Professora:\*\*\s+> “([\s\S]*?)”\n/g)].map((m) =>
          m[1]!.replaceAll('\n>\n> ', ' '),
        )
        const restored = teacher
          .map((text, i) => {
            const reply = participacoes(s)[i - 1]?.reply
            return reply ? text.slice(reply.length).trimStart() : text
          })
          .join(' ')
        expect(restored).toBe(fala.join(' '))
      }
    }
  })
}
