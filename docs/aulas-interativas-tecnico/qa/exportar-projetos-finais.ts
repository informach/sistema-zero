/** Exporta os projetos completos e inventários para as pastas de uso diário. */
import { deepStrictEqual } from 'node:assert'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Project } from '../../../packages/studio/src/core/project'
import { sanitizeImportedProjectSnapshot } from '../../../packages/studio/src/state/projectValidation'
import {
  montarProjetoCadeTodoMundo,
  montarProjetoCadeTodoMundoCompleto,
} from './cade-todo-mundo-projeto'
import { PASTA_CURSOS } from './caminhos'
import { etapasDino, projetoDino } from './corre-dino-etapas'
import { montarProjetoFarol } from './desafio-farol-projeto'
import { etapasMeuJeito, projetoMeuJeito } from './meu-jeito-etapas'
import { etapasNave, projetoNave } from './nave-contra-asteroides-etapas'

function tiposDeBlocos(value: unknown, result = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return result
  const node = value as Record<string, unknown>
  if (typeof node.type === 'string' && node.type.startsWith('sz_')) result.add(node.type)
  for (const child of Object.values(node)) tiposDeBlocos(child, result)
  return result
}

function materiais() {
  return [
    {
      curso: 'cade-todo-mundo',
      projeto: { ...montarProjetoCadeTodoMundoCompleto(), name: 'Cadê Todo Mundo?' },
      etapas: [montarProjetoCadeTodoMundo(), montarProjetoCadeTodoMundo(true)],
    },
    {
      curso: 'desafio-primeiro-jogo',
      projeto: montarProjetoFarol('concluido'),
      etapas: (['dia-1', 'dia-2', 'dia-3'] as const).map(montarProjetoFarol),
    },
    {
      curso: 'nave-contra-asteroides',
      projeto: projetoNave(9),
      etapas: Object.values(etapasNave()),
    },
    {
      curso: 'corre-dino',
      projeto: projetoDino(13),
      etapas: Object.values(etapasDino()),
    },
    {
      curso: 'o-jogo-do-meu-jeito',
      projeto: projetoMeuJeito(8),
      etapas: Object.values(etapasMeuJeito()),
    },
  ]
}

const conferir = process.argv.includes('--check')
for (const { curso, projeto, etapas } of materiais()) {
  const imported = sanitizeImportedProjectSnapshot(projeto, projeto).project
  for (const key of ['blocksState', 'ir', 'files', 'assets', 'installedExtensions'] as const)
    deepStrictEqual(imported[key], projeto[key], `${curso}: a importação alterou ${key}`)
  const types = tiposDeBlocos(projeto.blocksState)
  for (const etapa of etapas) tiposDeBlocos(etapa.blocksState, types)
  // As paletas também incluem peças de conferência retiradas antes do jogo final.
  const directory = resolve(PASTA_CURSOS, curso)
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.manifesto.json'))) {
    const manifest = JSON.parse(readFileSync(resolve(directory, file), 'utf8')) as {
      blocks: Array<{ content?: { allowBlocks?: string[] } }>
    }
    for (const block of manifest.blocks)
      for (const type of block.content?.allowBlocks ?? []) types.add(type)
  }
  const inventory = { blocks: [...types].sort() }
  const files: Array<[string, Project | typeof inventory]> = [
    ['projeto-final.szproject.json', projeto],
    ['blocos.json', inventory],
  ]
  for (const [name, value] of files) {
    const path = resolve(PASTA_CURSOS, curso, name)
    if (conferir) {
      const actual = JSON.parse(readFileSync(path, 'utf8'))
      if (JSON.stringify(actual) !== JSON.stringify(value))
        throw new Error(`Material desatualizado: ${path}`)
    } else {
      writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
    }
  }
  console.log(
    `${conferir ? 'OK' : 'Exportado'}: ${curso} — projeto completo e ${types.size} tipos de blocos`,
  )
}
