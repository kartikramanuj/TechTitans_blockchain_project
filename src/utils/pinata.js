import axios from "axios";

const PINATA_API_KEY = "c0ca5f2f30c012ab37c7";
const PINATA_SECRET_API_KEY = "d900dca7666f7d5eb443abc102b2ee1b32b5c093638fbc3a49e554562daef6be";

export const uploadFileToIPFS = async (file) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  let data = new FormData();
  data.append("file", file);

  const metadata = JSON.stringify({
    name: "IdentityDocument",
    keyvalues: {
      project: "Web3Identity",
    },
  });
  data.append("pinataMetadata", metadata);

  const options = JSON.stringify({
    cidVersion: 0,
  });
  data.append("pinataOptions", options);

  try {
    const res = await axios.post(url, data, {
      maxBodyLength: "Infinity",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });
    return {
      success: true,
      ipfsHash: res.data.IpfsHash,
    };
  } catch (error) {
    console.error("Pinata upload error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};
