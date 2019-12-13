const parser = require('i18next-scanner').Parser
const vfs = require('vinyl-fs')
const map = require('map-stream')
// const axios = require('axios')
// const runtimeConfig = require('../next.config').publicRuntimeConfig

function groupBy(arr, prop) {
  return arr.reduce((groups, item) => {
    const val = item[prop]
    groups[val] = groups[val] || []
    groups[val].push(item)
    return groups
  }, {})
}

// we should not send the same key with the same namespace from different files
const cache = {}

vfs.src(['./**/*.{js,jsx}', '!./node_modules/**/*']).pipe(
  map(async file => {
    const data = []
    parser.parseFuncFromString(
      file.contents.toString(),
      {list: ['t']},
      (key, {ns}) => {
        if (cache[key] && cache[key] === ns) return
        data.push({key, ns})
        cache[key] = ns
      }
    )

    if (data.length) {
      const groupped = groupBy(data, 'ns')

      const promises = Object.keys(groupped).map(ns => {
        const payload = groupped[ns].reduce((obj, item) => {
          obj[item.key] = item.key
          return obj
        }, {})

        console.log(`Adding the following key to namespace "${ns}"`, payload)
        console.info(payload)

        return Promise.resolve(payload)
        // axios
        //   .create({
        //     headers: {Authorization: runtimeConfig.locizeApiKey},
        //   })
        //   .post(
        //     `https://api.locize.io/missing/${
        //       runtimeConfig.locizeProjectId
        //     }/latest/en/${ns}`,
        //     payload
        //   )
        //   .catch(() => {})
      })

      await Promise.all(promises)
    }
  })
)
