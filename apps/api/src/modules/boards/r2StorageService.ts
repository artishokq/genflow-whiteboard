import crypto from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

function getRequiredEnv(name: (typeof REQUIRED_ENV)[number]): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for R2 storage`);
  }
  return value.trim();
}

const accountId = getRequiredEnv("R2_ACCOUNT_ID");
const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");
const bucket = getRequiredEnv("R2_BUCKET");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function extensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  return "bin";
}

export function buildBoardImageKey(boardId: string, mimeType: string): string {
  return `boards/${boardId}/${crypto.randomUUID()}.${extensionFromMime(mimeType)}`;
}

export function buildUserAvatarKey(userId: string, mimeType: string): string {
  return `users/${userId}/${crypto.randomUUID()}.${extensionFromMime(mimeType)}`;
}

async function uploadBufferToR2(args: {
  key: string;
  contentType: string;
  body: Buffer;
}) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

async function getObjectFromR2(key: string): Promise<GetObjectCommandOutput> {
  return client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

async function listObjectKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of out.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function deleteObjectFromR2(key: string) {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export default {
  uploadBufferToR2,
  getObjectFromR2,
  listObjectKeys,
  deleteObjectFromR2,
};
