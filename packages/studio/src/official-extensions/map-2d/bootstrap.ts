import { codeUsesPintaScenePlayer } from '@sistemazero/core/studio/pinta-limits'
import type { ExtensionBootstrapContext } from '#extensions'
import { buildProjectRunContextRuntime } from '#extensions'
import { compactOfficialRuntimeSource } from '../runtimeSource'
import { MAP_TWO_D_API_KEYS } from './contract'

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
 * Tetos ABSOLUTOS do motor com cenário, em caracteres. Física de cena 3 (19/11):
 * 446.844 no Jogo 2D e 435.139 no Avançado. O pouso preciso soma 2.865 / 2.812
 * caracteres ao lote de sólidos, apenas no chunk lazy de cenário; inclui o
 * percurso compartilhado de peças, sem conservar outra grade para plataformas.
 * A folga é menor que 1%: o bastante para um ajuste pequeno, pouco demais para outro
 * recurso entrar sem alguém medir e decidir. O motor sem cenário segue nos tetos do
 * `bundle.test.ts` (369.500 no Jogo 2D desde 21/11) e 415.000 no Avançado.
 * 21/11/2026 (lote 4 da missão): o Jogo 2D com cenário também sai sem os comentários de bloco;
 * medido 394.352 caracteres (antes 447.878), e o teto desceu junto.
 */
export const MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS = { g2d: 397_000, gk: 437_000 } as const
// Medidos 26.410 / 26.406 caracteres sobre o legado. Folga inferior a 1%; motores
// sem cenário e orçamento inicial da galeria permanecem nos mesmos tetos.
// Reproduzir: bun packages/studio/scripts/measure-pinta-runtime.ts.
export const MAP_TWO_D_FRAGMENT_MAX_CHARS = 26_600
function host(target: 'g2d' | 'gk'): string {
  const basic = target === 'g2d'
  return `
  var _map2d=createMap2D({
    meta:function(name,byId){var all=Object.values(ASSET_META);if(byId){var id=all.find(function(m){return m.scene&&m.scene.id===name;});if(id)return id;}if(Object.prototype.hasOwnProperty.call(ASSET_META,name)&&ASSET_META[name].scene)return ASSET_META[name];return all.find(function(m){return m.scene&&(m.scene.id===name||m.scene.name===name);})||null;},
    context:${basic ? 'ensureStage' : 'function(){return ctx2d;}'},
    width:${basic ? 'stageWidth' : 'function(){return config.w;}'},height:${basic ? 'stageHeight' : 'function(){return config.h;}'},
    camera:function(){return ${basic ? 'camera' : '{x:camera.on?camera.x:0,y:camera.on?camera.y:0}'};},
    screen:function(ctx){ctx.setTransform(ctx.canvas.width/${basic ? 'stageW(ctx)' : 'config.w'},0,0,ctx.canvas.height/${basic ? 'stageH(ctx)' : 'config.h'},0,0);},
    image:function(url){var img=new Image();img.src=url;return img;},warn:function(message){console.warn('[Pinta] '+message);},
    frame:function(step){requestAnimationFrame(step);},
    collision:function(name,scene,rows,asset){if(scene.version===3)return null;${basic ? "var map=createTileMap({image:Object.prototype.hasOwnProperty.call(ASSETS,asset)?asset:'',tile:scene.tileSize,solid:'0',platform:'1',grid:rows.map(function(r){return r.join(' ');}).join(';')});placeTileMap(map,0,0,scene.tileSize);return map;" : "var key='_pinta:'+name;tilemaps[key]={rows:rows,artTile:scene.tileSize,imgKey:'',solid:{0:true},platform:{1:true}};tilePx=scene.tileSize;return key;"}},
    collide:function(sprite,map){${basic ? 'collideTileMap(sprite,map);' : 'collideTilemap(sprite,map);'}},
    precise:function(sprite,scene,map,move,land){
      if(!sprite||${basic ? '_isDestroyedSprite(sprite)' : 'sprite._active===false'})return;
      var previous=${basic ? '_motionPreviousPosition(sprite)' : '{x:num(sprite._prevX,num(sprite.x,0)),y:num(sprite._prevY,num(sprite.y,0))}'};
      var dx=sprite.x-previous.x,dy=sprite.y-previous.y;
      var bx=${basic ? '0' : 'num(sprite._hbX,0)'},by=${basic ? '0' : 'num(sprite._hbY,0)'};
      var body={x:previous.x+bx,y:previous.y+by,width:${basic ? 'sprite.w' : 'hbW(sprite)'},height:${basic ? 'sprite.h' : 'hbH(sprite)'}};
      var resolved=move(scene,body,dx,dy);
      if(![resolved.x,resolved.y,body.width,body.height,dx,dy].every(Number.isFinite))return;
      var gravity=${basic ? 'world.gravity' : 'plat.gravity'};
      var velocityY=${basic ? '_finiteNumber(sprite.vy,0)' : 'num(sprite.vy,0)'};
      var support=${basic ? '' : 'num(sprite._dropT,0)>0?null:'}velocityY*gravity>=0?land(scene,body,resolved,gravity):null;
      if(support)resolved=support;
      sprite.x=resolved.x-bx;sprite.y=resolved.y-by;
      ${basic ? '_beginTileContacts(sprite);' : ''}
      if(Math.abs(resolved.x-body.x-dx)>1e-7)sprite.vx=0;
      if(Math.abs(resolved.y-body.y-dy)>1e-7){sprite.vy=0;if(${basic ? '_gravityPullsUp(world.gravity)?dy<0:dy>0' : 'dy>0'}){${basic ? '_confirmGroundSupport(sprite,null);' : 'sprite.onGround=true;'}}}
      if(support){sprite.vy=0;${basic ? '_confirmGroundSupport(sprite,null);' : 'sprite.onGround=true;'}}
      ${basic ? '_refreshRecordedMotionAfterCollision(sprite,previous);' : 'sprite._prevX=sprite.x;sprite._prevY=sprite.y;'}
    }
  });
  _registerRuntimeDomain('map-2d',{${basic ? 'reset' : 'resetProject'}:_map2d.reset});
  `
}
function withMapTwoD(source: string, target: 'g2d' | 'gk', fragment: string): string {
  if (!source.includes('// MAP_2D_RUNTIME_SLOT') || !source.includes('// MAP_2D_API_SLOT'))
    throw new Error('O motor não declarou os pontos de composição do mapa 2D.')
  return source
    .replace('// MAP_2D_RUNTIME_SLOT', fragment + host(target))
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
  // A cena e sua geometria só entram no chunk que o jogo realmente usa.
  const fragment = enabled ? (await import('./runtime')).mapTwoDSource : ''
  if (target === 'g2d') {
    const runtime = await import('../game-2d/runtime')
    if (!enabled) return runtime.gameTwoDRuntime
    const prefix = `${buildProjectRunContextRuntime()}\n`
    return (
      prefix +
      compactOfficialRuntimeSource(
        withMapTwoD(runtime.gameTwoDRuntimeSource.slice(prefix.length), target, fragment),
        // O mesmo compactar do Jogo 2D sem cenário (`game-2d/runtime.ts`): sem os comentários de bloco.
        { trimIndent: true, stripBlockComments: true },
      )
    )
  }
  const runtime = await import('../game-2d-advanced/runtime')
  return enabled
    ? buildProjectRunContextRuntime() +
        '\n' +
        compactOfficialRuntimeSource(withMapTwoD(runtime.gameKitRuntimeSource, target, fragment), {
          trimIndent: true,
        })
    : runtime.gameKitRuntime
}
