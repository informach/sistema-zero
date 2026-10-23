/** Opt-in host diagnostics, shared by authoring/debugging and server observation. No game writes. */
export const gameTwoDInspectionRuntime = `
  var _inspectors = window.__SZSTUDIO_RUNTIME_INSPECTORS;
  if (_inspectors && typeof _inspectors === 'object' && _inspectors['game-2d:observation'] !== null) {
    // Capture intrinsics before the student's HTML/source can replace them.
    var _inspectOwnDescriptor = Object.getOwnPropertyDescriptor;
    var _inspectFreeze = Object.freeze;
    var _inspectIsArray = Array.isArray;
    var _inspectHasOwn = Object.hasOwn;
    var _inspectDefineProperty = Object.defineProperty;
    var _inspectCreate = Object.create;
    var _inspectFinite = Number.isFinite;
    var _inspectIsManagedGroup = _managedGroups.has.bind(_managedGroups);
    var _inspectIsManagedSprite = _managedSprites.has.bind(_managedSprites);
    var _inspectIsDestroyedSprite = _destroyedSprites.has.bind(_destroyedSprites);
    var _inspectSceneOwns = _spriteScene.owns.bind(_spriteScene);
    var _inspectSceneBounds = _spriteScene.bounds.bind(_spriteScene);
    // Native getters validate the receiver without reading authored own properties.
    // Bind their invocation now as well: source may later replace globals/prototypes.
    var _inspectCanvasPrototype = typeof HTMLCanvasElement === 'function' ? HTMLCanvasElement.prototype : null;
    var _inspectWidthDescriptor = _inspectCanvasPrototype && _inspectOwnDescriptor(_inspectCanvasPrototype, 'width');
    var _inspectHeightDescriptor = _inspectCanvasPrototype && _inspectOwnDescriptor(_inspectCanvasPrototype, 'height');
    var _inspectCanvasWidth = _inspectWidthDescriptor && typeof _inspectWidthDescriptor.get === 'function'
      ? Function.prototype.call.bind(_inspectWidthDescriptor.get) : null;
    var _inspectCanvasHeight = _inspectHeightDescriptor && typeof _inspectHeightDescriptor.get === 'function'
      ? Function.prototype.call.bind(_inspectHeightDescriptor.get) : null;
    var _inspectContextPrototype = typeof CanvasRenderingContext2D === 'function' ? CanvasRenderingContext2D.prototype : null;
    var _inspectContextDescriptor = _inspectContextPrototype && _inspectOwnDescriptor(_inspectContextPrototype, 'canvas');
    var _inspectContextCanvas = _inspectContextDescriptor && typeof _inspectContextDescriptor.get === 'function'
      ? Function.prototype.call.bind(_inspectContextDescriptor.get) : null;
    /** @param {unknown} object @param {string} key */
    function _inspectOwnData(object, key) {
      if (!object || (typeof object !== 'object' && typeof object !== 'function')) return { found: false };
      var descriptor = _inspectOwnDescriptor(object, key);
      return descriptor && _inspectHasOwn(descriptor, 'value') ? { found: true, value: descriptor.value } : { found: false, inaccessible: !!descriptor };
    }
    /** @param {import('./runtimeContract').GameTwoDGroup | null | undefined} group @param {number} limit */
    function _inspectGroupItems(group, limit) {
      // WeakSet membership precedes EVERY property read, including the managed accessor.
      if (!group || typeof group !== 'object' || !_inspectIsManagedGroup(group)) return null;
      if (typeof limit !== 'number' || limit % 1 !== 0 || limit < 0 || limit > MAX_GROUP) return null;
      var items = group.items;
      var length = _inspectOwnData(items, 'length');
      if (!_inspectIsArray(items) || !length.found || typeof length.value !== 'number' || length.value > limit) return null;
      var snapshot = [];
      for (var index = 0; index < length.value; index++) {
        var item = _inspectOwnData(items, index + '');
        if (!item.found || !_inspectIsManagedSprite(item.value)) return null;
        _inspectDefineProperty(snapshot, index + '', { value: item.value, enumerable: true, configurable: true, writable: true });
      }
      return _inspectFreeze(snapshot);
    }
    /** @param {import('./runtimeContract').GameTwoDSprite} sprite */
    function _inspectSpriteBounds(sprite) {
      // A Proxy around a real sprite is a DIFFERENT identity. Do not inspect its descriptors.
      if (!_inspectIsManagedSprite(sprite)) return null;
      // The official projection reads these fields. Refuse accessors before invoking it.
      var raw = _inspectCreate(null), fields = ['x', 'y', 'w', 'h'];
      for (var index = 0; index < fields.length; index++) {
        var field = fields[index], entry = _inspectOwnData(sprite, field);
        if (!entry.found || typeof entry.value !== 'number' || !_inspectFinite(entry.value)) return null;
        raw[field] = entry.value;
      }
      if (raw.w <= 0 || raw.h <= 0) return null;
      // A bound track sprite with no visible projection must NEVER use its world rectangle.
      return _inspectSceneOwns(sprite)
        ? { projected: true, bounds: _inspectSceneBounds(sprite) }
        : { projected: false, bounds: { x: raw.x, y: raw.y, w: raw.w, h: raw.h } };
    }
    function _inspectStage() {
      if (!_stageCanvas || !_inspectCanvasWidth || !_inspectCanvasHeight) return null;
      var backingWidth, backingHeight;
      try {
        backingWidth = _inspectCanvasWidth(_stageCanvas);
        backingHeight = _inspectCanvasHeight(_stageCanvas);
      } catch (error) { return null; }
      var width = _logicalW, height = _logicalH;
      if (!width || !height) {
        if (!_stageCtx || !_inspectContextCanvas) return null;
        try { if (_inspectContextCanvas(_stageCtx) !== _stageCanvas) return null; }
        catch (error) { return null; }
        width = width || backingWidth; height = height || backingHeight;
      }
      if (!_inspectFinite(width) || !_inspectFinite(height) || width <= 0 || height <= 0) return null;
      return { width: width, height: height,
        cameraX: camera.x, cameraY: camera.y };
    }
    /** @param {import('./runtimeContract').GameTwoDSprite} sprite */
    function _inspectSpritePosition(sprite) {
      if (!_inspectIsManagedSprite(sprite) || _inspectIsDestroyedSprite(sprite)) return null;
      var x = _inspectOwnData(sprite, 'x'), y = _inspectOwnData(sprite, 'y');
      if (!x.found || !y.found || typeof x.value !== 'number' || typeof y.value !== 'number' ||
          !_inspectFinite(x.value) || !_inspectFinite(y.value)) return null;
      return { x: x.value, y: y.value, projected: _inspectSceneOwns(sprite) };
    }
    function _inspectLifecycle() {
      return { frame: _frameStamp, generation: _driverGeneration, errors: _observationErrors, paused: _paused };
    }
    var _inspection = _inspectFreeze({ ownData: _inspectOwnData, groupItems: _inspectGroupItems, spriteBounds: _inspectSpriteBounds, stage: _inspectStage,
      spritePosition: _inspectSpritePosition, lifecycle: _inspectLifecycle });
    Object.defineProperty(_inspectors, 'game-2d:observation', {
      value: function () { return _inspection; }, enumerable: true, writable: false, configurable: false
    });
  }
`
