import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { behaviorStatements, SZIRInputSchema, SZIRV2Schema } from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../blockly/blocks'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { buildKitGroups, buildProjectFromKitEntry, type KitEntry } from '../projects/KitGallery'
import { EXAMPLE_QA_CONTRACTS, type ExampleQAContract } from './qaContracts'

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.add(record.type)
    for (const item of Object.values(record)) collectTypes(item, out)
  }
  return out
}

function collectRpgMaps(
  value: unknown,
  created: Set<string> = new Set(),
  referenced: Set<string> = new Set(),
): { created: Set<string>; referenced: Set<string> } {
  if (Array.isArray(value)) {
    for (const item of value) collectRpgMaps(item, created, referenced)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (record.type === 'gk:rpgCreateMap' && typeof record.map === 'string') {
      created.add(record.map)
      expect(Array.isArray(record.body) && record.body.length > 0).toBe(true)
    } else if (
      ['gk:rpgOnEnterMap', 'gk:rpgSetStartMap', 'gk:rpgGoMap', 'gk:rpgCreateDoor'].includes(
        String(record.type),
      ) &&
      typeof record.map === 'string'
    ) {
      referenced.add(record.map)
    }
    for (const item of Object.values(record)) collectRpgMaps(item, created, referenced)
  }
  return { created, referenced }
}

function catalogEntries(): KitEntry[] {
  return buildKitGroups().flatMap((group) => group.entries)
}

beforeAll(() => {
  ensureBlocklyInitialized()
  for (const extension of OFFICIAL_CATALOG) {
    registerExtensionBlocks(extension.blockly.blocks)
  }
})

describe('contrato transversal dos 81 exemplos da KitGallery', () => {
  it('catálogo e contratos têm exatamente as mesmas chaves', () => {
    const catalogKeys = catalogEntries()
      .map((entry) => entry.key)
      .sort()
    const contractKeys = EXAMPLE_QA_CONTRACTS.map((contract) => contract.key).sort()

    expect(catalogKeys).toEqual(contractKeys)
    expect(catalogKeys).toHaveLength(81)
    expect(new Set(catalogKeys).size).toBe(81)
  })

  it('mantém a classificação acordada: 60 jogos, 9 demos e 12 explorações', () => {
    const counts = { game: 0, demo: 0, exploration: 0 }
    for (const contract of EXAMPLE_QA_CONTRACTS) counts[contract.experience] += 1
    expect(counts).toEqual({ game: 60, demo: 9, exploration: 12 })
  })

  const contractsByKey = new Map<string, ExampleQAContract>(
    EXAMPLE_QA_CONTRACTS.map((contract) => [contract.key, contract]),
  )

  for (const entry of catalogEntries()) {
    it(`${entry.key}: schema, blocos, projeto real, assets e round-trip sem warning`, () => {
      const contract = contractsByKey.get(entry.key)
      expect(contract).toBeDefined()
      if (!contract) throw new Error(`exemplo sem contrato: ${entry.key}`)
      expect(entry.name).toBe(contract.name)
      expect(entry.experience).toBe(contract.experience)
      expect(entry.description.trim().length).toBeGreaterThan(0)
      expect(contract.promise.trim().length).toBeGreaterThan(0)
      expect(contract.scenario.trim().length).toBeGreaterThan(0)
      expect(contract.interactions.length).toBeGreaterThan(0)

      expect(SZIRInputSchema.safeParse(entry.ir).success).toBe(true)
      expect(SZIRV2Schema.safeParse(entry.ir).success).toBe(true)
      const types = collectTypes(entry.ir)
      expect(types.has('rawJS')).toBe(false)
      expect(types.has('rawHTML')).toBe(false)
      expect(types.has('rawCSS')).toBe(false)

      const statements = behaviorStatements(entry.ir)
      const firstRpgMap = statements.findIndex((statement) => statement.type === 'gk:rpgCreateMap')
      if (firstRpgMap >= 0) {
        const explicitStart = statements.findIndex(
          (statement) => statement.type === 'gk:rpgSetStartMap',
        )
        expect(explicitStart).toBeGreaterThanOrEqual(0)
        expect(explicitStart).toBeLessThan(firstRpgMap)

        const maps = collectRpgMaps(statements)
        for (const referenced of maps.referenced) expect(maps.created.has(referenced)).toBe(true)
      }

      for (const extensionRef of entry.ir.extensions) {
        expect(
          OFFICIAL_CATALOG.some((extension) => extension.manifest.id === extensionRef.extensionId),
        ).toBe(true)
      }

      const project = buildProjectFromKitEntry(entry)
      expect(project.name).toBe(entry.name)
      expect(project.ir).toBe(entry.ir)
      expect(project.blocksState).toBeDefined()
      expect(project.files['index.html'].length).toBeGreaterThan(0)
      expect(typeof project.files['style.css']).toBe('string')
      expect(project.files['script.js'].length).toBeGreaterThan(0)
      expect(project.installedExtensions.map((extension) => extension.id)).toEqual(
        entry.ir.extensions.map((extension) => extension.extensionId),
      )
      expect(project.assets ?? []).toEqual(entry.assets ? [...entry.assets] : [])

      const warnings: string[] = []
      const originalWarn = console.warn
      console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(
          project.blocksState as Record<string, unknown>,
          workspace,
        )
        const saved = Blockly.serialization.workspaces.save(workspace)
        const roundTripped = buildIRFromWorkspace(workspace)
        expect(saved).toBeDefined()
        expect(SZIRV2Schema.safeParse(roundTripped).success).toBe(true)
        expect(roundTripped.html).toHaveLength(entry.ir.html.length)
        expect(behaviorStatements(roundTripped)).toHaveLength(behaviorStatements(entry.ir).length)
        const roundTripTypes = collectTypes(roundTripped)
        expect(roundTripTypes.has('rawJS')).toBe(false)
        expect(roundTripTypes.has('rawHTML')).toBe(false)
        expect(roundTripTypes.has('rawCSS')).toBe(false)
      } finally {
        workspace.dispose()
        console.warn = originalWarn
      }
      expect(warnings).toEqual([])

      const assetNames = (project.assets ?? []).map((asset) => asset.name)
      expect(new Set(assetNames).size).toBe(assetNames.length)
      for (const asset of project.assets ?? []) {
        expect(asset.dataUrl.startsWith('data:')).toBe(true)
      }
    })
  }
})
