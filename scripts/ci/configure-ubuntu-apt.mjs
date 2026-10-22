import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// GitHub's Ubuntu image uses mirror+file sources with Azure at priority 1:
// https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/configure-apt-sources.sh
// Change only that archive URI, retaining APT's signed sources and all other fields.
export function useOfficialUbuntuArchive(content) {
  return content
    .split('\n')
    .map((line) =>
      line.trimStart().startsWith('#')
        ? line
        : line.replace(
            /(^|[\t ])https?:\/\/azure\.archive\.ubuntu\.com\/ubuntu(\/?)(?=[\t \r]|$)/g,
            '$1https://archive.ubuntu.com/ubuntu$2',
          ),
    )
    .join('\n')
}

export function configureUbuntuApt(directory = '/etc/apt') {
  const sources = join(directory, 'sources.list.d')
  const files = [join(directory, 'apt-mirrors.txt'), join(directory, 'sources.list')]
  if (existsSync(sources))
    files.push(
      ...readdirSync(sources)
        .filter((name) => name.endsWith('.list') || name.endsWith('.sources'))
        .sort()
        .map((name) => join(sources, name)),
    )
  let inspected = 0
  let changed = 0
  for (const file of files) {
    if (!existsSync(file)) continue
    inspected++
    const before = readFileSync(file, 'utf8')
    const after = useOfficialUbuntuArchive(before)
    if (after === before) continue
    writeFileSync(file, after, 'utf8')
    changed++
  }
  if (!inspected) throw new Error('No APT source or mirror files found')
  return { inspected, changed }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.platform !== 'linux' || process.argv.length !== 2)
    throw new Error('Run without arguments on the Ubuntu CI runner')
  if (!/^ID=(?:ubuntu|"ubuntu")\r?$/m.test(readFileSync('/etc/os-release', 'utf8')))
    throw new Error('This APT configuration is only for Ubuntu')
  const result = configureUbuntuApt()
  console.log(`Ubuntu APT sources inspected=${result.inspected}, changed=${result.changed}`)
}
