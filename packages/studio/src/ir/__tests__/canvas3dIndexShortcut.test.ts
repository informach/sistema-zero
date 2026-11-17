import { describe, expect, it } from 'bun:test'
import { loadExtensionExamples } from '#extensions'
import { projetosDosCursos } from '../../../../../docs/aulas-interativas-tecnico/qa/matriz-compatibilidade'
import { OFFICIAL_CATALOG } from '../../official-extensions'
import { behaviorStatements, type SZIRInput } from '..'
import { programmingChildBodyEntries } from '../programmingExecution'
import {
  canvas3DContextHasImportedClass,
  createCanvas3DStatementContextIndex,
  programImportsThreeClasses,
} from '../programmingReferences'
import type { JSStatement } from '../schema'

/**
 * O validador do schema deixa de montar o índice Canvas 3D quando o programa não importa classes
 * do three (`programImportsThreeClasses`). A troca só é exata se, nesses programas, o índice
 * inteiro não tiver classe importada em statement nenhum. Aqui isso é conferido contra o índice
 * de verdade, em todos os exemplos oficiais e nos projetos dos cursos gravados.
 */

function todos(statements: JSStatement[]): JSStatement[] {
  const saida: JSStatement[] = []
  const fila: JSStatement[][] = [statements]
  while (fila.length > 0) {
    for (const statement of fila.pop() ?? []) {
      saida.push(statement)
      for (const filho of programmingChildBodyEntries(statement)) fila.push(filho.body)
    }
  }
  return saida
}

async function acervo(): Promise<{ nome: string; ir: SZIRInput }[]> {
  const itens: { nome: string; ir: SZIRInput }[] = []
  for (const extensao of OFFICIAL_CATALOG) {
    const exemplos = await loadExtensionExamples(extensao)
    for (const [indice, exemplo] of exemplos.entries())
      itens.push({ nome: `${extensao.manifest.id}/${indice}`, ir: exemplo.ir as SZIRInput })
  }
  for (const { curso, origem, projeto } of projetosDosCursos())
    itens.push({
      nome: `${curso}/${origem}`,
      ir: (projeto as unknown as { ir: SZIRInput }).ir,
    })
  return itens
}

describe('atalho do índice Canvas 3D no validador', () => {
  it('sem import de classes do three, o índice não tem classe importada em lugar nenhum', async () => {
    const itens = await acervo()
    expect(itens.length).toBeGreaterThan(100)
    let semImport = 0
    let comImport = 0
    let conferidos = 0
    for (const { nome, ir } of itens) {
      const statements = behaviorStatements(ir)
      if (programImportsThreeClasses(statements)) {
        comImport += 1
        continue
      }
      semImport += 1
      const indice = createCanvas3DStatementContextIndex(statements)
      for (const statement of todos(statements)) {
        conferidos += 1
        if ((indice.get(statement)?.importedClasses.size ?? 0) !== 0)
          throw new Error(`${nome}: o índice tem classe importada sem import do three`)
      }
    }
    // Nenhum exemplo importa classes do three à mão (o gerador injeta os imports): o caso
    // positivo é o do teste abaixo.
    expect(semImport).toBeGreaterThan(50)
    expect(comImport).toBe(0)
    expect(conferidos).toBeGreaterThan(5000)
  })

  it('com o import, o índice de verdade guarda a classe (e o atalho não é usado)', () => {
    const importa = {
      type: 'importNamed',
      names: ['OrbitControls'],
      module: 'three/addons/controls/OrbitControls.js',
    } as JSStatement
    expect(programImportsThreeClasses([importa])).toBe(true)
    expect(
      programImportsThreeClasses([
        { type: 'importNamed', names: ['x'], module: 'outra' } as JSStatement,
      ]),
    ).toBe(false)
    const indice = createCanvas3DStatementContextIndex([importa])
    expect(canvas3DContextHasImportedClass(indice.get(importa), 'OrbitControls')).toBe(true)
  })
})
