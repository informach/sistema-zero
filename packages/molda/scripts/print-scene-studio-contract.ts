import { makeSceneStudioContract } from '../src/testing/sceneStudioContract'
import { makeSceneStudioFlipbookContract } from '../src/testing/sceneStudioFlipbookContract'
import { makeSceneStudioSkinContract } from '../src/testing/sceneStudioSkinContract'

// Print only. Updating the reviewed Studio fixture is an explicit separate file edit.
const contract = process.argv.includes('--skin')
  ? makeSceneStudioSkinContract()
  : process.argv.includes('--flipbook')
    ? makeSceneStudioFlipbookContract()
    : makeSceneStudioContract()
console.log(JSON.stringify(contract, null, 2))
