import axios from "axios";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

export const uploadFileToIPFS = async (file) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  let data = new FormData();
  data.append("file", file);

  const metadata = JSON.stringify({
    name: "IdentityDocument",
    keyvalues: { project: "Web3Identity" },
  });
  data.append("pinataMetadata", metadata);

  const options = JSON.stringify({ cidVersion: 0 });
  data.append("pinataOptions", options);

  try {
    const headers = {
      "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
    };

    if (PINATA_JWT) {
      headers["Authorization"] = `Bearer ${PINATA_JWT}`;
    } else {
      headers["pinata_api_key"] = PINATA_API_KEY;
      headers["pinata_secret_api_key"] = PINATA_SECRET_API_KEY;
    }

    const res = await axios.post(url, data, {
      maxBodyLength: "Infinity",
      headers,
    });
    return { success: true, ipfsHash: res.data.IpfsHash };
  } catch (error) {
    console.error("Pinata upload error:", error);
    return { success: false, message: error.message };
  }
};
