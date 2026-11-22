export type MapTarget = 'g2d' | 'gk'

export const regionWorldData = '__SZ_PRIVATE_PINTA_WORLD_DATA__'

/** Accesses the existing engine internals only in the private composition. */
export function regionHostFields(target: MapTarget): string {
  return target === 'g2d'
    ? `
    now:now,
    teleport:setPosition,
    legacyCollider:function(scene,cells){
      var rows={length:scene.rows},tile=scene.tileSize;
      var map={rows:rows,tile:tile,_colsRows:rows,_colsCache:scene.cols,
        solid:[0],platform:[1],origin:scene.origin,regionCells:cells,
        layout:{x:scene.origin.col*tile,y:scene.origin.row*tile,tileSize:tile,mode:'placed'}};
      return function(sprite){collideTileMap(sprite,map);};
    },
    `
    : `
    now:Date.now,
    teleport:function(sprite,x,y){
      placeCharacterAt(sprite,x,y);
      sprite._sweepFromY=sprite.y;sprite._sweepFrame=-1;
    },
    legacyCollider:function(scene,cells){
      var map={rows:[],solid:{0:true},platform:{1:true},regionCells:cells};
      return function(sprite){
        var previous=tilePx;
        tilePx=scene.tileSize;
        _pintaCurrentCollisionMap=map;
        try {collideTilemap(sprite,'');}
        finally {_pintaCurrentCollisionMap=null;tilePx=previous;}
      };
    },
    `
}

const basicRegionHelpers = `
  function* _pintaCollisionCells(map,c0,r0,c1,r1){
    if(!map.regionCells){
      for(var r=r0;r<=r1;r++)for(var c=c0;c<=c1;c++)yield [r,c];
      return;
    }
    var x=map.origin.col,y=map.origin.row;
    for(var cell of map.regionCells(c0+x,r0+y,c1+x,r1+y)){
      var r=cell[0]-y,c=cell[1]-x;
      map.rows[r]={length:map._colsCache,[c]:cell[2]};
      try {yield [r,c];} finally {delete map.rows[r];}
    }
  }
`

const signedCamera = {
  g2d: `
    var bounds=_map2d&&_map2d.signedBounds();
    if(bounds){
      camera.x=Math.max(bounds.x,Math.min(x,bounds.x+Math.max(0,bounds.width-vw)));
      camera.y=Math.max(bounds.y,Math.min(y,bounds.y+Math.max(0,bounds.height-vh)));
      return;
    }
  `,
  gk: `
    var bounds=_map2d&&_map2d.signedBounds();
    if(bounds&&!camera.followMap&&!(rpg.mapCols>0&&rpg.mapRows>0)){
      camera.x=Math.max(bounds.x,Math.min(tx,bounds.x+Math.max(0,bounds.width-config.w)));
      camera.y=Math.max(bounds.y,Math.min(ty,bounds.y+Math.max(0,bounds.height-config.h)));
      return;
    }
  `,
}

function replaceUnique(source: string, marker: string, content: string): string {
  const start = source.indexOf(marker)
  if (start < 0 || start !== source.lastIndexOf(marker))
    throw new Error(`O motor não declarou um único ponto de composição: ${marker}`)
  return source.replace(marker, () => content)
}

export function regionEngineSource(source: string, target: MapTarget): string {
  const camera = replaceUnique(source, '// MAP_2D_SIGNED_CAMERA', signedCamera[target])
  if (target === 'g2d') {
    const opening =
      /\/\/ MAP_2D_LEGACY_BASIC_BEGIN\s+for[^\n]+\n\s+for[^\n]+\n\s+\/\/ MAP_2D_LEGACY_BASIC_BODY/
    const closing = /\n\s+}\n\s+}\n\s+\/\/ MAP_2D_LEGACY_BASIC_END/
    if (!opening.test(camera) || !closing.test(camera))
      throw new Error('O resolvedor da grade do Jogo 2D não declarou seus limites.')
    return replaceUnique(
      camera,
      '// MAP_2D_RUNTIME_SLOT',
      `${basicRegionHelpers}// MAP_2D_RUNTIME_SLOT`,
    )
      .replace(
        opening,
        'for(var cell of _pintaCollisionCells(map,c0,r0,c1,r1)){var r=cell[0],c=cell[1];',
      )
      .replace(closing, '\n    }')
  }
  const map = replaceUnique(
    camera,
    '// MAP_2D_LEGACY_ADVANCED_MAP',
    `
    if(_pintaCurrentCollisionMap)m=_pintaCurrentCollisionMap;
  `,
  )
  const solid = replaceUnique(
    map,
    '// MAP_2D_LEGACY_ADVANCED_SOLID',
    `
    if(m.regionCells){
      for(var cell of m.regionCells(c0,r0,c1,r1))
        if(m.solid[cell[2]])resolveSolid(who,cell[1]*t,cell[0]*t,t,t,false);
      return;
    }
  `,
  )
  const platform = replaceUnique(
    solid,
    '// MAP_2D_LEGACY_ADVANCED_PLATFORM',
    `
    if(m.regionCells){
      for(var cell of m.regionCells(c0,Math.floor(feetFrom/t),c1,Math.floor(feetTo/t)+1)){
        var top=cell[0]*t,left=cell[1]*t;
        if(!m.platform[cell[2]]||feetFrom>top+1||feetTo<top||hbRight(who)<=left||hbLeft(who)>=left+t)continue;
        who.y=top-hbH(who)-num(who._hbY,0);
        who.vy=0;who.onGround=true;who._prevY=num(who.y,0);who._sweepFrame=-1;
        return;
      }
      return;
    }
  `,
  )
  return replaceUnique(
    platform,
    '// MAP_2D_RUNTIME_SLOT',
    'var _pintaCurrentCollisionMap=null;\n// MAP_2D_RUNTIME_SLOT',
  )
}
