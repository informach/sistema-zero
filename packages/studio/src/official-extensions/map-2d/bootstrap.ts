import type { ExtensionBootstrapContext } from '#extensions'
import { buildProjectRunContextRuntime } from '#extensions'
import { compactOfficialRuntimeSource } from '../runtimeSource'
import { MAP_TWO_D_API_KEYS } from './contract'
import { mapTwoDSource } from './runtime'

const USE = new RegExp(`\\b(?:${MAP_TWO_D_API_KEYS.join('|')})\\b`)
export const MAP_TWO_D_VARIANT = 'cenario-pinta-v1'
export const mapTwoDBootstrapVariant = (context?: ExtensionBootstrapContext): string =>
  !context || USE.test(context.code) ? MAP_TWO_D_VARIANT : ''
/** O teto antigo vale para a variante vazia; a cena completa acrescenta no máximo 32 KiB. */
export const MAP_TWO_D_BOOTSTRAP_EXTRA_CHARS = 32768
function host(target: 'g2d' | 'gk'): string {
  const basic = target === 'g2d'
  return `
  var _map2d=createMap2D({
    meta:function(name){if(Object.prototype.hasOwnProperty.call(ASSET_META,name))return ASSET_META[name];return Object.values(ASSET_META).find(function(m){return m.scene&&(m.scene.id===name||m.scene.name===name);})||null;},
    context:${basic ? 'ensureStage' : 'function(){return ctx2d;}'},
    width:${basic ? 'stageWidth' : 'function(){return config.w;}'},height:${basic ? 'stageHeight' : 'function(){return config.h;}'},
    camera:function(){return ${basic ? 'camera' : '{x:camera.on?camera.x:0,y:camera.on?camera.y:0}'};},
    screen:function(ctx){ctx.setTransform(ctx.canvas.width/${basic ? 'stageW(ctx)' : 'config.w'},0,0,ctx.canvas.height/${basic ? 'stageH(ctx)' : 'config.h'},0,0);},
    image:function(url){var img=new Image();img.src=url;return img;},warn:function(message){console.warn('[Pinta] '+message);},
    collision:function(name,scene,rows){${basic ? "var map=createTileMap({image:scene.name,tile:scene.tileSize,solid:'0',platform:'1',grid:rows.map(function(r){return r.join(' ');}).join(';')});placeTileMap(map,0,0,scene.tileSize);return map;" : "var key='_pinta:'+name;tilemaps[key]={rows:rows,artTile:scene.tileSize,imgKey:'',solid:new Set([0]),platform:new Set([1])};tilePx=scene.tileSize;return key;"}},
    collide:function(sprite,map){${basic ? 'collideTileMap(sprite,map);' : 'collideTilemap(sprite,map);'}}
  });
  _registerRuntimeDomain('map-2d',{${basic ? 'reset' : 'resetProject'}:_map2d.reset});
  `
}
export function withMapTwoD(source: string, target: 'g2d' | 'gk'): string {
  if (!source.includes('// MAP_2D_RUNTIME_SLOT') || !source.includes('// MAP_2D_API_SLOT'))
    throw new Error('O motor não declarou os pontos de composição do mapa 2D.')
  return source
    .replace('// MAP_2D_RUNTIME_SLOT', mapTwoDSource + host(target))
    .replace(
      '// MAP_2D_API_SLOT',
      MAP_TWO_D_API_KEYS.map((key) => `${key}:_map2d.${key},`).join('\n'),
    )
}
export async function mapTwoDBootstrap(
  target: 'g2d' | 'gk',
  context?: ExtensionBootstrapContext,
): Promise<string> {
  const enabled = mapTwoDBootstrapVariant(context) === MAP_TWO_D_VARIANT
  if (target === 'g2d') {
    const runtime = await import('../game-2d/runtime')
    if (!enabled) return runtime.gameTwoDRuntime
    const prefix = `${buildProjectRunContextRuntime()}\n`
    return (
      prefix +
      compactOfficialRuntimeSource(
        withMapTwoD(runtime.gameTwoDRuntimeSource.slice(prefix.length), target),
        { trimIndent: true },
      )
    )
  }
  const runtime = await import('../game-2d-advanced/runtime')
  return enabled
    ? buildProjectRunContextRuntime() +
        '\n' +
        compactOfficialRuntimeSource(withMapTwoD(runtime.gameKitRuntimeSource, target), {
          trimIndent: true,
        })
    : runtime.gameKitRuntime
}
