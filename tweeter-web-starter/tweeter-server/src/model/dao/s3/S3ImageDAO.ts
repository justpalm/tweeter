// AI-assisted: see AI-ATTRIBUTION.md
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import type { ImageDAO, StoredImage } from "../ImageDAO";
import { IMAGE_CONTENT_TYPES, type ProfileImage } from "../../domain/ProfileImage";

// Reuse the client across DAOs and warm invocations; standard AWS configuration.
const clients = new Map<string, S3Client>();
function getClient(region: string): S3Client {
  let client = clients.get(region);
  if (!client) {
    client = new S3Client({ region });
    clients.set(region, client);
  }
  return client;
}

export class S3ImageDAO implements ImageDAO {
  public constructor(
    private readonly bucketName: string,
    private readonly region: string,
    private readonly client: S3Client = getClient(region),
  ) {
    if (!bucketName.trim() || !region.trim()) throw new Error("Image bucket and region are required");
  }

  public async uploadImage(image: ProfileImage): Promise<StoredImage> {
    const id = `profile-images/${randomBytes(32).toString("hex")}.${image.extension}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: id,
      Body: image.bytes,
      ContentType: IMAGE_CONTENT_TYPES[image.extension],
      // Never overwrite another image, even on a random-key collision.
      IfNoneMatch: "*",
      // Public reads are granted by the bucket policy; no object ACL is needed.
    }));
    return { id, url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${id}` };
  }

  public async deleteImage(id: string): Promise<void> {
    if (!/^profile-images\/[0-9a-f]{64}\.(png|jpg|jpeg|gif|webp)$/.test(id)) {
      throw new Error("Invalid image identifier");
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: id }));
  }
}
