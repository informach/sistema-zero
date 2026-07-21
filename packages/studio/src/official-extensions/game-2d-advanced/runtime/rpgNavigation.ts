/** Navegação de NPCs em grade, injetada dentro do escopo do runtime principal. */
export const gameKitRpgNavigationRuntime = `
  /** Uma célula está OCUPADA (parede/NPC/herói) — reserva de intenção do Pizza. */
  function cellOccupied(cx, cy, movingNpc) {
    if (rpg.mapCols > 0 && (cx < 0 || cx >= rpg.mapCols)) return true;
    if (rpg.mapRows > 0 && (cy < 0 || cy >= rpg.mapRows)) return true;
    var key = cx + ',' + cy;
    if (rpg.walls[key] && (!movingNpc || movingNpc._reservedCell !== key)) return true;
    var s = tilePx;
    if (rpg.hero) {
      if (Math.round(rpg.hero.x / s) === cx && Math.round(rpg.hero.y / s) === cy) return true;
      if (rpg.hero._gridDest) {
        if (Math.round(rpg.hero._gridDest.x / s) === cx && Math.round(rpg.hero._gridDest.y / s) === cy) return true;
      }
    }
    return false;
  }
  /**
   * Busca em largura na grade. O mapa já é limitado por MAX_GRID_SIDE, então
   * até um labirinto sem saída tem trabalho finito e não congela o Studio.
   * Retorna somente os próximos passos (a célula atual fica de fora).
   */
  function findNpcPath(n, startCx, startCy, targetCx, targetCy) {
    if (startCx === targetCx && startCy === targetCy) return [];
    var minX = rpg.mapCols > 0 ? 0 : Math.min(startCx, targetCx) - 16;
    var minY = rpg.mapRows > 0 ? 0 : Math.min(startCy, targetCy) - 16;
    var maxX = rpg.mapCols > 0 ? rpg.mapCols - 1 : Math.max(startCx, targetCx) + 16;
    var maxY = rpg.mapRows > 0 ? rpg.mapRows - 1 : Math.max(startCy, targetCy) + 16;
    if (maxX - minX + 1 > MAX_GRID_SIDE || maxY - minY + 1 > MAX_GRID_SIDE) return null;
    if (targetCx < minX || targetCx > maxX || targetCy < minY || targetCy > maxY) return null;
    if (cellOccupied(targetCx, targetCy, n)) return null;
    var startKey = startCx + ',' + startCy;
    var targetKey = targetCx + ',' + targetCy;
    var parents = Object.create(null);
    var seen = Object.create(null);
    var queueX = [startCx];
    var queueY = [startCy];
    var head = 0;
    seen[startKey] = true;
    var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    while (head < queueX.length) {
      var cx = queueX[head];
      var cy = queueY[head];
      head += 1;
      var hereKey = cx + ',' + cy;
      for (var di = 0; di < dirs.length; di++) {
        var nx = cx + dirs[di][0];
        var ny = cy + dirs[di][1];
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        var nextKey = nx + ',' + ny;
        if (seen[nextKey] || cellOccupied(nx, ny, n)) continue;
        seen[nextKey] = true;
        parents[nextKey] = hereKey;
        if (nextKey === targetKey) {
          var path = [{ cx: nx, cy: ny }];
          var cursor = hereKey;
          while (cursor !== startKey) {
            var comma = cursor.indexOf(',');
            path.unshift({ cx: Number(cursor.slice(0, comma)), cy: Number(cursor.slice(comma + 1)) });
            cursor = parents[cursor];
          }
          return path;
        }
        queueX.push(nx);
        queueY.push(ny);
      }
    }
    return null;
  }
  /** Move 1 NPC por quadro: destino da grade (moveTowards) + patrulha/andar-para. */
  function moveNpc(n, dt) {
    var s = tilePx;
    if (n._gridDest == null) {
      var cx = Math.round(num(n.x, 0) / s);
      var cy = Math.round(num(n.y, 0) / s);
      var dx = 0;
      var dy = 0;
      if (n._walkTarget) {
        var tx = n._walkTarget.cx;
        var ty = n._walkTarget.cy;
        if (cx === tx && cy === ty) {
          n._walkTarget = null; n._walkPath = []; n._walkIndex = 0; return;
        }
        var next = n._walkPath && n._walkPath[n._walkIndex];
        if (!next || Math.abs(next.cx - cx) + Math.abs(next.cy - cy) !== 1 || cellOccupied(next.cx, next.cy, n)) {
          n._walkPath = findNpcPath(n, cx, cy, tx, ty);
          n._walkIndex = 0;
          next = n._walkPath && n._walkPath[0];
        }
        if (!next) {
          n._walkTarget = null; n._walkPath = []; n._walkIndex = 0; n._walkFailed = true;
          warnOnce('npcpath:' + n.name + ':' + tx + ',' + ty, 'o NPC "' + n.name + '" não encontrou um caminho livre até a célula ' + tx + ',' + ty);
          return;
        }
        dx = next.cx - cx;
        dy = next.cy - cy;
        n._walkIndex += 1;
      } else if (n._wander) {
        n._wanderT = num(n._wanderT, 0) - dt;
        if (n._wanderT > 0) return;
        n._wanderT = 1 + Math.random() * 2;
        var pick = Math.floor(Math.random() * 4);
        dx = pick === 0 ? 1 : pick === 1 ? -1 : 0;
        dy = pick === 2 ? 1 : pick === 3 ? -1 : 0;
        if (!dx && !dy) return;
      } else return;
      var nx = cx + dx;
      var ny = cy + dy;
      if (cellOccupied(nx, ny, n)) return;
      if (n._reservedCell && !rpg.terrain[n._reservedCell]) delete rpg.walls[n._reservedCell];
      rpg.walls[nx + ',' + ny] = true;
      n._reservedCell = nx + ',' + ny;
      setFacing(n, dx, dy);
      n._gridDest = { x: nx * s, y: ny * s };
    }
    var step = Math.max(1, num(n.speed, s * 2.4)) * dt;
    var gx = n._gridDest.x - num(n.x, 0);
    var gy = n._gridDest.y - num(n.y, 0);
    var dist = Math.sqrt(gx * gx + gy * gy);
    if (dist <= step) { n.x = n._gridDest.x; n.y = n._gridDest.y; n._gridDest = null; }
    else { n.x += (gx / dist) * step; n.y += (gy / dist) * step; }
  }
`
