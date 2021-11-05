import cousinHarris, { CousinHarrisWatcher } from 'cousin-harris'
import minimatch from 'minimatch'
import { promisify } from 'util'
import { readdirSync, statSync, unlink, existsSync } from 'fs'
import { join } from 'path'

const goodUnlink = promisify(unlink)

const walkSync = function (
  dir: string,
  select: (file: string) => boolean,
  append: (file: string) => void,
): void {
  const files = readdirSync(dir)
  for (const file of files) {
    if (file === 'node_modules') {
      continue
    }

    const fullPath = join(dir, file)
    if (statSync(fullPath).isDirectory()) {
      walkSync(fullPath, select, append)
    } else {
      if (select(fullPath)) {
        append(fullPath)
      }
    }
  }
}

export interface Options {
  ignorePattern?: string
  verbose?: boolean
  watchProject?: boolean
}

export async function cleanAllFiles(
  srcDir: string,
  destDir: string,
  options: Options = {},
): Promise<void[]> {
  const srcSet = new Set()
  walkSync(
    srcDir,
    (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    (file) => {
      srcSet.add(srcDir === '.' ? file : file.slice(srcDir.length + 1))
    },
  )

  const toDelete: string[] = []
  walkSync(
    destDir,
    (file) => {
      if (!file.endsWith('.js') && !file.endsWith('.js.map')) {
        return false
      }

      if (options.ignorePattern && minimatch(file, options.ignorePattern)) {
        return false
      }

      const correspondingSource = file.slice(destDir.length + 1).replace(/\.js(\.map)?/, '.ts')
      return !srcSet.has(correspondingSource) && !srcSet.has(correspondingSource + 'x')
    },
    (file) => {
      toDelete.push(file)
    },
  )

  if (options.verbose) {
    if (toDelete.length) {
      console.info('Deleting files %O', toDelete)
    } else {
      console.info('No files to delete')
    }
  }

  return Promise.all(toDelete.map((file) => goodUnlink(file)))
}

export function watchSourceAndCleanDest(
  srcDir: string,
  destDir: string,
  options: Options = {},
): CousinHarrisWatcher {
  return cousinHarris(
    [srcDir],
    ({ path, removal }) => {
      if (!removal) {
        return
      }
      const fileRoot = path.replace(/\.ts$/, '')
      const toDelete = [join(destDir, `${fileRoot}.js`), join(destDir, `${fileRoot}.js.map`)]

      // don't map/await these, just log on failure
      for (const file of toDelete) {
        if (
          existsSync(file) &&
          !(options.ignorePattern && minimatch(file, options.ignorePattern))
        ) {
          unlink(file, (err) => {
            if (err) {
              console.warn(`Failed to remove ${file}`)
            } else if (options.verbose) {
              console.info(`Removed ${file}`)
            }
          })
        }
      }
    },
    { watchProject: options.watchProject },
  )
}
