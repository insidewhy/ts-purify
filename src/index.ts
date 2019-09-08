import { promisify } from 'util'
import { Client } from 'fb-watchman'
import { readdirSync, statSync, unlink } from 'fs'
import { join } from 'path'

const goodUnlink = promisify(unlink)

const walkSync = function(
  dir: string,
  select: (file: string) => boolean,
  append: (file: string) => void,
) {
  const files = readdirSync(dir)
  files.forEach(file => {
    const fullPath = join(dir, file)
    if (statSync(fullPath).isDirectory()) {
      walkSync(fullPath, select, append)
    } else {
      if (select(fullPath)) {
        append(fullPath)
      }
    }
  })
}

interface Options {
  verbose?: boolean
}

export async function cleanAllFiles(
  srcDir: string,
  destDir: string,
  options: Options = {},
): Promise<void[]> {
  const srcSet = new Set()
  walkSync(
    srcDir,
    file => file.endsWith('.ts'),
    file => {
      srcSet.add(file.slice(srcDir.length + 1))
    },
  )

  const toDelete: string[] = []
  walkSync(
    destDir,
    file => {
      if (!file.endsWith('.js') && !file.endsWith('.js.map')) {
        return false
      }

      const correspondingSource = file.slice(destDir.length + 1).replace(/\.js(\.map)?/, '.ts')
      return !srcSet.has(correspondingSource)
    },
    file => {
      toDelete.push(file)
    },
  )

  if (options.verbose) {
    console.info('Deleting files %O', toDelete)
  }

  return Promise.all(toDelete.map(file => goodUnlink(file)))
}

export function watchSourceAndCleanDest(
  srcDir: string,
  destDir: string,
  options: Options = {},
): void {
  console.log('TODO: watch and clean %s %s', srcDir, destDir, options)
  const client = new Client()
}
