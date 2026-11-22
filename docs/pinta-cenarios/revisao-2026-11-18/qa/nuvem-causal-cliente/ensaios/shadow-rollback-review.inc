import { idbMockDb, setIdbWriteGuard } from '../../../pinta/src/testing/idbMock'
import { freezePintaCausalPending } from '../../src/lib/pinta-causal-queue'
import { localPreparedKey,localCausalBytes } from '../../../pinta/src/state/localCausalOutbox'

test('a troca de um gzip mutável usa a mesma transação, espaço e chave', async () => {
  const namespace='cota-da-ponta'
  const local=createPintaCausalPersistence({namespace})
  await local.causal.applyPull({fromEpoch:null,epoch:'0',transitions:[]},()=>true)
  const sheet=createTilesetAsset({name:'pecas',tileSize:8})
  const room=createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:sheet.id})
  const {cloud}=fakeCloud(room,1)
  const unused=async()=>{throw Error('rede inesperada')}
  const wrapper=createCloudMirroredPintaPersistence({
    local,cloud:{...cloud,pintaCausal:{snapshot:unused,upload:unused,download:unused,backfill:unused,verifyEpoch:unused}},
    viewerId:namespace,causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()},
  })
  const disk=idbMockDb('sistema-zero-pinta-'+namespace)
  try{
    sheet.tiles[0].data[0]=1
    await wrapper.persistAsset(sheet,{resources:[]})
    const [first]=(await local.causal.inspect()).pending
    const key=localPreparedKey(first.opId), id=sheet.id
    const candidate=disk.get(key)
    expect(candidate).toBeInstanceOf(Map)
    const stored=await candidate.get(id).arrayBuffer()
    const pixels=async(buf)=>assetFromJson(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text()).asset.tiles[0].data[0]
    expect(await pixels(stored)).toBe(1)
    const previous=await local.loadAssetById(id)
    const next={...previous,tiles:structuredClone(previous.tiles)}; next.tiles[0].data[0]=2
    setIdbWriteGuard((k)=>{if(k===key)throw Error('último PUT local falhou')})
    try{await expect(wrapper.persistAsset(next,{resources:[]})).rejects.toThrow('último PUT local falhou')}
    finally{setIdbWriteGuard(null)}
    expect((await local.causal.inspect()).pending[0].preparation).toBe(first.preparation)
    expect((await local.loadAssetById(id)).tiles[0].data[0]).toBe(1)
    expect(await disk.get(key).get(id).arrayBuffer()).toEqual(stored)
    await wrapper.persistAsset(next,{resources:[]})
    const second=(await local.causal.inspect()).pending[0]
    expect(second.opId).toBe(first.opId)
    expect(second.preparation).not.toBe(first.preparation)
    expect(await pixels(await disk.get(key).get(id).arrayBuffer())).toBe(2)
    expect((await local.causal.inspect()).shadows.get(first.opId).bytes).toBe(disk.get(key).get(id).size)
    const gzip=await disk.get(key).get(id).arrayBuffer()
    expect(await freezePintaCausalPending(local.causal,first.opId,new AbortController().signal)).toBe(true)
    expect(await disk.get(key).get(id).arrayBuffer()).toEqual(gzip)
    expect((await local.causal.prepared(first.opId)).blobs.size).toBe(1)
    expect((await local.causal.inspect()).shadows?.has(first.opId)??false).toBe(false); expect((await local.causal.inspect()).prepared.get(first.opId).bytes).toBe(gzip.byteLength)
    const blobs=[...disk.values()].filter(v=>v instanceof Map&&v.get(id) instanceof Blob)
    expect(blobs).toHaveLength(1)
  }finally{wrapper.dispose?.()}
})
