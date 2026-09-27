import { readFileSync, writeFileSync } from 'node:fs'
import { isLearningManifest, type SectionProjectCheck } from '../../packages/core/src/learning'

const check = (
  id: string,
  label: string,
  blockType: string,
  extra: object = {},
): SectionProjectCheck => ({
  id,
  label,
  rule: { type: 'usesBlock', blockType, area: 'start', ...extra },
})
const updates: Record<string, Record<string, SectionProjectCheck[]>> = {
  'corre-dino/aula-01': {
    'construir-2': [
      check('tela', 'Preparar uma tela de 480 × 270 em Ao iniciar', 'sz_g2d_setup_stage', {
        inputs: { W: 480, H: 270 },
      }),
      check('borda', 'Encaixar a borda com espessura 4 em Ao iniciar', 'sz_g2d_stage_border', {
        inputs: { WIDTH: 4 },
      }),
    ],
    'construir-4': [
      check(
        'dino',
        'Criar dino em x 110, y 150 e tamanho 64, dentro de Ao iniciar',
        'sz_g2d_create_dino',
        { fields: { NAME: 'dino' }, inputs: { X: 110, Y: 150, SIZE: 64 } },
      ),
    ],
  },
  'desafio-primeiro-jogo/dia-1': {
    'construir-2': [
      check('tela', 'Preparar a tela de 800 × 480 em Ao iniciar', 'sz_g2d_setup_stage', {
        inputs: { W: 800, H: 480 },
      }),
    ],
    'construir-3': [
      check(
        'nave',
        'Criar nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar',
        'sz_g2d_create_ship',
        { fields: { NAME: 'nave' }, inputs: { X: 400, Y: 410, W: 54, H: 62 } },
      ),
    ],
    'construir-4': [
      check(
        'motor',
        'Encaixar A cada quadro do jogo em Enquanto estiver rodando',
        'sz_g2d_update_each_frame',
        { area: 'loops' },
      ),
    ],
  },
}
for (const [directory, sections] of Object.entries(updates)) {
  const base = `docs/aulas-interativas/${directory}`
  const manifest: unknown = JSON.parse(readFileSync(`${base}/manifesto.json`, 'utf8'))
  if (!isLearningManifest(manifest)) throw new Error(`Invalid manifest ${base}`)
  for (const section of manifest.sections) {
    const checks = sections[section.key]
    if (!checks) continue
    for (const key of section.completion?.blockIds ?? []) {
      const block = manifest.blocks.find((b) => b.key === key)
      if (block && 'content' in block && block.content.kind === 'interactive')
        block.content.required = false
    }
    section.completion = { version: 1, blockIds: [], projectChecks: checks }
  }
  writeFileSync(`${base}/manifesto.json`, `${JSON.stringify(manifest, null, 2)}\n`)
  const marker = '\n## Verificações práticas por seção\n'
  const roteiro = readFileSync(`${base}/roteiro.md`, 'utf8').split(marker)[0]
  writeFileSync(
    `${base}/roteiro.md`,
    `${roteiro}${marker}\n${Object.entries(sections)
      .map(([key, checks]) => `- **${key}:** ${checks.map((c) => c.label).join('; ')}.`)
      .join(
        '\n',
      )}\n\nNestas etapas, as perguntas de revisão são opcionais. O avanço depende do projeto salvo na verificação. Cores livres não são avaliadas. Montar uma área confirma apenas a preparação; não comprova que o jogo executou.\n`,
  )
}
