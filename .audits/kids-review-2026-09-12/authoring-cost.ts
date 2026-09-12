import { projectCheckAuthoring } from '../../packages/studio/src/blockly/projectCheckAuthoring'

const model = projectCheckAuthoring({
  initialProject: {
    installedExtensions: [
      'game-2d',
      'game-2d-advanced',
      'game-3d',
      'game-3d-advanced',
      'world-3d',
    ].map((id) => ({ id })),
  },
})
for (const blockType of ['sz_g2d_setup_stage', 'sz_val_number', 'sz_g2d_create_sprite']) {
  const start = performance.now()
  const rule = { type: 'usesBlock' as const, blockType }
  const areas = model.areas(rule)
  const containers = model.containers(rule)
  console.log(
    JSON.stringify({
      blockType,
      areas,
      containers: containers.length,
      elapsedMs: Math.round(performance.now() - start),
    }),
  )
}
