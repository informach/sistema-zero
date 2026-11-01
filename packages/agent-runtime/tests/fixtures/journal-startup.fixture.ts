import { Journal } from '../../src/store/database'

const file = process.argv[2]
if (!file) throw new Error('Disposable database path required')
const locked = Promise.withResolvers<void>()
const released = Promise.withResolvers<void>()
void released.promise.catch(() => {})
const holder = new Worker(new URL('./journal-lock-holder.ts', import.meta.url).href)
holder.onmessage = ({ data }) => {
  if (data === 'locked') locked.resolve()
  if (data === 'released') released.resolve()
}
holder.onerror = (event) => {
  locked.reject(new Error(event.message))
  released.reject(new Error(event.message))
}
const timer = setTimeout(() => {
  locked.reject(new Error('Lock owner did not acknowledge'))
  released.reject(new Error('Lock owner did not release'))
}, 5000)
let journal: Journal | undefined
try {
  holder.postMessage({ file })
  await locked.promise
  journal = new Journal(file)
  console.log(
    JSON.stringify({
      marker: journal.db.query('SELECT value FROM startup_marker').get(),
      integrity: journal.db.query('PRAGMA integrity_check').get(),
      mode: journal.db.query('PRAGMA journal_mode').get(),
    }),
  )
} finally {
  try {
    await released.promise
  } finally {
    clearTimeout(timer)
    journal?.close()
    holder.terminate()
  }
}
