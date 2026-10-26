import * as Blockly from 'blockly/core'

type ShadowStates = Record<string, Blockly.serialization.blocks.State | null>
interface SocketShadowsJson extends Blockly.Events.BlockBaseJson {
  shadows: ShadowStates
  onRedo: boolean
}

const TYPE = 'sz_py_socket_shadows'

/**
 * Blockly records no event when a socket gets its default shadow (`setShadowState`), and a
 * shape change rebuilds sockets with events off: undo or redo brought the socket back empty.
 * This event replays those shadows on ONE side of the history — `onRedo` for the defaults a
 * new socket gets, `!onRedo` for the shadows a removed socket held — so it is fired after the
 * shape change in the first case and before it in the second, and Blockly's own ordering
 * (redo forward, undo backward) always finds the socket already there.
 */
export class PythonSocketShadowsEvent extends Blockly.Events.BlockBase {
  override type = TYPE
  shadows: ShadowStates = {}
  onRedo = true

  constructor(block?: Blockly.Block, shadows?: ShadowStates, onRedo?: boolean) {
    super(block)
    if (shadows) this.shadows = shadows
    if (onRedo !== undefined) this.onRedo = onRedo
  }

  override isNull() {
    return Object.keys(this.shadows).length === 0
  }

  override run(forward: boolean) {
    if (forward !== this.onRedo || !this.blockId) return
    const block = this.getEventWorkspace_().getBlockById(this.blockId)
    for (const [name, state] of Object.entries(this.shadows))
      block?.getInput(name)?.connection?.setShadowState(state)
  }

  override toJson(): SocketShadowsJson {
    return { ...super.toJson(), shadows: this.shadows, onRedo: this.onRedo }
  }

  static override fromJson(
    json: SocketShadowsJson,
    workspace: Blockly.Workspace,
    event?: unknown,
  ): PythonSocketShadowsEvent {
    const result = Blockly.Events.BlockBase.fromJson(
      json,
      workspace,
      event ?? new PythonSocketShadowsEvent(),
    ) as PythonSocketShadowsEvent
    result.shadows = json.shadows
    result.onRedo = json.onRedo
    return result
  }
}

/** Records, in the current event group, the shadows to put back on one side of the history. */
export function recordPythonSocketShadows(
  block: Blockly.Block,
  shadows: ShadowStates,
  onRedo: boolean,
) {
  if (!Blockly.Events.isEnabled() || !Object.keys(shadows).length) return
  if (!Blockly.registry.hasItem(Blockly.registry.Type.EVENT, TYPE))
    Blockly.registry.register(Blockly.registry.Type.EVENT, TYPE, PythonSocketShadowsEvent)
  Blockly.Events.fire(new PythonSocketShadowsEvent(block, shadows, onRedo))
}
