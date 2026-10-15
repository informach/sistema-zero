/** Session intent only. Reopening an existing project always starts with Escolher. */
const fresh = new Set<string>()
export const newModelIntent = {
  mark: (id: string) => {
    fresh.add(id)
  },
  has: (id: string) => fresh.has(id),
  consume: (id: string) => {
    fresh.delete(id)
  },
}
