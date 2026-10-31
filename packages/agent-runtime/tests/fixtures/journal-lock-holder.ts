import { Database } from 'bun:sqlite'

self.onmessage = ({ data }: MessageEvent<{ file: string }>) => {
  const db = new Database(data.file, { strict: true })
  db.run("CREATE TABLE startup_marker(value TEXT); INSERT INTO startup_marker VALUES ('preserved')")
  db.run('BEGIN EXCLUSIVE')
  self.postMessage('locked')
  setTimeout(() => {
    db.run('COMMIT')
    db.close()
    self.postMessage('released')
    self.close()
  }, 200)
}
