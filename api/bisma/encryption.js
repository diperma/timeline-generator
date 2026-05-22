const crypto = require("crypto");

function encryptField(plaintext, passphrase) {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(256);
  const iterations = 999;
  const key = crypto.pbkdf2Sync(
    Buffer.from(passphrase, "utf8"),
    salt,
    iterations,
    32,
    "sha512",
  );

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(String(plaintext), "utf8")),
    cipher.final(),
  ]);

  const output = {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    salt: salt.toString("hex"),
    iterations,
  };

  return Buffer.from(JSON.stringify(output), "utf8").toString("base64");
}

module.exports = {
  encryptField,
};
