import { codeUsesPintaScenePlayer } from '@sistemazero/core/studio/pinta-limits'
import type { ExtensionBootstrapContext } from '#extensions'
import { buildProjectRunContextRuntime } from '#extensions'
import { compactOfficialRuntimeSource } from '../runtimeSource'
import { MAP_TWO_D_API_KEYS } from './contract'
import { mapTwoDSource } from './runtime'

/**
 * O cenário do Pinta entra só no jogo que usa um bloco de cenário, na convenção do Kit
 * Plataforma do Jogo 3D (`game-3d/platformKitVariant.ts`): a variante padrão (`''`, sem
 * contexto) é o motor COMPLETO, o lado seguro; o motor sem cenário tem chave própria.
 *
 * A chave reduzida NÃO pode ser `''`: o host troca o contexto por `undefined` na variante
 * padrão (`extensions/runtime.ts`), e sem contexto o motor completo é o que volta. Era o
 * defeito de 17/11/2026: todo jogo 2D recebia os ~10,7 mil caracteres do cenário.
 */
export const MAP_TWO_D_WITHOUT_SCENE_VARIANT = 'sem-cenario-pinta'
export const mapTwoDUsed = (code: string): boolean => codeUsesPintaScenePlayer(code)
/** Sem contexto (chamador antigo, teste) vale o motor completo. */
export const mapTwoDBootstrapVariant = (context?: ExtensionBootstrapContext): string =>
  !context || mapTwoDUsed(context.code) ? '' : MAP_TWO_D_WITHOUT_SCENE_VARIANT
/**
 * Tetos ABSOLUTOS do motor com cenário, em caracteres. Medido em 18/11/2026: 431.468 no Jogo 2D
 * e 419.766 no Avançado (o cenário soma cerca de 11 mil a cada motor).
 * A folga é de cerca de 1,5%: o bastante para um ajuste pequeno, pouco demais para outro
 * recurso entrar sem alguém medir e decidir. O motor sem cenário segue nos tetos de sempre
 * (422.500 no Jogo 2D e 415.000 no Avançado).
 */
export const MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS = { g2d: 437_900, gk: 426_000 } as const
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
    frame:function(step){requestAnimationFrame(step);},
    collision:function(name,scene,rows,asset){${basic ? "var map=createTileMap({image:Object.prototype.hasOwnProperty.call(ASSETS,asset)?asset:'',tile:scene.tileSize,solid:'0',platform:'1',grid:rows.map(function(r){return r.join(' ');}).join(';')});placeTileMap(map,0,0,scene.tileSize);return map;" : "var key='_pinta:'+name;tilemaps[key]={rows:rows,artTile:scene.tileSize,imgKey:'',solid:{0:true},platform:{1:true}};tilePx=scene.tileSize;return key;"}},
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
  const enabled = mapTwoDBootstrapVariant(context) === ''
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
