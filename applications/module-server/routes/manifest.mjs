const getMiddleware = ({ federatedModules, config }) => async (ctx, next) => {

  const getModuleManifest = (name) => {
    const id =  `radpack_${name}`
    return config[id]
  }

  const getAllManifests = () => Object.keys(federatedModules).map((name) => getModuleManifest(name))

  if (ctx.params.module === '/*') {
    ctx.body = { exports :  getAllManifests().reduce((result, def) => {
      return Object.assign(result, def.exports)
    }, {}) }
    ctx.status = 200  
  } else {
    const manifest = getModuleManifest(ctx.params.module.substring(1))
    if (manifest){
      ctx.body = {
        ...manifest,
      }
      ctx.status = 200  
    }
  }

  await next()
}

export default getMiddleware


// router.post(
//   `${MANIFEST_PATH}`,
//   composeBindings(
//     {
//       category: 'radpack',
//       subcategory: 'filtered-manifest',
//     },
//     async (ctx, next) => {
//       const list = ctx.req.body
//       if (!Array.isArray(list)) {
//         ctx.status = 400
//         ctx.body = "Bad Request - Expected JSON Array"
//       } else { 
//         const manifests = list.map(name => getModuleManifest(name)).filter(Boolean)
//         ctx.body = { exports :  getAllManifests().reduce((result, def) => {
//           return Object.assign(result, def.exports)
//         }, {}) }
//         ctx.status = 200
//       }
//       await next()
//     }
//   )
// ) 

