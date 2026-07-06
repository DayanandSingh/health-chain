const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { sha256Buffer, sha256Text } = require("../utils/hash");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

async function uploadBuffer({ buffer, fileName }) {
  if (process.env.IPFS_MODE === "mock") {
    const hash = sha256Buffer(buffer);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const diskFilename = `${unique}-${fileName}`;
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, diskFilename), buffer);
    return {
      cid: diskFilename,
      hash,
      gatewayUrl: `local://${diskFilename}`,
      fileName,
    };
  }

  const form = new FormData();
  form.append("file", buffer, fileName);

  const response = await axios.post(`${process.env.IPFS_API_URL}/add`, form, {
    headers: form.getHeaders()
  });

  return {
    cid: response.data.Hash,
    hash: sha256Buffer(buffer),
    gatewayUrl: `ipfs://${response.data.Hash}`,
    fileName
  };
}

function buildRecordHash(payload) {
  return sha256Text(JSON.stringify(payload));
}

module.exports = { uploadBuffer, buildRecordHash };

