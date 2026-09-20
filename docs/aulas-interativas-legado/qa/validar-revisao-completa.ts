import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  blockCheckpoint,
  evaluateLearning,
  isLearningManifest,
} from '../../../packages/core/src/learning'
import {
  evaluateStudioSectionProject,
  studioSectionCompletionIssues,
} from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { conferirCenasNoRoteiro, eCena } from './cenas-editorial'
import { readOriginal } from './corre-dino-editorial'
import { courseProjects } from './corre-dino-projetos-qa'
import { construirCorreDino } from './gerar-candidatos-v6'
import { gravarGeracao } from './gravar-geracao'

const sourceDirectory = process.argv[2] ?? process.env.CORRE_DINO_ROTEIROS
assert(sourceDirectory, 'Informe a pasta dos roteiros originais')
const root = resolve(import.meta.dir, '../corre-dino-v6')
const snapshots = courseProjects()
// Os arquivos publicados são exatamente o que a receita produz (manifesto, montagem e roteiro).
const geracao = construirCorreDino(sourceDirectory)
assert.deepEqual(
  JSON.parse(readFileSync(resolve(root, 'catalogo.json'), 'utf8')),
  geracao.catalog,
  'catálogo reproduzível',
)
assert.deepEqual(
  JSON.parse(readFileSync(resolve(root, 'demonstracoes-opcionais.json'), 'utf8')),
  geracao.demonstrations,
  'demonstrações opcionais reproduzíveis',
)
const results = []
for (let lesson = 1; lesson <= 13; lesson++) {
  const slug = `aula-${String(lesson).padStart(2, '0')}`
  const candidate: unknown = JSON.parse(readFileSync(resolve(root, slug, 'manifesto.json'), 'utf8'))
  assert(isLearningManifest(candidate), `${slug}: formato`)
  const gerada = geracao.lessons[lesson - 1]!
  assert.equal(gerada.slug, slug)
  // ⚠️ A ordem das chaves conta: o `deepEqual` não a vê, a comparação do texto do JSON vê.
  assert.equal(
    JSON.stringify(candidate),
    JSON.stringify(gerada.manifest),
    `${slug}: manifesto reproduzível`,
  )
  const original = readOriginal(sourceDirectory, lesson)
  const montage = JSON.parse(readFileSync(resolve(root, slug, 'montagem.json'), 'utf8'))
  assert.deepEqual(
    montage,
    JSON.parse(JSON.stringify(gerada.montage)),
    `${slug}: montagem reproduzível`,
  )
  assert.equal(montage.sourceHash, original.hash, `${slug}: fonte alterada depois da revisão`)
  const normalize = (value: string) => value.replaceAll('**', '').replace(/\s+/g, ' ').trim()
  for (const clip of montage.clips) {
    const part = original.parts.find((part) => part.heading === clip.sourceSection)
    assert(part, `${slug}: parte ${clip.sourceSection}`)
    const spoken = normalize(part.narration)
    const entry = spoken.indexOf(normalize(clip.entry))
    assert(
      entry >= 0 && spoken.indexOf(normalize(clip.exit), entry) >= 0,
      `${slug}: âncoras de ${clip.key}`,
    )
    assert.equal(clip.inSeconds, null)
    assert.equal(clip.outSeconds, null)
  }
  const sections = candidate.sections.map((s) => ({
    ...s,
    id: s.key,
    blockIds: s.blockKeys,
    workspaceBlockId: s.workspaceKey,
  }))
  const blocks = candidate.blocks.map((b) => ({
    id: b.key,
    content:
      'content' in b
        ? b.content
        : 'plannedVideo' in b
          ? { kind: 'video' }
          : { kind: 'studio', initialProject: { installedExtensions: [{ id: 'game-2d' }] } },
  }))
  assert.deepEqual(
    studioSectionCompletionIssues(sections, blocks),
    [],
    `${slug}: autoria e critérios`,
  )
  assert.equal(
    candidate.blocks.filter((b) => 'existing' in b && b.existing.kind === 'studio').length,
    1,
  )
  assert.equal(
    new Set(sections.filter((s) => s.workspaceBlockId).map((s) => s.workspaceBlockId)).size,
    1,
  )
  const delivery = sections.find((s) => s.intent === 'delivery')!
  assert(delivery.completion?.projectChecks?.length)
  const checks = evaluateStudioSectionProject(delivery.completion.projectChecks, snapshots[lesson])
  assert.deepEqual(
    checks.filter((check) => !check.passed),
    [],
    `${slug}: projeto final independente`,
  )
  const script = readFileSync(resolve(root, slug, 'roteiro.md'), 'utf8')
  assert.equal(script, gerada.roteiro, `${slug}: roteiro reproduzível`)
  for (const section of sections) {
    assert(script.includes(section.title), `${slug}: seção sem roteiro`)
    if (section.intent === 'application')
      assert(section.completion?.projectChecks?.length && section.workspaceBlockId)
    if (section.intent === 'demonstration')
      assert(!section.workspaceBlockId, 'Demonstração não dá controle do projeto')
  }
  const interactions = candidate.blocks.filter(
    (b) => 'content' in b && b.content.kind === 'interactive',
  )
  // Desde 15/09/2026 a aula também tem demonstrações de cena, sempre depois de um clipe numa seção de
  // demonstração. As experimentações ficam em seções de experimentar (ou, na Aula 1, junto da construção).
  for (const block of interactions) {
    assert(eCena(block), `${slug}/${block.key}: toda atividade do Corre Dino é uma cena`)
    const section = sections.find((s) => s.blockIds.includes(block.key))!
    const content = block.content
    assert(!evaluateLearning(content, {}).passed, `${slug}/${block.key}: sem cena não conclui`)
    if (content.activity.type === 'demonstration') {
      assert.equal(section.intent, 'demonstration', `${slug}/${block.key}: seção da demonstração`)
      const indice = section.blockIds.indexOf(block.key)
      assert(
        indice > 0 &&
          candidate.blocks.some((b) => b.key === section.blockIds[0] && 'plannedVideo' in b),
        `${slug}/${block.key}: a demonstração vem depois do clipe`,
      )
    } else {
      assert(
        section.intent === 'exploration' || section.intent === 'application',
        `${slug}/${block.key}: seção da experimentação`,
      )
      const pergunta = blockCheckpoint(content)
      // ⚠️⚠️ A experimentação termina numa pergunta, A NÃO SER que a aula tenha dispensado a do fim
      // (`semPerguntaFinal`, decisão da dona de 17/09/2026). O que não pode é a pergunta sumir por
      // ACIDENTE: sem esta conferência, um bloco que deixasse de herdar a do modelo passaria calado.
      if (content.semPerguntaFinal)
        assert(!pergunta, `${slug}/${block.key}: dispensou a pergunta e ainda recebeu uma`)
      else {
        assert(pergunta, `${slug}/${block.key}: a experimentação termina numa pergunta`)
        assert(
          !evaluateLearning(content, { checkpoint: pergunta.correctChoiceId }).passed,
          `${slug}/${block.key}: a resposta certa sem a cena não conclui`,
        )
      }
    }
    assert.deepEqual(
      section.completion?.blockIds.filter((k) => interactions.some((b) => b.key === k)),
      [block.key],
      `${slug}/${block.key}: a cena conclui a seção`,
    )
  }
  assert.deepEqual(
    conferirCenasNoRoteiro(slug, candidate, montage, script, gerada.cenasAnteriores),
    [],
    `${slug}: cenas e marcas no roteiro`,
  )
  results.push({
    lesson: slug,
    sourceHash: original.hash,
    sections: sections.length,
    demonstrations: sections.filter((s) => s.intent === 'demonstration').length,
    experiments: interactions.filter(
      (b) =>
        'content' in b &&
        b.content.kind === 'interactive' &&
        b.content.activity.type === 'experimentation',
    ).length,
    sceneDemonstrations: interactions.filter(
      (b) =>
        'content' in b &&
        b.content.kind === 'interactive' &&
        b.content.activity.type === 'demonstration',
    ).length,
    clips: montage.clips.length,
    clipsWithOldScene: montage.clips.filter((c: { cenaAnterior?: unknown }) => c.cenaAnterior)
      .length,
    finalChecks: checks.length,
  })
}
gravarGeracao([
  [
    resolve(import.meta.dir, 'revisao-13-aulas-verificacao.json'),
    {
      status: 'passed',
      scope:
        'Local: 13 fontes, reprodução de manifestos, montagens e roteiros, cenas descritas com os textos de hoje, marcas de cena anterior, contratos do catálogo Jogo 2D e programas finais independentes. Não inclui mídia, banco ou publicação.',
      totals: {
        lessons: results.length,
        sections: results.reduce((sum, r) => sum + r.sections, 0),
        clips: results.reduce((sum, r) => sum + r.clips, 0),
        experiments: results.reduce((sum, r) => sum + r.experiments, 0),
        sceneDemonstrations: results.reduce((sum, r) => sum + r.sceneDemonstrations, 0),
        clipsWithOldScene: results.reduce((sum, r) => sum + r.clipsWithOldScene, 0),
      },
      results,
    },
  ],
])
console.log(JSON.stringify(results, null, 2))
