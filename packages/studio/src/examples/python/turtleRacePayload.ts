import { TURTLE_RACE_SOURCES } from './turtleRace.sources.generated'

/** Five portable files; no media, packages, runtime reference or owner embedded. */
export const turtleRacePayload = {
  entrypoint: 'main.py',
  files: {
    ...TURTLE_RACE_SOURCES,
    'requirements.txt': '',
  },
  assets: [],
}
