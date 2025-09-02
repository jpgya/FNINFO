
const encryptedToken = '暗号化済みトークン文字列';




function getDecryptedToken(passphrase) {
  if (!window.CryptoJS) {
    throw new Error('CryptoJSライブラリが読み込まれていません');
  }
  try {
    const bytes = window.CryptoJS.AES.decrypt(encryptedToken, passphrase);
    const decrypted = bytes.toString(window.CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error('複合化失敗');
    return decrypted;
  } catch (err) {
    console.error('トークン複合化エラー:', err);
    return null;
  }
}


window.getDecryptedToken = getDecryptedToken;
window.encryptedToken = encryptedToken;