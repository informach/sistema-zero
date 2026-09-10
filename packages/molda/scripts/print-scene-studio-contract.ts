import { makeSceneStudioContract } from '../src/testing/sceneStudioContract'
import { makeSceneStudioSkinContract } from '../src/testing/sceneStudioSkinContract'

// Print only. Updating the reviewed Studio fixture is an explicit separate file edit.
console.log(
  JSON.stringify(
    process.argv.includes('--skin') ? makeSceneStudioSkinContract() : makeSceneStudioContract(),
    null,
    2,
  ),
)
