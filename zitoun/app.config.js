// Complète app.json. Seul l'identifiant d'application peut être réglé de l'extérieur: ZITOUN_APP_ID=com.votrenom.zitoun.
const { resolveAppId } = require('./scripts/appId');

module.exports = ({ config }) => {
  const id = resolveAppId(process.env.ZITOUN_APP_ID, config.android?.package ?? 'com.faridchakour.zitoun');
  return { ...config, android: { ...config.android, package: id } };
};
