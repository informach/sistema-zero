import { describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import skinned from '../../../official-extensions/__tests__/three3d/molda-skinned.json'
import {
  type ClipBlockLike,
  resolveClipModels,
  resolveModelClipOptions,
} from '../modelClipResolution'

/** Bloco de mentira: campos + corpo BODY + próximo da pilha. */
function fake(
  type: string,
  fields: Record<string, string> = {},
  body: ClipBlockLike[] = [],
): ClipBlockLike & { next: ClipBlockLike | null } {
  const block = {
    type,
    next: null as ClipBlockLike | null,
    getFieldValue: (name: string) => fields[name] ?? null,
    getInputTargetBlock: (name: string) => (name === 'BODY' ? (body[0] ?? null) : null),
    getNextBlock: () => block.next,
  }
  return block
}

/** Encadeia as peças como uma pilha do Blockly. */
function stack(blocks: Array<ClipBlockLike & { next: ClipBlockLike | null }>) {
  blocks.forEach((block, i) => {
    block.next = blocks[i + 1] ?? null
  })
  return blocks
}

function part(shape: string, model = '') {
  return fake('sz_g3k_part', { SHAPE: shape, MODEL: model })
}

function asset(name: string, kind: ProjectAsset['kind'] = 'model3d'): ProjectAsset {
  return { id: `id-${name}`, name, kind, dataUrl: `data:x;base64,${name}`, source: 'library' }
}

const CLIPS: Record<string, string[]> = {
  heroi: ['Andar', 'Pular'],
  robo: ['Girar'],
  casa: [],
}
const readClips = (a: ProjectAsset) => CLIPS[a.name] ?? null
const ASSETS = [asset('heroi'), asset('robo'), asset('casa'), asset('ceu', 'environment3d')]

describe('resolveClipModels — do bloco ao modelo', () => {
  it('Jogo 3D: OBJ → "Criar o objeto … com o modelo" de mesmo nome', () => {
    const all = [
      fake('sz_g3d_create_model_file', { NAME: 'nave', MODEL: 'robo' }),
      fake('sz_g3d_create_model_file', { NAME: 'heroi', MODEL: 'heroi' }),
    ]
    const play = fake('sz_g3d_play_animation', { OBJ: 'heroi', CLIP: 'Andar' })
    expect(resolveClipModels(play, [...all, play])).toEqual(['heroi'])
    expect(resolveClipModels(fake('sz_g3d_play_animation', { OBJ: 'outro' }), all)).toEqual([])
  })

  it('Avançado: MOLD → molde → ÚLTIMA peça "modelo importado" com arquivo', () => {
    const mold = fake(
      'sz_g3k_define_mold',
      { NAME: 'heroi' },
      stack([
        part('box'),
        part('modelo', 'robo'),
        part('sphere'),
        part('modelo', 'heroi'),
        part('modelo', ''),
      ]),
    )
    const other = fake('sz_g3k_define_mold', { NAME: 'inimigo' }, stack([part('modelo', 'robo')]))
    const all = [mold, other]
    for (const type of ['sz_g3k_state_anim', 'sz_g3k_on_anim_end']) {
      expect(resolveClipModels(fake(type, { MOLD: 'heroi' }), all)).toEqual(['heroi'])
      expect(resolveClipModels(fake(type, { MOLD: 'nada' }), all)).toEqual([])
    }
  })

  it('Avançado: play_anim recebe variável → união dos modelos de todos os moldes', () => {
    const all = [
      fake('sz_g3k_define_mold', { NAME: 'a' }, stack([part('modelo', 'heroi')])),
      fake('sz_g3k_define_mold', { NAME: 'b' }, stack([part('box')])),
      fake('sz_g3k_define_mold', { NAME: 'c' }, stack([part('modelo', 'robo')])),
      fake('sz_g3k_define_mold', { NAME: 'd' }, stack([part('modelo', 'heroi')])),
    ]
    expect(resolveClipModels(fake('sz_g3k_play_anim', { CHAR: 'x' }), all)).toEqual([
      'heroi',
      'robo',
    ])
    // O "velocidade da animação" não tem campo CLIP: não é bloco do seletor (caso removido).
    expect(resolveClipModels(fake('sz_g3k_anim_speed', { CHAR: 'x' }), all)).toEqual([])
  })

  it('Mundo 3D: "Pôr o modelo" usa o MODEL do próprio bloco', () => {
    expect(resolveClipModels(fake('sz_w3d_place_model', { MODEL: 'robo' }), [])).toEqual(['robo'])
    expect(resolveClipModels(fake('sz_w3d_place_model', { MODEL: '' }), [])).toEqual([])
  })

  it('Mundo 3D: personagem → modelo do personagem; amigo → modelo do amigo de mesmo nome', () => {
    const all = [
      fake('sz_w3d_person_model', { MODEL: 'heroi' }),
      fake('sz_w3d_npc_model', { MODEL: 'robo', NAME: 'Lia' }),
      fake('sz_w3d_npc_model', { MODEL: 'casa', NAME: 'Ana' }),
    ]
    expect(
      resolveClipModels(fake('sz_w3d_model_anim', { WHO: 'personagem', NAME: 'Lia' }), all),
    ).toEqual(['heroi'])
    expect(
      resolveClipModels(fake('sz_w3d_model_anim', { WHO: 'amigo', NAME: 'Lia' }), all),
    ).toEqual(['robo'])
    expect(resolveClipModels(fake('sz_w3d_model_anim', { WHO: 'amigo', NAME: 'Zé' }), all)).toEqual(
      [],
    )
  })

  it('bloco que não toca animação não resolve nada', () => {
    expect(resolveClipModels(fake('sz_g3d_create_box'), [])).toEqual([])
  })
})

describe('resolveModelClipOptions — clipes e reserva', () => {
  it('modelo resolvido → só os clipes dele', () => {
    const options = resolveModelClipOptions(
      fake('sz_w3d_place_model', { MODEL: 'heroi' }),
      [],
      ASSETS,
      readClips,
    )
    expect(options).toEqual({
      resolved: true,
      groups: [{ model: 'heroi', clips: ['Andar', 'Pular'] }],
    })
  })

  it('nada resolvido → todos os modelos do projeto, agrupados (céu .hdr fica de fora)', () => {
    const options = resolveModelClipOptions(
      fake('sz_g3d_play_animation', { OBJ: 'ninguem' }),
      [],
      ASSETS,
      readClips,
    )
    expect(options).toEqual({
      resolved: false,
      groups: [
        { model: 'heroi', clips: ['Andar', 'Pular'] },
        { model: 'robo', clips: ['Girar'] },
        { model: 'casa', clips: [] },
      ],
    })
  })

  it('modelo resolvido que não existe no projeto também cai na reserva', () => {
    const options = resolveModelClipOptions(
      fake('sz_w3d_place_model', { MODEL: 'apagado' }),
      [],
      ASSETS,
      readClips,
    )
    expect(options.resolved).toBe(false)
    expect(options.groups.map((g) => g.model)).toEqual(['heroi', 'robo', 'casa'])
  })

  it('sem modelos no projeto → nenhum grupo', () => {
    expect(resolveModelClipOptions(fake('sz_w3d_place_model'), [], [], readClips)).toEqual({
      resolved: false,
      groups: [],
    })
  })

  it('o leitor padrão lê os clipes do próprio .glb', () => {
    const glb: ProjectAsset = { ...asset('boneco'), dataUrl: skinned.dataUrl }
    const options = resolveModelClipOptions(
      fake('sz_w3d_place_model', { MODEL: 'boneco' }),
      [],
      [glb],
    )
    expect(options.groups).toEqual([{ model: 'boneco', clips: ['Acenar', 'Esticar'] }])
  })
})
