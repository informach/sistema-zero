/** Decode QA observation records from console snapshots; unrelated stdout stays unrelated. */
export function decodeGameObservations(output: string, prefix: string): unknown[] {
  // Console writes are transported in chunks. The last piece is not a record
  // until its newline arrives; a later poll receives the cumulative snapshot.
  return output
    .split('\n')
    .slice(0, -1)
    .filter((line) => line.startsWith(prefix))
    .map((line) => JSON.parse(line.slice(prefix.length)))
}
