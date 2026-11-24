import {createVectorBackgroundAsset} from '../../../pinta/src/core/project'
import {PintaStorageBudgetError} from '../../../pinta/src/core/localStorageErrors'
import {galleryBackupByteLength,MAX_BACKUP_FILE_BYTES} from '../../../pinta/src/export/projectJson'
import {MAX_IMAGE_SRC_CHARS} from '../../../pinta/src/vector/model'
import {idbMockDb} from '../../../pinta/src/testing/idbMock'

test('cota local inclui bytes da folha apenas lida junto ao PUT do mapa',async()=>{
  const ns='fronteira-da-folha-observada', local=createPintaCausalPersistence({namespace:ns})
  let sheet=createTilesetAsset({name:'folha',tileSize:32})
  for(let i=0;i<24;i++) sheet=addTile(sheet,sheet.tiles.length-1)
  let seed=2147483647
  for(const tile of sheet.tiles)for(let i=0;i<tile.data.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0
    tile.data[i]=(seed>>>24)%16
  }
  const map=createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:sheet.id})
  const remote=await Promise.all([cloudAsset(sheet,1,'1'),cloudAsset(map,1)])
  await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[sheet,map].map((after,i)=>({id:after.id,before:null,beforeRevision:null,after,remote:remote[i].entry}))},()=>true)
  const snapshot=await local.causal.encodeCandidates([sheet,map],new AbortController().signal)
  const free=4096
  expect(snapshot.blobs.get(map.id).size).toBeLessThan(free/2)
  expect(snapshot.blobs.get(sheet.id).size).toBeGreaterThan(free*2)
  const large=createVectorBackgroundAsset({name:'fundo',width:16,height:16})
  const prefix='data:image/png;base64,',src=prefix+'A'.repeat(MAX_IMAGE_SRC_CHARS-prefix.length)
  large.shapes=Array.from({length:112},(_,index)=>({id:'figura-'+index,type:'image',x:0,y:0,w:16,h:16,src,fill:'none',stroke:null,opacity:1,rotation:0}))
  const trim=galleryBackupByteLength([sheet,map,large])-MAX_BACKUP_FILE_BYTES+free
  expect(trim).toBeGreaterThan(0)
  expect(trim).toBeLessThan(src.length-prefix.length)
  const final=large.shapes.at(-1)
  final.src=final.src.slice(0,final.src.length-Math.ceil(trim/4)*4)
  expect(MAX_BACKUP_FILE_BYTES-galleryBackupByteLength([sheet,map,large])).toBeGreaterThanOrEqual(free)
  await local.persistAsset(large)
  const {cloud}=fakeCloud(map,1)
  const idle=async()=>{throw Error('rede não prevista')}
  const wrapper=createCloudMirroredPintaPersistence({local,viewerId:ns,cloud:{...cloud,pintaCausal:{snapshot:idle,upload:idle,backfill:idle,verifyEpoch:idle,download:idle}},causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
  try{
    const before=await local.loadAssetById(map.id)
    const observed=await local.loadAssetById(sheet.id)
    const save=()=>wrapper.persistAsset({...before,name:'vila-editada'},{resources:[{id:sheet.id,localRevision:pintaLocalRevisionOf(observed)}]})
    await expect(save()).rejects.toBeInstanceOf(PintaStorageBudgetError)
    expect((await local.loadAssetById(map.id)).name).toBe('vila')
    const blocked=await local.causal.inspect()
    expect(blocked.pending).toHaveLength(0)
    expect(blocked.pins?.size??0).toBe(0)
    const disk=idbMockDb('sistema-zero-pinta-'+ns)
    expect(disk.get('pinta:sync:observed-resources')?.size??0).toBe(0)
    const full=await local.loadAssetById(large.id)
    await local.persistAsset({...full,shapes:full.shapes.slice(0,-1)})
    await save()
    expect((await local.loadAssetById(map.id)).name).toBe('vila-editada')
    expect(disk.get('pinta:sync:observed-resources').size).toBe(1)
  }finally{wrapper.dispose?.()}
})
