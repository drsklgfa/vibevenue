import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { config } from "./config.js";

let client: S3Client | null = null;
let ready = false;
export interface StoredObject { key: string; url: string; }
function s3(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: config.objectStorage.region,
    endpoint: config.objectStorage.endpoint,
    forcePathStyle: config.objectStorage.forcePathStyle,
    credentials: { accessKeyId: config.objectStorage.accessKeyId, secretAccessKey: config.objectStorage.secretAccessKey }
  });
  return client;
}
export async function initializeStorage(): Promise<void> {
  if (config.storageDriver === "s3") {
    await s3().send(new HeadBucketCommand({ Bucket: config.objectStorage.bucket }));
    ready = true;
    return;
  }
  await fs.mkdir(path.resolve(config.uploadDir), { recursive: true });
  ready = true;
}
export function storageReady() { return ready; }
export function localStorage() { return config.storageDriver !== "s3"; }
export async function getStoredImageUrl(key: string, fallback = ""): Promise<string> {
  if (config.storageDriver !== "s3") return fallback || `/uploads/${key}`;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: config.objectStorage.bucket, Key: key }), { expiresIn: 3600 });
}
export async function storeImage(venueId: string, buffer: Buffer): Promise<StoredObject> {
  const key = `venues/${venueId}/${Date.now()}-${nanoid(10)}.webp`;
  if (config.storageDriver === "s3") {
    await s3().send(new PutObjectCommand({ Bucket: config.objectStorage.bucket, Key: key, Body: buffer, ContentType: "image/webp", CacheControl: "private, max-age=3600" }));
    return { key, url: await getStoredImageUrl(key) };
  }
  const full = path.resolve(config.uploadDir, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return { key, url: `/uploads/${key}` };
}
export async function deleteImage(key: string): Promise<void> {
  if (config.storageDriver === "s3") {
    await s3().send(new DeleteObjectCommand({ Bucket: config.objectStorage.bucket, Key: key }));
    return;
  }
  await fs.unlink(path.resolve(config.uploadDir, key)).catch(() => undefined);
}
