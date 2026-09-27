import type { Block } from './corre-dino-projetos-qa'
import { courseProjects as naveProjects } from './nave-contra-asteroides-projetos-qa'

const number = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
const sheet = (name: string, image: string, size: number): Block => ({
  type: 'sz_g2d_load_spritesheet',
  fields: { NAME: name, IMAGE: image },
  inputs: { FW: number(size), FH: number(size) },
})
const animate = (sprite: string, sheet: string, animation: string): Block => ({
  type: 'sz_g2d_animate_sprite',
  fields: { SPRITE: sprite, SHEET: sheet, ANIM: animation },
  inputs: { FROM: number(0), TO: number(1), FPS: number(8) },
})

/** Continuação real do Dia 5: troca de arte mantém controles, colisões, placar e reinício. */
export function courseProjects(): ReturnType<typeof naveProjects> {
  const inherited = naveProjects()[5]!
  const project = structuredClone(inherited)
  function visit(fn: (block: Block) => void) {
    const pending = [...project.blocksState.blocks.blocks]
    while (pending.length) {
      const block = pending.pop()!
      fn(block)
      if (block.next) pending.push(block.next.block)
      for (const input of Object.values(block.inputs ?? {}))
        if (input.block) pending.push(input.block)
    }
  }
  const start = project.blocksState.blocks.blocks.find((block) => block.type === 'sz_frame_start')!
  function append(block: Block) {
    let tail = start.inputs!.CHILDREN!.block!
    while (tail.next) tail = tail.next.block
    tail.next = { block }
  }
  visit((block) => {
    if (block.type !== 'sz_g2d_create_ship') return
    block.type = 'sz_g2d_create_image_sprite'
    block.fields = { NAME: 'nave', IMAGE: 'nave' }
    block.inputs = { ...block.inputs, W: number(54), H: number(54) }
  })
  append(sheet('folha-nave', 'nave', 32))
  append(animate('nave', 'folha-nave', 'voando'))
  const six = structuredClone(project)
  append(sheet('folha-asteroide', 'asteroide', 64))
  visit((block) => {
    if (block.type !== 'sz_g2d_spawn_asteroid') return
    block.type = 'sz_g2d_spawn_image_in_group'
    block.fields = { GROUP: 'asteroides', NAME: 'asteroide', IMAGE: 'asteroide' }
    const inputs = { ...block.inputs }
    delete inputs.SIZE
    block.inputs = { ...inputs, W: number(40), H: number(40) }
    const animation = animate('asteroide', 'folha-asteroide', 'girando')
    animation.next = block.next
    block.next = { block: animation }
  })
  return { 1: inherited, 6: six, 7: project, 8: structuredClone(project) }
}
