import { expect, test } from '@playwright/test'
import { threeSources } from '../src/components/code/pro-templates/games/three'
import { animatedGlb } from './helpers/animatedGlb'
import { createTestProArtifact } from './helpers/proArtifact'

test('kit models normalize real bounds, cache one load, animate independent skeletons and dispose shared resources once', async ({
  page,
}) => {
  const errors: string[] = [],
    requests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (request.url().endsWith('/actor.glb')) requests.push(request.url())
  })
  const artifact = await createTestProArtifact(
    page,
    {
      'index.html': '<html><body><script type="module" src="/src/main.ts"></script></body></html>',
      'src/assets.ts': threeSources('three-exploration')['src/assets.ts']!,
      'public/actor.glb': animatedGlb(),
      'src/main.ts': `
      import { Box3, SkinnedMesh } from 'three'
      import { ModelLibrary } from './assets'
      const library = new ModelLibrary()
      const [first, second] = await Promise.all([library.actor('./actor.glb',1.4,'Acenar'), library.actor('./actor.glb',1.4,'Acenar')])
      const box = new Box3().setFromObject(first.object)
      let geometryDisposals = 0
      let firstMesh, secondMesh
      first.object.traverse(node => { if (node instanceof SkinnedMesh) firstMesh = node })
      second.object.traverse(node => { if (node instanceof SkinnedMesh) secondMesh = node })
      firstMesh.geometry.addEventListener('dispose', () => geometryDisposals++)
      first.update(.25); second.update(.75)
      const result = { height: box.max.y-box.min.y, base: box.min.y, center: (box.max.x+box.min.x)/2,
        firstJoint: firstMesh.skeleton.bones[0].position.x, secondJoint: secondMesh.skeleton.bones[0].position.x,
        sharedGeometry: firstMesh.geometry === secondMesh.geometry, separateSkeleton: firstMesh.skeleton !== secondMesh.skeleton }
      first.dispose()
      result.disposalsAfterActor = geometryDisposals
      second.update(.1)
      result.secondStillAnimates = secondMesh.skeleton.bones[0].position.x > result.secondJoint
      second.dispose(); library.dispose(); library.dispose()
      await Promise.resolve(); await Promise.resolve()
      result.disposalsAfterLibrary = geometryDisposals
      document.body.dataset.result = JSON.stringify(result)
    `,
    },
    'three-ts',
  )
  try {
    const body = page.frameLocator('#game').locator('body')
    await expect(body).toHaveAttribute('data-result', /height/)
    const result = JSON.parse((await body.getAttribute('data-result'))!)
    expect(result.height).toBeCloseTo(1.4)
    expect(result.base).toBeCloseTo(0)
    expect(result.center).toBeCloseTo(0)
    expect(result.firstJoint).toBeCloseTo(0.5)
    expect(result.secondJoint).toBeCloseTo(1.5)
    expect(result.sharedGeometry).toBe(true)
    expect(result.separateSkeleton).toBe(true)
    expect(result.secondStillAnimates).toBe(true)
    expect(result.disposalsAfterActor).toBe(0)
    expect(result.disposalsAfterLibrary).toBe(1)
    expect(requests).toHaveLength(1)
    expect(errors).toEqual([])
  } finally {
    await artifact.dispose()
  }
})
