const fs = require('fs');
const path = require('path');
const { overrideDevServer } = require('customize-cra');
const forge = require('node-forge');

const devServerConfig = () => config => {
  const pfxFile = fs.readFileSync(path.resolve(__dirname, '../SSL/star-niso-com-vn.pfx'));
  const p12Asn1 = forge.asn1.fromDer(pfxFile.toString('binary'), false);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '123456');
  let cert, key;
  for (const safeContents of p12.safeContents) {
    for (const safeBag of safeContents.safeBags) {
      if (safeBag.cert) {
        cert = forge.pki.certificateToPem(safeBag.cert);
      } else if (safeBag.key) {
        key = forge.pki.privateKeyToPem(safeBag.key);
      }
    }
  }

  return {
    ...config,
    https: {
      key: key,
      cert: cert,
    },
  };
};

module.exports = {
  devServer: overrideDevServer(devServerConfig())
};
