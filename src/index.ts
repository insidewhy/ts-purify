import { promisify } from 'util'
import { Client } from 'fb-watchman'
import { readdirSync, statSync, unlink, realpath, exists } from 'fs'
import { join } from 'path'

const goodUnlink = promisify(unlink)
const goodExists = promisify(exists)
const goodRealpath = promisify(realpath)

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
    if (toDelete.length) {
      console.info('Deleting files %O', toDelete)
    } else {
      console.info('No files to delete')
    }
  }

  return Promise.all(toDelete.map(file => goodUnlink(file)))
}

export function watchSourceAndCleanDest(
  srcDir: string,
  destDir: string,
  options: Options = {},
): Promise<void> {
  const client = new Client()

  return new Promise((_, reject) => {
    client.capabilityCheck({ optional: [], required: ['relative_root'] }, async error => {
      const endAndReject = (message: string) => {
        client.end()
        reject(new Error(message))
      }

      if (error) {
        return endAndReject(`Could not confirm capabilities: ${error.message}`)
      }

      const fullSrcDir = await goodRealpath(srcDir)
      client.command(['watch-project', fullSrcDir], (error, watchResp) => {
        if (error) {
          return endAndReject(`Could not initiate watch: ${error.message}`)
        }

        const sub: any = {
          expression: ['allof', ['match', '*.ts']],
          fields: ['name', 'exists'],
        }
        const relativePath = watchResp.relative_path
        if (relativePath) {
          sub.relative_root = relativePath
        }

        client.command(['subscribe', watchResp.watch, 'sub-name', sub], error => {
          if (error) {
            return endAndReject(`Could not subscribe to changes: ${error.message}`)
          }

          client.on('subscription', change => {
            change.files.forEach((fileChange: any) => {
              if (!fileChange.exists) {
                const fileRoot = fileChange.name.replace(/\.ts$/, '')
                const toDelete = [
                  join(destDir, `${fileRoot}.js`),
                  join(destDir, `${fileRoot}.js.map`),
                ]

                // don't map/await these, just log on failure
                toDelete.forEach(async file => {
                  if (await goodExists(file)) {
                    unlink(file, err => {
                      if (err) {
                        console.warn(`Failed to remove ${file}`)
                      } else if (options.verbose) {
                        console.info(`Removed ${file}`)
                      }
                    })
                  }
                })
              }
            })
          })
        })
      })
    })
  })
}
