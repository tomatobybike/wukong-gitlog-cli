import { getPackage } from '../utils/getPackage.mjs'
import { showVersionInfo } from '../utils/showVersionInfo.mjs'

export const versionAction = () => {
  const pkg = getPackage()
  showVersionInfo(pkg)
}
