import { describe, expect, it } from 'bun:test'
import {
  openTutorCategory,
  type TutorToolbox,
  type TutorToolboxItem,
  type TutorWorkspace,
} from './tutorCategory'

function category(name: string, blockType: string): TutorToolboxItem {
  return {
    getName: () => name,
    getContents: () => [{ kind: 'block', type: blockType }],
  }
}

describe('openTutorCategory', () => {
  it('usa o blockType para distinguir categorias homônimas de extensões', () => {
    const firstSound = category('Som', 'sz_audio_play')
    const secondSound = category('Som', 'sz_g2d_play_sound')
    const selected: TutorToolboxItem[] = []
    const toolbox: TutorToolbox = {
      getToolboxItems: () => [
        { getName: () => 'Áudio', getChildToolboxItems: () => [firstSound] },
        { getName: () => 'Jogo 2D', getChildToolboxItems: () => [secondSound] },
      ],
      setSelectedItem: (item) => {
        selected.push(item)
      },
    }
    const workspace: TutorWorkspace = {
      getToolbox: () => toolbox,
    }

    expect(openTutorCategory(workspace, 'sz_g2d_play_sound', 'Som')).toBe(true)
    expect(selected).toEqual([secondSound])
  })

  it('aceita somente o nome exato quando a categoria é dinâmica', () => {
    const sound = { getName: () => 'Som' }
    const selected: TutorToolboxItem[] = []
    const toolbox: TutorToolbox = {
      getToolboxItems: () => [{ getName: () => 'Sombreamento' }, sound],
      setSelectedItem: (item) => {
        selected.push(item)
      },
    }
    const workspace: TutorWorkspace = {
      getToolbox: () => toolbox,
    }

    expect(openTutorCategory(workspace, 'unknown', 'Som')).toBe(true)
    expect(selected).toEqual([sound])
  })
})
