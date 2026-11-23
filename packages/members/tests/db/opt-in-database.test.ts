import { afterEach, expect, spyOn, test } from 'bun:test'
import { optInKidsJourneyDatabase } from './kids-journey-database'

const variable = 'OPT_IN_DATABASE_PROBE_URL'
const saved = { CI: process.env.CI, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }
afterEach(() => {
  delete process.env[variable]
  for (const [key, value] of Object.entries(saved))
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
})

test('a declared disposable database is validated and returned', () => {
  process.env[variable] = 'postgres://postgres:x@127.0.0.1:5432/kids_journey_probe_ci'
  expect(optInKidsJourneyDatabase(variable)).toBe(process.env[variable]!)
  process.env[variable] = 'postgres://postgres:x@db.example.com:5432/kids_journey_probe_ci'
  expect(() => optInKidsJourneyDatabase(variable)).toThrow('kids_journey_*')
})

test('a missing database warns outside CI and outside the database steps', () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  try {
    delete process.env.CI
    expect(optInKidsJourneyDatabase(variable)).toBeUndefined()
    // The general package step runs these files without any database.
    process.env.CI = 'true'
    delete process.env.TEST_DATABASE_URL
    expect(optInKidsJourneyDatabase(variable)).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(2)
    expect(String(warn.mock.calls[0]?.[0])).toContain(variable)
  } finally {
    warn.mockRestore()
  }
})

test('a CI database step that forgot the variable fails instead of skipping', () => {
  process.env.CI = 'true'
  process.env.TEST_DATABASE_URL = 'postgres://postgres:x@127.0.0.1:5432/sistemazero'
  expect(() => optInKidsJourneyDatabase(variable)).toThrow(variable)
})
