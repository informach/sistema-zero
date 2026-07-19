/**
 * Física 3D arcade pequena, determinística e sem dependências externas.
 *
 * O código vive como JavaScript portátil porque é usado em dois lugares que
 * executam dentro do iframe: macros do Canvas 3D e a extensão Mundo 3D. Manter
 * uma única fonte evita que as duas experiências desenvolvam colisões
 * incompatíveis. O runtime trabalha com colisores simples e sincroniza somente
 * `position`/`rotation` de objetos Three.js; ele não conhece Blockly nem React.
 */
export const physicsLiteRuntimeSource = `
function createSZPhysicsLite(options) {
  var opts = {};
  if (options) { opts = options; }
  var fixedStep = positive(opts.fixedStep, 1 / 60);
  var maxSubSteps = integer(opts.maxSubSteps, 3, 1, 8);
  var gravity = finite(opts.gravity, -22);
  var cellSize = positive(opts.cellSize, 8);
  var groundHeight = flatGround;
  if (opts.groundHeight) { groundHeight = opts.groundHeight; }
  var accumulator = 0;
  var bodies = {};
  var bodyIds = [];
  var staticColliders = [];
  var triggers = [];
  var staticGrid = {};
  var triggerGrid = {};
  var collisionListeners = [];
  var triggerListeners = [];
  var activeTriggers = {};
  var queryStamp = 1;

  function flatGround() { return 0; }
  function finite(value, fallback) {
    if (Number.isFinite(value)) { return value; }
    return fallback;
  }
  function positive(value, fallback) {
    var result = finite(value, fallback);
    return result > 0 ? result : fallback;
  }
  function integer(value, fallback, min, max) {
    var result = Math.round(finite(value, fallback));
    return Math.max(min, Math.min(max, result));
  }
  function text(value, fallback) {
    if (String(value) === value && value.length > 0) { return value; }
    return fallback;
  }
  function safeId(value, fallback) {
    var key = text(value, fallback);
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      throw new Error('Nome reservado para corpo ou colisor: ' + key);
    }
    return key;
  }
  function half(value, fallback) {
    return positive(value, fallback) * 0.5;
  }
  function cell(value) { return Math.floor(value / cellSize); }
  function gridKey(x, z) { return x + ':' + z; }
  function boundsOf(collider) {
    if (collider.shape === 'sphere') {
      return {
        minX: collider.x - collider.radius,
        maxX: collider.x + collider.radius,
        minZ: collider.z - collider.radius,
        maxZ: collider.z + collider.radius
      };
    }
    return {
      minX: collider.x - collider.hx,
      maxX: collider.x + collider.hx,
      minZ: collider.z - collider.hz,
      maxZ: collider.z + collider.hz
    };
  }
  function insertGrid(grid, collider) {
    var bounds = boundsOf(collider);
    var minX = cell(bounds.minX);
    var maxX = cell(bounds.maxX);
    var minZ = cell(bounds.minZ);
    var maxZ = cell(bounds.maxZ);
    var gx = minX;
    while (gx <= maxX) {
      var gz = minZ;
      while (gz <= maxZ) {
        var key = gridKey(gx, gz);
        var bucket = grid[key];
        if (!bucket) {
          bucket = [];
          grid[key] = bucket;
        }
        bucket.push(collider);
        gz += 1;
      }
      gx += 1;
    }
  }
  function nearby(grid, body) {
    queryStamp += 1;
    var out = [];
    var minX = cell(body.x - body.hx);
    var maxX = cell(body.x + body.hx);
    var minZ = cell(body.z - body.hz);
    var maxZ = cell(body.z + body.hz);
    var gx = minX;
    while (gx <= maxX) {
      var gz = minZ;
      while (gz <= maxZ) {
        var bucket = grid[gridKey(gx, gz)];
        if (bucket) {
          for (var index = 0; index < bucket.length; index += 1) {
            var collider = bucket[index];
            if (collider.queryStamp !== queryStamp) {
              collider.queryStamp = queryStamp;
              out.push(collider);
            }
          }
        }
        gz += 1;
      }
      gx += 1;
    }
    return out;
  }
  function assertUnique(id) {
    if (bodies[id]) throw new Error('Já existe um corpo chamado "' + id + '".');
    for (var index = 0; index < staticColliders.length; index += 1) {
      if (staticColliders[index].id === id) throw new Error('Já existe um colisor chamado "' + id + '".');
    }
    for (var triggerIndex = 0; triggerIndex < triggers.length; triggerIndex += 1) {
      if (triggers[triggerIndex].id === id) throw new Error('Já existe um gatilho chamado "' + id + '".');
    }
  }
  function makeBox(id, x, y, z, width, height, depth) {
    return {
      id: id,
      shape: 'box',
      x: finite(x, 0), y: finite(y, 0), z: finite(z, 0),
      hx: half(width, 1), hy: half(height, 1), hz: half(depth, 1),
      queryStamp: 0
    };
  }
  function addStaticBox(id, x, y, z, width, height, depth) {
    var key = safeId(id, 'colisor');
    assertUnique(key);
    var collider = makeBox(key, x, y, z, width, height, depth);
    staticColliders.push(collider);
    insertGrid(staticGrid, collider);
    return collider;
  }
  function addStaticSphere(id, x, y, z, radius) {
    var key = safeId(id, 'colisor');
    assertUnique(key);
    var collider = {
      id: key,
      shape: 'sphere',
      x: finite(x, 0), y: finite(y, 0), z: finite(z, 0),
      radius: positive(radius, 0.5),
      queryStamp: 0
    };
    staticColliders.push(collider);
    insertGrid(staticGrid, collider);
    return collider;
  }
  function addTrigger(id, x, y, z, width, height, depth) {
    var key = safeId(id, 'area');
    assertUnique(key);
    var trigger = makeBox(key, x, y, z, width, height, depth);
    triggers.push(trigger);
    insertGrid(triggerGrid, trigger);
    return trigger;
  }
  function addBody(id, object, bodyOptions) {
    var key = safeId(id, 'corpo');
    if (!object || !object.position) throw new Error('O corpo "' + key + '" precisa de um objeto com position.');
    assertUnique(key);
    var config = {};
    if (bodyOptions) { config = bodyOptions; }
    var width = positive(config.width, 1);
    var height = positive(config.height, 1);
    var depth = positive(config.depth, width);
    var kind = text(config.kind, 'dynamic');
    if (kind !== 'dynamic' && kind !== 'character') throw new Error('Tipo de corpo inválido: ' + kind);
    var body = {
      id: key,
      kind: kind,
      object: object,
      x: finite(object.position.x, 0),
      y: finite(object.position.y, 0),
      z: finite(object.position.z, 0),
      hx: width * 0.5,
      hy: height * 0.5,
      hz: depth * 0.5,
      vx: finite(config.vx, 0),
      vy: finite(config.vy, 0),
      vz: finite(config.vz, 0),
      friction: Math.max(0, Math.min(1, finite(config.friction, kind === 'character' ? 0.82 : 0.25))),
      bounce: Math.max(0, Math.min(1, finite(config.bounce, 0))),
      gravityScale: Math.max(0, finite(config.gravityScale, 1)),
      grounded: false,
      moveX: 0,
      moveZ: 0,
      moveSpeed: 0
    };
    bodies[key] = body;
    bodyIds.push(key);
    syncObject(body);
    return body;
  }
  function syncObject(body) {
    body.object.position.x = body.x;
    body.object.position.y = body.y;
    body.object.position.z = body.z;
    if (body.object.rotation && body.kind === 'dynamic') {
      body.object.rotation.x += body.vz * fixedStep * 0.08;
      body.object.rotation.z -= body.vx * fixedStep * 0.08;
    }
  }
  function bodySnapshot(id) {
    var body = bodies[safeId(id, '')];
    if (!body) return null;
    return {
      x: body.x, y: body.y, z: body.z,
      vx: body.vx, vy: body.vy, vz: body.vz,
      grounded: body.grounded
    };
  }
  function setVelocity(id, x, y, z) {
    var body = bodies[safeId(id, '')];
    if (!body) return false;
    body.vx = finite(x, body.vx);
    body.vy = finite(y, body.vy);
    body.vz = finite(z, body.vz);
    return true;
  }
  function moveCharacter(id, x, z, speed) {
    var body = bodies[safeId(id, '')];
    if (!body || body.kind !== 'character') return false;
    var inputX = finite(x, 0);
    var inputZ = finite(z, 0);
    var length = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (length > 1) {
      inputX /= length;
      inputZ /= length;
    }
    body.moveX = inputX;
    body.moveZ = inputZ;
    body.moveSpeed = Math.max(0, finite(speed, 0));
    return true;
  }
  function jump(id, speed) {
    var body = bodies[safeId(id, '')];
    if (!body || body.kind !== 'character' || !body.grounded) return false;
    body.vy = positive(speed, 7);
    body.grounded = false;
    return true;
  }
  function overlapsBox(body, box) {
    return Math.abs(body.x - box.x) < body.hx + box.hx &&
      Math.abs(body.y - box.y) < body.hy + box.hy &&
      Math.abs(body.z - box.z) < body.hz + box.hz;
  }
  function emitCollision(bodyId, colliderId) {
    for (var index = 0; index < collisionListeners.length; index += 1) {
      var listener = collisionListeners[index];
      listener(bodyId, colliderId);
    }
  }
  function resolveBox(body, box) {
    var overlapX = body.hx + box.hx - Math.abs(body.x - box.x);
    var overlapY = body.hy + box.hy - Math.abs(body.y - box.y);
    var overlapZ = body.hz + box.hz - Math.abs(body.z - box.z);
    if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return false;
    if (overlapY <= overlapX && overlapY <= overlapZ) {
      var directionY = body.y < box.y ? -1 : 1;
      body.y += overlapY * directionY;
      if (directionY > 0) body.grounded = true;
      body.vy = directionY > 0 ? Math.max(0, -body.vy * body.bounce) : Math.min(0, -body.vy * body.bounce);
    } else if (overlapX <= overlapZ) {
      var directionX = body.x < box.x ? -1 : 1;
      body.x += overlapX * directionX;
      body.vx = -body.vx * body.bounce;
    } else {
      var directionZ = body.z < box.z ? -1 : 1;
      body.z += overlapZ * directionZ;
      body.vz = -body.vz * body.bounce;
    }
    emitCollision(body.id, box.id);
    return true;
  }
  function resolveSphere(body, sphere) {
    var closestX = Math.max(body.x - body.hx, Math.min(sphere.x, body.x + body.hx));
    var closestY = Math.max(body.y - body.hy, Math.min(sphere.y, body.y + body.hy));
    var closestZ = Math.max(body.z - body.hz, Math.min(sphere.z, body.z + body.hz));
    var dx = closestX - sphere.x;
    var dy = closestY - sphere.y;
    var dz = closestZ - sphere.z;
    var distanceSquared = dx * dx + dy * dy + dz * dz;
    if (distanceSquared >= sphere.radius * sphere.radius) return false;
    var distance = Math.sqrt(distanceSquared);
    if (distance < 0.00001) {
      dx = body.x - sphere.x;
      dy = body.y - sphere.y;
      dz = body.z - sphere.z;
      distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    }
    var push = sphere.radius - distance;
    body.x += dx / distance * push;
    body.y += dy / distance * push;
    body.z += dz / distance * push;
    var normalVelocity = body.vx * dx / distance + body.vy * dy / distance + body.vz * dz / distance;
    if (normalVelocity < 0) {
      var impulse = -(1 + body.bounce) * normalVelocity;
      body.vx += dx / distance * impulse;
      body.vy += dy / distance * impulse;
      body.vz += dz / distance * impulse;
    }
    emitCollision(body.id, sphere.id);
    return true;
  }
  function solveGround(body) {
    var ground = finite(groundHeight(body.x, body.z), 0);
    var bottom = body.y - body.hy;
    if (bottom > ground) return;
    body.y = ground + body.hy;
    if (body.vy < 0) body.vy = -body.vy * body.bounce;
    if (Math.abs(body.vy) < 0.1) body.vy = 0;
    body.grounded = true;
    var keep = Math.max(0, 1 - body.friction * fixedStep * 8);
    body.vx *= keep;
    body.vz *= keep;
  }
  function solveStatics(body) {
    var candidates = nearby(staticGrid, body);
    for (var index = 0; index < candidates.length; index += 1) {
      var collider = candidates[index];
      if (collider.shape === 'sphere') resolveSphere(body, collider);
      else resolveBox(body, collider);
    }
  }
  function triggerKey(bodyId, triggerId) { return bodyId + '|' + triggerId; }
  function emitTrigger(bodyId, triggerId, entering) {
    for (var index = 0; index < triggerListeners.length; index += 1) {
      var listener = triggerListeners[index];
      listener(bodyId, triggerId, entering);
    }
  }
  function solveTriggers(body) {
    var seen = {};
    var candidates = nearby(triggerGrid, body);
    for (var index = 0; index < candidates.length; index += 1) {
      var trigger = candidates[index];
      if (!overlapsBox(body, trigger)) continue;
      var key = triggerKey(body.id, trigger.id);
      seen[key] = true;
      if (!activeTriggers[key]) {
        activeTriggers[key] = true;
        emitTrigger(body.id, trigger.id, true);
      }
    }
    for (var triggerIndex = 0; triggerIndex < triggers.length; triggerIndex += 1) {
      var activeKey = triggerKey(body.id, triggers[triggerIndex].id);
      if (activeTriggers[activeKey] && !seen[activeKey]) {
        activeTriggers[activeKey] = false;
        emitTrigger(body.id, triggers[triggerIndex].id, false);
      }
    }
  }
  function integrate(body) {
    body.grounded = false;
    if (body.kind === 'character') {
      var response = Math.min(1, fixedStep * 18);
      body.vx += (body.moveX * body.moveSpeed - body.vx) * response;
      body.vz += (body.moveZ * body.moveSpeed - body.vz) * response;
    }
    body.vy += gravity * body.gravityScale * fixedStep;
    body.x += body.vx * fixedStep;
    body.y += body.vy * fixedStep;
    body.z += body.vz * fixedStep;
    solveGround(body);
    solveStatics(body);
    solveTriggers(body);
    syncObject(body);
  }
  function subStep() {
    for (var index = 0; index < bodyIds.length; index += 1) {
      var body = bodies[bodyIds[index]];
      if (body) integrate(body);
    }
  }
  function step(dt) {
    accumulator += Math.max(0, Math.min(0.1, finite(dt, 0)));
    var count = 0;
    while (accumulator >= fixedStep && count < maxSubSteps) {
      subStep();
      accumulator -= fixedStep;
      count += 1;
    }
    if (count === maxSubSteps && accumulator >= fixedStep) accumulator = 0;
    return count;
  }
  function rayBox(ox, oy, oz, dx, dy, dz, box, maxDistance) {
    var minDistance = 0;
    var maxHit = maxDistance;
    var origins = [ox, oy, oz];
    var directions = [dx, dy, dz];
    var mins = [box.x - box.hx, box.y - box.hy, box.z - box.hz];
    var maxs = [box.x + box.hx, box.y + box.hy, box.z + box.hz];
    for (var axis = 0; axis < 3; axis += 1) {
      if (Math.abs(directions[axis]) < 0.000001) {
        if (origins[axis] < mins[axis] || origins[axis] > maxs[axis]) return null;
      } else {
        var inverse = 1 / directions[axis];
        var near = (mins[axis] - origins[axis]) * inverse;
        var far = (maxs[axis] - origins[axis]) * inverse;
        if (near > far) {
          var swap = near;
          near = far;
          far = swap;
        }
        minDistance = Math.max(minDistance, near);
        maxHit = Math.min(maxHit, far);
        if (minDistance > maxHit) return null;
      }
    }
    return minDistance;
  }
  function raySphere(ox, oy, oz, dx, dy, dz, sphere, maxDistance) {
    var cx = ox - sphere.x;
    var cy = oy - sphere.y;
    var cz = oz - sphere.z;
    var b = cx * dx + cy * dy + cz * dz;
    var c = cx * cx + cy * cy + cz * cz - sphere.radius * sphere.radius;
    var discriminant = b * b - c;
    if (discriminant < 0) return null;
    var distance = -b - Math.sqrt(discriminant);
    if (distance < 0) distance = -b + Math.sqrt(discriminant);
    return distance >= 0 && distance <= maxDistance ? distance : null;
  }
  function raycast(ox, oy, oz, dx, dy, dz, maxDistance) {
    var length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length < 0.000001) return null;
    var nx = dx / length;
    var ny = dy / length;
    var nz = dz / length;
    var limit = positive(maxDistance, 100);
    var best = null;
    for (var index = 0; index < staticColliders.length; index += 1) {
      var collider = staticColliders[index];
      var distance = collider.shape === 'sphere'
        ? raySphere(ox, oy, oz, nx, ny, nz, collider, limit)
        : rayBox(ox, oy, oz, nx, ny, nz, collider, limit);
      if (distance !== null && (!best || distance < best.distance)) {
        best = { id: collider.id, distance: distance };
      }
    }
    return best;
  }
  function remove(id) {
    var key = text(id, '');
    if (!bodies[key]) return false;
    bodies[key] = null;
    var next = [];
    for (var index = 0; index < bodyIds.length; index += 1) {
      if (bodyIds[index] !== key) next.push(bodyIds[index]);
    }
    bodyIds = next;
    return true;
  }
  function clear() {
    bodies = {};
    bodyIds = [];
    staticColliders = [];
    triggers = [];
    staticGrid = {};
    triggerGrid = {};
    activeTriggers = {};
    accumulator = 0;
  }
  function onCollision(listener) {
    if (!listener) { throw new Error('onCollision precisa de uma função.'); }
    collisionListeners.push(listener);
  }
  function onTrigger(listener) {
    if (!listener) { throw new Error('onTrigger precisa de uma função.'); }
    triggerListeners.push(listener);
  }
  function stats() {
    return { bodies: bodyIds.length, statics: staticColliders.length, triggers: triggers.length };
  }

  return {
    addBody: addBody,
    addStaticBox: addStaticBox,
    addStaticSphere: addStaticSphere,
    addTrigger: addTrigger,
    body: bodySnapshot,
    clear: clear,
    jump: jump,
    moveCharacter: moveCharacter,
    onCollision: onCollision,
    onTrigger: onTrigger,
    raycast: raycast,
    remove: remove,
    setVelocity: setVelocity,
    stats: stats,
    step: step
  };
}
`.trim()

/** Insere o kernel logo depois do primeiro import ESM de um runtime. */
export function injectPhysicsLiteRuntime(runtime: string): string {
  const firstLineEnd = runtime.indexOf('\n')
  if (firstLineEnd < 0) throw new Error('O runtime precisa começar com uma linha de import.')
  return `${runtime.slice(0, firstLineEnd + 1)}${physicsLiteRuntimeSource}\n${runtime.slice(firstLineEnd + 1)}`
}
