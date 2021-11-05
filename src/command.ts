import { cleanAllFiles, watchSourceAndCleanDest, Options } from '.'

async function doMain(): Promise<void> {
  const args = process.argv
  let watch = false
  let srcDir = 'src'
  let destDir = 'dist'
  const options: Options = {}

  for (let i = 2; i < args.length; ++i) {
    const arg = args[i]
    if (arg === '-w' || arg === '--watch') {
      watch = true
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true
    } else if (arg === '-s' || arg === '--source') {
      srcDir = args[++i]
    } else if (arg === '-d' || arg === '--dest') {
      destDir = args[++i]
    } else if (arg === '-w' || arg === '--watch-project') {
      options.watchProject = true
    } else if (arg === '-i' || arg === '--ignore-pattern') {
      options.ignorePattern = args[++i]
    } else if (arg === '-h' || arg === '--help') {
      console.log(args[1] + ' [-h] [-v] [-s <dir>] [-d <dir>] [-i <pattern>]')
      process.exit(0)
    } else {
      throw new Error(`Unknown arg: ${arg}`)
    }
  }

  await cleanAllFiles(srcDir, destDir, options)
  if (watch) {
    const watcher = watchSourceAndCleanDest(srcDir, destDir, options)
    await watcher.waitForWatches
    const stopWatching = watcher.stop
    process.on('exit', stopWatching)
    process.on('SIGTERM', stopWatching)
    process.on('SIGINT', stopWatching)
  }
}

export async function main(): Promise<void> {
  try {
    // await to ensure exceptions are propagated
    await doMain()
  } catch (e) {
    console.error(typeof e === 'string' ? e : e.message)
    process.exit(1)
  }
}
