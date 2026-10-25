/**
 * Subsistema de câmera, mira e entrada em primeira pessoa do Jogo 3D
 * Avançado. O fragmento é inserido dentro da IIFE do runtime principal: as
 * dependências compartilhadas permanecem verificadas no runtime final, sem
 * criar outro global nem outro import no código entregue ao aluno.
 */
export const gameKit3DCameraRuntimeSource = `
  // ---- Câmera viva (um modo por vez) ----

  // Libera tudo que pertence à captura da câmera em primeira pessoa.
  function releaseFpsInput() {
    var touchId = _fpsTouchId;
    _fpsTouchId = null;
    if (touchId !== null && canvasEl && canvasEl.releasePointerCapture) {
      try {
        if (!canvasEl.hasPointerCapture || canvasEl.hasPointerCapture(touchId)) {
          canvasEl.releasePointerCapture(touchId);
        }
      } catch (e) {
        warnOnce('fps-touch-release', 'não consegui liberar o gesto da câmera: ' + e);
      }
    }
    if (typeof document !== 'undefined' && document.pointerLockElement === canvasEl &&
        document.exitPointerLock) {
      try { document.exitPointerLock(); }
      catch (e2) { warnOnce('fps-pointer-unlock', 'não consegui liberar o cursor da câmera: ' + e2); }
    }
  }

  // Única porta para trocar de modo: sair de FPS sempre devolve o cursor.
  function setCameraMode(next) {
    if (camMode.kind === 'fps' && next.kind !== 'fps') releaseFpsInput();
    camMode = next;
  }

  function setOrbit(dist) {
    setCameraMode({ kind: 'orbit', target: null, targetGen: 0, dist: Math.max(2, num(dist, 25)), height: 0, pivot: camMode.pivot, pivotGen: camMode.pivotGen });
    if (!orbit) {
      var st = { az: 0.7, el: 0.5, dist: camMode.dist, dragging: false, px: 0, py: 0 };
      orbit = st;
      if (canvasEl && canvasEl.addEventListener) {
        canvasEl.addEventListener('pointerdown', function (ev) {
          resumeAudio();
          st.dragging = true;
          st.px = ev.clientX || 0;
          st.py = ev.clientY || 0;
        });
        canvasEl.addEventListener('wheel', function (ev) {
          if (camMode.kind !== 'orbit') return;
          st.dist += ev.deltaY > 0 ? 2 : -2;
          if (st.dist < 3) st.dist = 3;
          if (st.dist > config.world * 2) st.dist = config.world * 2;
        });
        window.addEventListener('pointermove', function (ev) {
          if (!st.dragging || camMode.kind !== 'orbit') return;
          var cx = ev.clientX || 0;
          var cy = ev.clientY || 0;
          st.az -= (cx - st.px) * 0.01;
          st.el += (cy - st.py) * 0.01;
          if (st.el > 1.4) st.el = 1.4;
          if (st.el < 0.08) st.el = 0.08;
          st.px = cx;
          st.py = cy;
        });
        window.addEventListener('pointerup', function () { st.dragging = false; });
      }
    }
    orbit.dist = camMode.dist;
  }

  // ---- 🎥 A câmera na mão da criança (girar/afastar/tremer/lente/olhar) ----

  // Gira e inclina a órbita POR CÓDIGO (antes só o arrastar do mouse mexia).
  function cameraAngle(azDeg, elDeg) {
    if (!orbit) setOrbit(camMode.dist);
    if (!orbit) return;
    orbit.az = num(azDeg, 40) * Math.PI / 180;
    var el = num(elDeg, 28) * Math.PI / 180;
    // Mesmos limites do arrastar: nem por baixo do chão, nem no zênite (onde a
    // câmera perde a noção de "para cima" e a base do WASD degenera).
    if (el > 1.4) el = 1.4;
    if (el < 0.08) el = 0.08;
    orbit.el = el;
  }
  // Afasta/aproxima — vale para a órbita E para a que segue.
  function cameraDistance(d) {
    var v = Math.max(1, num(d, 25));
    camMode.dist = v;
    if (orbit) orbit.dist = v;
  }
  // Lente: campo de visão em graus (era o literal 60).
  function cameraLens(deg) {
    if (!camera) return;
    camera.fov = Math.max(15, Math.min(120, num(deg, 60)));
    if (camera.updateProjectionMatrix) camera.updateProjectionMatrix();
  }
  // Para onde a órbita/a de cima OLHAM. Antes era o (0,0,0) do mundo, cravado:
  // num mundo grande, a criança não tinha como olhar para longe da origem.
  function cameraLookAt(target) {
    if (isEntity(target)) { camMode.pivot = target; camMode.pivotGen = target._gen; return; }
    camMode.pivot = null;
  }
  function cameraLookAtPoint(x, y, z) {
    camMode.pivot = { x: num(x, 0), y: num(y, 0), z: num(z, 0) };
  }
  // Suavidade do seguir (era a constante 3): maior = mais colada.
  function cameraSmooth(lambda) {
    camSmooth = Math.max(0.1, num(lambda, 3));
  }

  // A entidade-alvo da câmera ainda é ELA MESMA? O handle morto nunca renasce;
  // a geração também protege os subsistemas que acompanham o recurso gráfico.
  function sameCamEntity(e, gen) {
    return isEntity(e) && e._gen === gen;
  }

  // O ponto que a câmera olha: entidade viva (a MESMA), ponto fixo, ou a origem.
  function pivotInto(v) {
    var p = camMode.pivot;
    if (p && p.mesh) {
      if (sameCamEntity(p, camMode.pivotGen)) { v.set(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z); return; }
      camMode.pivot = null; // o alvo morreu (ou o slot virou outro): volta à origem
      v.set(0, 0, 0);
      return;
    }
    if (p) { v.set(p.x, p.y, p.z); return; }
    v.set(0, 0, 0);
  }

  // Tremor (o das regras comuns): offset DEPOIS de posicionar, desfeito no topo do próximo
  // updateCamera (rules.beforeFrame), para o lerp do seguir não perseguir a tremedeira. Usa
  // o rand(), então o sorteio repetível continua valendo. ⚠️ Com dt 0 (pausa, fim, menu) ele
  // não anda nem sorteia: a tela de fim não vibra e o sorteio não é gasto parado.
  function applyShake(dt) {
    rules.afterFrame(camera, dt);
  }

  // ---- Mira & clique no mundo (raycast) + câmera 1ª pessoa ----
  function ensureRay() {
    if (_ray) return true;
    if (!THREE.Raycaster || !THREE.Vector3) return false;
    _ray = new THREE.Raycaster();
    return true;
  }
  // Rastreia o ponteiro em coordenadas normalizadas (-1..1) sobre o canvas.
  function ensurePointer() {
    if (_pickWired) return;
    _pickWired = true;
    _mouse = { x: 0, y: 0 };
    var upd = function (ev) {
      var rect = canvasEl && canvasEl.getBoundingClientRect
        ? canvasEl.getBoundingClientRect()
        : { left: 0, top: 0, width: 1, height: 1 };
      var cx = typeof ev.clientX === 'number' ? ev.clientX : 0;
      var cy = typeof ev.clientY === 'number' ? ev.clientY : 0;
      _mouse.x = ((cx - rect.left) / (rect.width || 1)) * 2 - 1;
      _mouse.y = -((cy - rect.top) / (rect.height || 1)) * 2 + 1;
    };
    if (canvasEl && canvasEl.addEventListener) {
      canvasEl.addEventListener('pointermove', upd);
      canvasEl.addEventListener('pointerdown', upd);
    }
  }
  // Sobe pelos pais do objeto atingido até achar a entidade viva dona dele.
  function entityOfMesh(obj) {
    var o = obj;
    while (o) {
      if (o.userData && o.userData.szEntity && o.userData.szEntity._alive === true) {
        return o.userData.szEntity;
      }
      o = o.parent;
    }
    return null;
  }
  // Sem o loop rodando, matrixWorld fica defasado — atualiza antes de mirar.
  // No máximo UMA vez por quadro (carimbo _frameNo): dez consultas de mouse no
  // mesmo quadro não percorrem a cena dez vezes. Depois do desenho o carimbo já
  // vale (o render atualizou), e quem nasce ou é teleportado depois da
  // atualização ganha a matriz na hora (freshPickMatrix).
  function syncMatrices() {
    if (camera && camera.updateMatrixWorld) camera.updateMatrixWorld();
    if (_matrixFrame === _frameNo) return;
    _matrixFrame = _frameNo;
    if (scene && scene.updateMatrixWorld) scene.updateMatrixWorld();
  }
  // A entidade (do molde, se dado) sob o mouse — ou null. O raio só testa a
  // lista das entidades vivas (pickables), nunca a cena inteira: chão, enfeite,
  // luz e partícula nunca respondiam aqui mesmo (só entidade viva conta, e o
  // que está na frente sem ser entidade não tapava). O vivo é conferido no acerto.
  function pickAtMouse(mold) {
    if (!worldReady || !camera || !ensureRay()) return null;
    ensurePointer();
    syncMatrices();
    _ray.setFromCamera(_mouse, camera);
    _pickHits.length = 0;
    _ray.intersectObjects(pickables, true, _pickHits);
    var want = text(mold, '');
    var found = null;
    for (var i = 0; i < _pickHits.length; i++) {
      var e = entityOfMesh(_pickHits[i].object);
      if (e && (!want || e._mold === want)) { found = e; break; }
    }
    _pickHits.length = 0;
    return found;
  }
  // O mouse está sobre esta entidade?
  function pointerOverEntity(e) {
    if (!isEntity(e) || !worldReady || !camera || !ensureRay()) return false;
    ensurePointer();
    syncMatrices();
    _ray.setFromCamera(_mouse, camera);
    _pickHits.length = 0;
    _ray.intersectObject(e.mesh, true, _pickHits);
    var over = _pickHits.length > 0;
    _pickHits.length = 0;
    return over;
  }
  // O ponto do chão (plano y=0) sob o mouse, no eixo pedido. É conta com o raio
  // da câmera (nenhum objeto da cena entra): basta a matriz da câmera.
  function groundPoint(axis) {
    if (!worldReady || !camera || !ensureRay()) return 0;
    ensurePointer();
    if (camera.updateMatrixWorld) camera.updateMatrixWorld();
    _ray.setFromCamera(_mouse, camera);
    var ro = _ray.ray && _ray.ray.origin;
    var rd = _ray.ray && _ray.ray.direction;
    if (!ro || !rd || Math.abs(rd.y) < 0.000001) return 0;
    var t = -ro.y / rd.y;
    if (t < 0) return 0;
    var a = text(axis, 'x');
    if (a === 'y') return ro.y + rd.y * t;
    if (a === 'z') return ro.z + rd.z * t;
    return ro.x + rd.x * t;
  }
  // Câmera em 1ª pessoa presa à entidade; olhar com o mouse (pointer-lock).
  function cameraFps(e, height) {
    if (!isEntity(e)) {
      warn('"Câmera: 1ª pessoa nos olhos de" precisa de um objeto que está no jogo');
      return;
    }
    var h = num(height, 1.4);
    setCameraMode({
      kind: 'fps',
      target: e,
      targetGen: e._gen,
      dist: 0,
      height: h,
      pivot: null,
      pivotGen: 0,
      yaw: e.mesh ? e.mesh.rotation.y : 0,
      pitch: 0
    });
    ensureFpsLook();
  }
  function rotateFpsLook(dx, dy) {
    if (camMode.kind !== 'fps') return;
    camMode.yaw -= num(dx, 0) * 0.0025;
    camMode.pitch -= num(dy, 0) * 0.0025;
    if (camMode.pitch > 1.4) camMode.pitch = 1.4;
    if (camMode.pitch < -1.4) camMode.pitch = -1.4;
    // O corpo vira junto no eixo Y — mover em 1ª pessoa e o olhar batem.
    if (isEntity(camMode.target) && camMode.target.mesh) {
      camMode.target.mesh.rotation.y = camMode.yaw;
      touchStatic(camMode.target);
    }
  }
  function ensureFpsLook() {
    if (_fpsWired) return;
    _fpsWired = true;
    if (canvasEl && canvasEl.addEventListener) {
      canvasEl.style.touchAction = 'none';
      canvasEl.addEventListener('click', function () {
        if (camMode.kind === 'fps' && canvasEl.requestPointerLock) {
          try { canvasEl.requestPointerLock(); } catch (err) {}
        }
      });
      canvasEl.addEventListener('pointerdown', function (ev) {
        if (camMode.kind !== 'fps' || ev.pointerType === 'mouse') return;
        _fpsTouchId = ev.pointerId;
        _fpsTouchX = ev.clientX;
        _fpsTouchY = ev.clientY;
        if (canvasEl.setPointerCapture) {
          try { canvasEl.setPointerCapture(ev.pointerId); }
          catch (e) { warnOnce('fps-touch-capture', 'não consegui capturar o gesto de câmera: ' + e); }
        }
        if (ev.cancelable) ev.preventDefault();
      });
    }
    window.addEventListener('mousemove', function (ev) {
      if (camMode.kind !== 'fps') return;
      if (typeof document !== 'undefined' && document.pointerLockElement !== canvasEl) return;
      rotateFpsLook(ev.movementX || 0, ev.movementY || 0);
    });
    window.addEventListener('pointermove', function (ev) {
      if (_fpsTouchId === null || ev.pointerId !== _fpsTouchId) return;
      var dx = ev.clientX - _fpsTouchX;
      var dy = ev.clientY - _fpsTouchY;
      _fpsTouchX = ev.clientX;
      _fpsTouchY = ev.clientY;
      rotateFpsLook(dx, dy);
      if (ev.cancelable) ev.preventDefault();
    });
    var finishTouchLook = function (ev) {
      if (_fpsTouchId === null || ev.pointerId !== _fpsTouchId) return;
      _fpsTouchId = null;
    };
    window.addEventListener('pointerup', finishTouchLook);
    window.addEventListener('pointercancel', finishTouchLook);
  }
  // Anda a entidade em 1ª pessoa: WASD/setas relativos ao olhar.
  // É a MESMA base do WASD comum — em 1ª pessoa a câmera são os olhos dela, então
  // "para onde a câmera olha" e "para onde ela olha" são a mesma coisa. Achatar em
  // XZ é de propósito: olhar para cima e andar não faz ninguém voar.
  function moveFps(e, speed) {
    if (!isEntity(e)) return;
    moveOnCamBasis(e, num(speed, 6));
  }

  function updateCamera(dt) {
    if (!camera) return;
    // Desfaz o tremor do quadro anterior ANTES de reposicionar: o "seguir" faz
    // lerp a partir de camera.position, então sem isto partiria da posição JÁ
    // tremida e o offset persistiria virando deriva. Nos modos .set()
    // (orbit/topo/fps) é inócuo — a posição é reescrita antes do applyShake.
    rules.beforeFrame(camera);
    if (camMode.kind === 'fps') {
      var f = camMode.target;
      if (!sameCamEntity(f, camMode.targetGen)) {
        setOrbit(camMode.dist || 25);
        return;
      }
      var px = f.mesh.position.x;
      var py = f.mesh.position.y + camMode.height;
      var pz = f.mesh.position.z;
      camera.position.set(px, py, pz);
      var cp = Math.cos(camMode.pitch);
      // Olha ao longo do +Z do corpo (o ensureFpsLook escreve rotation.y = yaw).
      // Era -sin/-cos: a câmera olhava para um lado e o corpo apontava para o
      // outro, então o tiro de spawnFrom+moveForward saía PELAS COSTAS.
      camera.lookAt(
        px + Math.sin(camMode.yaw) * cp,
        py + Math.sin(camMode.pitch),
        pz + Math.cos(camMode.yaw) * cp
      );
      applyShake(dt);
      return;
    }
    if (camMode.kind === 'orbit' && orbit) {
      var ce = Math.cos(orbit.el);
      pivotInto(_tv2);
      camera.position.set(
        _tv2.x + orbit.dist * ce * Math.sin(orbit.az),
        _tv2.y + orbit.dist * Math.sin(orbit.el),
        _tv2.z + orbit.dist * ce * Math.cos(orbit.az)
      );
      camera.lookAt(_tv2.x, _tv2.y, _tv2.z);
      applyShake(dt);
      return;
    }
    if (camMode.kind === 'top') {
      pivotInto(_tv2);
      // O epsilon em Z tira a câmera do zênite exato: sem ele o "para cima" da
      // câmera fica indefinido (gimbal) e a base do WASD não teria para onde
      // apontar. É ele que faz o topo da tela ser -Z.
      camera.position.set(_tv2.x, _tv2.y + camMode.height, _tv2.z + camMode.height * 0.001 + 0.01);
      camera.lookAt(_tv2.x, _tv2.y, _tv2.z);
      applyShake(dt);
      return;
    }
    if (camMode.kind === 'follow') {
      var t = camMode.target;
      if (!sameCamEntity(t, camMode.targetGen)) return;
      // Atrás do alvo (pela frente dele) com amortecimento exponencial.
      _tv1.set(0, 0, 1).applyQuaternion(t.mesh.quaternion);
      _tv1.y = 0;
      if (!(_tv1.lengthSq() > 0.000001)) _tv1.set(0, 0, 1);
      _tv1.normalize();
      _tv2.copy(t.mesh.position)
        .addScaledVector(_tv1, -camMode.dist);
      _tv2.y = t.mesh.position.y + camMode.height;
      var a = 1 - Math.exp(-camSmooth * (dt > 0 ? dt : 0.016));
      camera.position.lerp(_tv2, a);
      camera.lookAt(t.mesh.position.x, t.mesh.position.y + 1, t.mesh.position.z);
      applyShake(dt);
    }
  }

`
