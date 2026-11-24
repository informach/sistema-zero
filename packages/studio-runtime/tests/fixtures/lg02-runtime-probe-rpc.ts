/** RPC properties forward `.bind` as a remote method; invoke the callable itself instead. */
export function forwardProbeMethod<Args extends unknown[], Result>(
  target: object,
  method: (...args: Args) => Result,
): (...args: Args) => Result {
  return (...args) => Reflect.apply(method, target, args)
}
