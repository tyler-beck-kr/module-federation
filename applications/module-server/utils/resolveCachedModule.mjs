
export default async (name, tag) => {
  // we may be able to statically import these, but is more extensible
  const locator = await import(`@kroger/kap-federation-${tag}-cache`)
  return locator.default(name) // path to radpack.json
}
