import { idbMockDb } from '../../../pinta/src/testing/idbMock'

test('duas operações que leram a mesma folha mantêm uma cópia de seus bytes até o último recibo', async () => {
  const ns = 'folha-compartilhada-ate-ultimo-ack'
  const local = createPintaCausalPersistence({namespace:ns})
  const sheet = createTilesetAsset({name:'folha',tileSize:8})
  sheet.tiles[0].data[0] = 3
  const map1 = createTilemapAsset({name:'mapa-um',cols:1,rows:1,tilesetId:sheet.id})
  const map2 = createTilemapAsset({name:'mapa-dois',cols:1,rows:1,tilesetId:sheet.id})
  const assets = [sheet,map1,map2]
  const remote = await Promise.all(assets.map(asset=>cloudAsset(asset,1,asset.id===sheet.id?'1':null)))
  await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:assets.map((after,i)=>({id:after.id,before:null,beforeRevision:null,after,remote:remote[i].entry}))},()=>true)
  const observed = await local.loadAssetById(sheet.id)
  const context = { resources:[{id:sheet.id,localRevision:pintaLocalRevisionOf(observed)}] }
  const {cloud} = fakeCloud(map1,1)
  const transport = {snapshot:async()=>({epoch:'1',requiredFormat:6,entries:remote.map(row=>row.entry)}),verifyEpoch:async()=>{},backfill:async()=>{},download:async()=>{throw Error('download inesperado')},upload:async()=>{throw TypeError('offline')}}
  const wrapper = createCloudMirroredPintaPersistence({local,cloud:{...cloud,pintaCausal:transport},viewerId:ns,causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
  const sig = new AbortController().signal
  async function sheetBlobs() {
    const records = idbMockDb('sistema-zero-pinta-'+ns)
    const pending = [...records.values()]
    const matches = []
    while (pending.length) {
      const value = pending.pop()
      if (value instanceof Blob) {
        const doc = await new Response(value.stream().pipeThrough(new DecompressionStream('gzip'))).text()
        const asset = local.causal.decodeCandidate(doc)
        if (asset?.id === sheet.id) matches.push({sha:await pintaCausalGzipHash(await value.arrayBuffer()),pixel:asset.tiles[0].data[0]})
      } else if (value instanceof Map) pending.push(...value.values())
      else if (Array.isArray(value)) pending.push(...value)
      else if (value && typeof value==='object' && !ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer)) pending.push(...Object.values(value))
    }
    return matches
  }
  const flush = (upload=transport.upload)=>flushPintaCausalOutbox({local:local.causal,cloud:{...transport,upload},signal:sig,reader:6})
  const save = async (id,name)=>wrapper.persistAsset({...await local.loadAssetById(id),name},context)
  function result(slot,epoch,itemId) {
    const put = slot.intent.members[0]
    expect(slot.intent.members.map(m=>m.itemId)).toEqual([itemId])
    expect([...slot.blobs.keys()]).toEqual([itemId])
    expect(slot.intent.readSet).toMatchObject([{consumerId:itemId,targetId:sheet.id,source:'snapshot'}])
    return {opId:slot.intent.opId,intentHash:slot.intentHash,epoch,members:[{itemId,revision:2,sha256:put.sha256,layoutRevision:null,deleted:false}]}
  }
  try {
    await save(map1.id,'primeira-edicao')
    const [written] = await sheetBlobs()
    expect(written?.pixel).toBe(3)
    await save(map1.id,'segunda-edicao')
    expect(await sheetBlobs()).toEqual([written])
    await expect(flush()).rejects.toThrow('offline')
    const first=(await local.causal.inFlight()).sealed.intent.opId
    await save(map2.id,'consumidor-dois')
    expect(await sheetBlobs()).toEqual([written])
    let uploads=0
    await expect(flush(async slot=>{
      if (uploads++===0) return result(slot,'2',map1.id)
      throw TypeError('segundo offline')
    })).rejects.toThrow('segundo offline')
    const next=await local.causal.inFlight()
    expect(next.sealed.intent.opId).not.toBe(first)
    expect(await sheetBlobs()).toEqual([written])
    await flush(async slot=>result(slot,'3',map2.id))
    expect(await local.causal.inFlight()).toBeNull()
    expect((await local.causal.inspect()).pending).toHaveLength(0)
    expect(await sheetBlobs()).toEqual([])
  } finally {wrapper.dispose?.()}
})
