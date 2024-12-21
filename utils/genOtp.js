import crypto from "crypto";

function genOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

export default genOtp;
