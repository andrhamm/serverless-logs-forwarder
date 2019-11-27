import pMap from 'p-map';

import { kms } from '../lib/aws-clients';

// assumes the secrets are strings
export const decryptSecrets = encryptedSecrets =>
  pMap(encryptedSecrets, encryptedSecret => new Promise(async (resolve) => {
    let decryptedSecret;
    if (encryptedSecret && encryptedSecret.length > 0) {
      const decryptResult = await kms.decrypt({
        CiphertextBlob: new Buffer(encryptedSecret, 'base64'),
      }).promise();

      decryptedSecret = decryptResult.Plaintext.toString();
    }

    resolve(decryptedSecret);
  }), { concurrency: 4 });
