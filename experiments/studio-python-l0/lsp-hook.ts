/** An import-independent marker: a later failing import cannot hide execution. */
export function hookCanary(path: string): string {
  return `with open(${JSON.stringify(path)}, "w") as marker:\n    marker.write("entered")\n`
}
