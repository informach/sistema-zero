import { assertLocalStackIsolation } from './isolation.mjs'

// Import before entrypoint effects, including when the entrypoint itself is imported.
assertLocalStackIsolation()
