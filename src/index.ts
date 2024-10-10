import dotenv from "dotenv";
import fs, { read } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import util from "util";
import { Logger } from "./logger";

const statAsync = util.promisify(fs.stat);
const readFileAsync = util.promisify(fs.readFile);
const readDirAsync = util.promisify(fs.readdir);

dotenv.config();

type BlobUploadResult = {
  success: boolean;
  fileName: string;
};

async function getFilePathList(
  dir: string,
  prefix: string = ""
): Promise<string[]> {
  let results: string[] = [];

  const list = await readDirAsync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = await statAsync(filePath);

    if (stat && stat.isDirectory()) {
      const nextPath = await getFilePathList(filePath, path.join(prefix, file));
      results = results.concat(nextPath);
    } else {
      results.push(path.join(prefix, file));
    }
  }

  return results;
}

// async function getFileByPath(filesPath: string[], baseDir: string) {
//   for (let i = 0; i < filesPath.length; i++) {
//     const filePath = path.join(baseDir, filesPath[i]);

//     try {
//       const stat = await statAsync(filePath);
//       if (stat.isDirectory()) {
//         Logger.warn("Skipping directory", filePath);
//         continue;
//       }

//       const data = await readFileAsync(filePath, "utf8");
//       const res = await uploadToBlob(filesPath[i], data);

//       if (!res.success) {
//         console.log(
//           "Upload failed for",
//           filesPath[i],
//           "Aborting further uploads."
//         );
//         break;
//       }
//     } catch (err) {
//       Logger.error("Error processing file", filePath, err);
//       break;
//     }
//   }
// }

async function getFileByPath(filesPath: string[], baseDir: string) {
  const uploadPromises: Promise<BlobUploadResult>[] = [];

  for (let i = 0; i < filesPath.length; i++) {
    const filePath = path.join(baseDir, filesPath[i]);

    try {
      const stat = await statAsync(filePath);
      if (stat.isDirectory()) {
        Logger.warn("Skipping directory", filePath);
        continue;
      }

      const data = await readFileAsync(filePath, "utf8");
      const uploadPromise = uploadToBlob(filesPath[i], data);
      uploadPromises.push(uploadPromise);
    } catch (err) {
      Logger.error("Error processing file", filePath, err);
      break;
    }
  }

  try {
    const results = await Promise.all(uploadPromises);
    const failedUploads = results.filter((result) => !result.success);
    if (failedUploads.length > 0) {
      Logger.error(
        `${failedUploads.length} uploads failed :`,
        failedUploads[0].fileName
      );
    } else {
      Logger.success("All uploads completed successfully.");
    }
  } catch (error) {
    Logger.error("Error in parallel uploads:", error);
  }
}

async function uploadToBlob(
  fileName: string,
  file: string
): Promise<BlobUploadResult> {
  try {
    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365, // 1 year
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    Logger.highlight("Uploaded", blob.url);

    return {
      success: true,
      fileName,
    };
  } catch (e) {
    Logger.error("Error uploading", fileName, e);
    return {
      success: false,
      fileName,
    };
  }
}

async function main() {
  const targetFolder = "./blob";
  const files = await getFilePathList(targetFolder);
  await getFileByPath(files, targetFolder);
}

main()
  .then(() => {
    Logger.success("Done");
  })
  .catch((err) => {
    Logger.error(err);
  });
