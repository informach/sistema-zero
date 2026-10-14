import { describe, expect, test } from 'bun:test'
import {
  clipboardToCuration,
  curationToClipboard,
  defaultLiveStudio,
  toggleStudioMode,
} from '../src/lib/live-studio-curation'

describe('curadoria do Estúdio no encontro ao vivo', () => {
  test('encontro novo: só Blocos e sem revelar o avançado', () => {
    expect(defaultLiveStudio()).toEqual({ allowedModes: ['blocks'], allowLevelReveal: false })
  })

  test('os modos seguem a ordem fixa e nunca ficam vazios', () => {
    expect(toggleStudioMode(['blocks'], 'code', true)).toEqual(['blocks', 'code'])
    expect(toggleStudioMode(['code', 'blocks'], 'bridge', true)).toEqual([
      'blocks',
      'bridge',
      'code',
    ])
    expect(toggleStudioMode(['blocks'], 'blocks', false)).toEqual(['blocks'])
    expect(toggleStudioMode(['blocks', 'bridge'], 'blocks', false)).toEqual(['bridge'])
    expect(toggleStudioMode(undefined, 'bridge', true)).toEqual(['blocks', 'bridge'])
  })

  test('copiar e colar a configuração do bloco Estúdio das aulas gravadas', () => {
    const curation = {
      level: 'intermediario-2d',
      allowedModes: ['blocks' as const, 'bridge' as const],
      allowLevelReveal: true,
      allowCategories: ['logic'],
      allowBlocks: ['sz_move'],
    }
    const clip = curationToClipboard(curation)
    expect(clip).toEqual({
      level: 'intermediario-2d',
      modes: ['blocks', 'bridge'],
      categories: ['logic'],
      allowReveal: true,
      allowBlocks: ['sz_move'],
    })
    expect(clipboardToCuration(clip)).toEqual(curation)
    // Um modo desconhecido vindo do navegador não entra; sem nenhum, volta a Blocos.
    expect(clipboardToCuration({ ...clip, modes: ['estranho' as never] }).allowedModes).toEqual([
      'blocks',
    ])
  })
})
