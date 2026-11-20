import { SPRITE_DECL_BLOCKS } from '../../blockly/fields/FieldSpritePicker'
import { checkScriptNames } from '../../check/instrumentCheckScript'

/**
 * Os nomes que o formulário de "Meus testes" oferece (nota da prancha "um teste novo": "As listas
 * mostram os nomes que existem no projeto"). As variáveis são as que o leitor das variáveis
 * consegue ler no script (`checkScriptNames`, o mesmo levantamento do leitor). Os sprites são os
 * que os blocos de criar sprite nomeiam (a mesma tabela do seletor de sprites do Jogo 2D); um
 * jogo sem esses blocos (código digitado na Ponte) oferece as variáveis também como sprites.
 */
export interface StudentTestNames {
  variables: string[]
  sprites: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** Os nomes dos sprites criados pelos blocos do estado guardado (pilha explícita: projeto grande). */
export function spriteNamesInBlocksState(state: unknown): string[] {
  const names: string[] = []
  const stack: unknown[] = [state]
  while (stack.length) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push(node[i])
      continue
    }
    if (!isRecord(node)) continue
    const declaration = typeof node.type === 'string' ? SPRITE_DECL_BLOCKS[node.type] : undefined
    if (declaration && isRecord(node.fields)) {
      const name = node.fields[declaration.nameField ?? 'NAME']
      if (typeof name === 'string' && name.trim()) names.push(name)
    }
    // Os filhos depois do próprio bloco, na ordem em que aparecem.
    const children = Object.entries(node)
      .filter(([key]) => key !== 'fields')
      .map(([, value]) => value)
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i])
  }
  return [...new Set(names)]
}

export function studentTestNames(script: string, blocksState: unknown): StudentTestNames {
  const variables = checkScriptNames(script)
  const sprites = spriteNamesInBlocksState(blocksState)
  return { variables, sprites: sprites.length ? sprites : variables }
}
