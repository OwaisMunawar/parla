// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * Wires store/Parla.storekit into the generated iOS scheme, so a Debug run
 * from Xcode uses local StoreKit testing: products load and purchases
 * (including the free trial) complete in the simulator with no App Store
 * Connect account. ios/ is generated (CNG), so this runs on every prebuild.
 *
 * Release schemes are untouched; the file only affects Xcode's Run action.
 */
const SOURCE = path.join('store', 'Parla.storekit');

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withStoreKitConfig = (config) =>
  withDangerousMod(config, [
    'ios',
    (mod) => {
      const { projectRoot, platformProjectRoot, projectName } = mod.modRequest;
      const fileName = path.basename(SOURCE);
      fs.copyFileSync(path.join(projectRoot, SOURCE), path.join(platformProjectRoot, fileName));

      const scheme = path.join(
        platformProjectRoot,
        `${projectName}.xcodeproj`,
        'xcshareddata',
        'xcschemes',
        `${projectName}.xcscheme`,
      );
      if (!fs.existsSync(scheme)) {
        throw new Error(`withStoreKitConfig: scheme not found at ${scheme}`);
      }
      let xml = fs.readFileSync(scheme, 'utf8');
      if (!xml.includes('StoreKitConfigurationFileReference')) {
        // The identifier is resolved relative to the .xcodeproj's folder.
        const reference = `\n      <StoreKitConfigurationFileReference\n         identifier = "../${fileName}">\n      </StoreKitConfigurationFileReference>`;
        xml = xml.replace(/(<LaunchAction[^>]*>)/, `$1${reference}`);
        fs.writeFileSync(scheme, xml);
      }
      return mod;
    },
  ]);

module.exports = withStoreKitConfig;
