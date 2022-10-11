import { fromBuffer } from "file-type";
import { storage } from "../firebaseConfig";
import * as uuid from "uuid";

import fetch from "node-fetch";
const projectId = process.env.GCLOUD_PROJECT;
export const url2storage = async (
  url: string,
  options: {
    bucket?: string;
    folderPath?: string;
    fileName?: string;
  } = {}
) => {
  const response = await fetch(url);
  if (response.ok) {
    const dataBuffer = await response.buffer();
    const fileName = options.fileName ?? url.split("/").pop();
    return await data2storage(dataBuffer, { ...options, fileName });
  } else {
    return null;
  }
};

export const data2storage = async (
  data: Buffer | string,
  options: {
    bucket?: string;
    folderPath?: string;
    fileName?: string;
    fileType?: { mime: string; ext: string };
    cacheControl?: string;
  } = {}
) => {
  const bucket = storage.bucket(options.bucket ?? `${projectId}.appspot.com`);
  const fileType = options.fileType
    ? options.fileType
    : Buffer.isBuffer(data)
    ? await fromBuffer(data)
    : {
        ext: ".txt",
        mime: "text/plain",
      };
  let fileName = options.fileName ?? uuid.v4();
  if (!fileName.includes(".")) {
    fileName = `${fileName}.${fileType.ext}`;
  }

  const file = bucket.file(
    `${options.folderPath ?? "rowyUploads"}/${fileName}`
  );
  const token = uuid.v4();
  await file.save(data, {
    metadata: {
      contentType: fileType.mime,
      metadata: { firebaseStorageDownloadTokens: token },
      cacheControl: options.cacheControl ?? `public,max-age=3600`,
    },
  });
  return {
    downloadURL: `https://firebasestorage.googleapis.com/v0/b/${
      bucket.name
    }/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`,
    name: fileName,
    type: fileType.mime,
    lastModifiedTS: new Date().getTime(),
  };
};
