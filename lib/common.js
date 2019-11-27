import { decryptSecrets } from './kms-utils';

export const tryParseJson = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

export const fromEntries = entries => entries.reduce((acc, [k, v]) => {
  acc[k] = v;
  return acc;
}, {});

export const getEnv = async (envVarKeys) => {
  const filteredEntries = Object.entries(process.env).filter(([k]) => envVarKeys.indexOf(k) !== -1);

  const env = fromEntries(filteredEntries);

  const encryptedKeys = [];
  const encryptedVals = [];

  filteredEntries.filter(
    ([k]) => k.endsWith('_ENCRYPTED'),
  ).forEach(([k, v]) => {
    encryptedKeys.push(k);
    encryptedVals.push(v);
  });

  const decryptedVals = await decryptSecrets(encryptedVals);

  encryptedKeys.forEach((k, i) => {
    const newKey = k.substr(0, k.lastIndexOf('_ENCRYPTED'));

    env[newKey] = decryptedVals[i];
  });

  return env;
};
