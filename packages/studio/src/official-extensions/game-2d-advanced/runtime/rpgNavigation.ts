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
    // A grade pode chegar a 512 × 512. Chaves "x,y", arrays que crescem e
    // unshift na reconstrução criavam centenas de milhares de strings/objetos e
    // paravam o quadro. Índices inteiros em buffers contíguos mantêm a mesma BFS
    // determinística sem pressionar o coletor de lixo.
    var width = maxX - minX + 1;
    var height = maxY - minY + 1;
    var total = width * height;
    var startIndex = (startCy - minY) * width + (startCx - minX);
    var targetIndex = (targetCy - minY) * width + (targetCx - minX);
    var parents = new Int32Array(total);
    parents.fill(-2); // -2 = não visitado; -1 = raiz
    parents[startIndex] = -1;
    var queue = new Int32Array(total);
    var head = 0;
    var tail = 1;
    queue[0] = startIndex;
    var dirsX = [1, 0, -1, 0];
    var dirsY = [0, 1, 0, -1];
    while (head < tail) {
      var hereIndex = queue[head++];
      var cx = (hereIndex % width) + minX;
      var cy = Math.floor(hereIndex / width) + minY;
      for (var di = 0; di < 4; di++) {
        var nx = cx + dirsX[di];
        var ny = cy + dirsY[di];
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        var nextIndex = (ny - minY) * width + (nx - minX);
        if (parents[nextIndex] !== -2 || cellOccupied(nx, ny, n)) continue;
        parents[nextIndex] = hereIndex;
        if (nextIndex === targetIndex) {
          var path = [];
          var cursor = targetIndex;
          while (cursor !== startIndex) {
            path.push({ cx: (cursor % width) + minX, cy: Math.floor(cursor / width) + minY });
            cursor = parents[cursor];
          }
          path.reverse();
          return path;
        }
        queue[tail++] = nextIndex;
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
