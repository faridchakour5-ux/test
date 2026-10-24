// Complète app.json. Seul l'identifiant d'application peut être réglé de l'extérieur (voir scripts/appId.js).
const { resolveAppId } = require('./scripts/appId');

module.exports = ({ config }) => {
  const id = resolveAppId(process.env.KALAM_APP_ID, config.android?.package ?? 'com.kalam.app');
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier: id },
    android: { ...config.android, package: id },
  };
};
