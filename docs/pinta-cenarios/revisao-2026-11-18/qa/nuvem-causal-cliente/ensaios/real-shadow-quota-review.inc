import { createVectorBackgroundAsset } from '../../../pinta/src/core/project'
import { PintaStorageBudgetError } from '../../../pinta/src/core/localStorageErrors'
import { galleryBackupByteLength, MAX_BACKUP_FILE_BYTES } from '../../../pinta/src/export/projectJson'
import { MAX_IMAGE_SRC_CHARS } from '../../../pinta/src/vector/model'

test('galeria aceita o desenho no limite, recusa o gzip adicional e permite tentar de novo após liberar espaço', async () => {
  const local = createPintaCausalPersistence({ namespace: 'cota-real-gzip' })
  await local.causal.applyPull({fromEpoch:null,epoch:'0',transitions:[]},()=>true)
  const sheet = createTilesetAsset({name:'pecas',tileSize:8})
  const gallery = createVectorBackgroundAsset({ name: 'fundos', width: 16, height: 16 })
  const prefix = 'data:image/png;base64,'
  const src = prefix + 'A'.repeat(MAX_IMAGE_SRC_CHARS - prefix.length)
  gallery.shapes = Array.from({length:112}, (_, index) => ({
    id:'figura-'+index,type:'image',x:0,y:0,w:16,h:16,src,
    fill:'none',stroke:null,opacity:1,rotation:0,
  }))
  const last = gallery.shapes.at(-1)!
  const excess = galleryBackupByteLength([sheet,gallery]) - MAX_BACKUP_FILE_BYTES + 64
  expect(excess).toBeGreaterThan(0)
  expect(excess).toBeLessThan(last.src.length-prefix.length)
  last.src = last.src.slice(0,last.src.length-Math.ceil(excess/4)*4)
  expect(galleryBackupByteLength([sheet,gallery])).toBeLessThanOrEqual(MAX_BACKUP_FILE_BYTES)
  await local.persistAsset(gallery)
  const room = createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:sheet.id})
  const {cloud}=fakeCloud(room,1)
  const unavailable=async()=>{throw Error('Sem rede para este ensaio')}
  const host = createCloudMirroredPintaPersistence({
    local,cloud:{...cloud,pintaCausal:{snapshot:unavailable,upload:unavailable,backfill:unavailable,download:unavailable,verifyEpoch:unavailable}},
    viewerId:'cota-real-gzip',causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()},
  })
  try {
    await expect(host.persistAsset(sheet,{resources:[]})).rejects.toBeInstanceOf(PintaStorageBudgetError)
    expect(await local.loadAssetById(sheet.id)).toBeNull()
    expect((await local.causal.inspect()).pending).toHaveLength(0)
    const base=await local.loadAssetById(gallery.id)
    expect(base.shapes).toHaveLength(112)
    await local.persistAsset({...base,shapes:base.shapes.slice(0,-1)})
    await host.persistAsset(sheet,{resources:[]})
    expect((await local.loadAssetById(sheet.id)).id).toBe(sheet.id)
    const state=await local.causal.inspect()
    expect(state.pending).toHaveLength(1)
    expect(state.shadows.get(state.pending[0].opId).bytes).toBeGreaterThan(64)
  } finally { host.dispose?.() }
})
