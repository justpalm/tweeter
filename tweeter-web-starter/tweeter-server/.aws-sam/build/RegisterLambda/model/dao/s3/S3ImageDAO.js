"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3ImageDAO = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const client_s3_1 = require("@aws-sdk/client-s3");
const node_crypto_1 = require("node:crypto");
const ProfileImage_1 = require("../../domain/ProfileImage");
// Reuse the client across DAOs and warm invocations; standard AWS configuration.
const clients = new Map();
function getClient(region) {
    let client = clients.get(region);
    if (!client) {
        client = new client_s3_1.S3Client({ region });
        clients.set(region, client);
    }
    return client;
}
class S3ImageDAO {
    bucketName;
    region;
    client;
    constructor(bucketName, region, client = getClient(region)) {
        this.bucketName = bucketName;
        this.region = region;
        this.client = client;
        if (!bucketName.trim() || !region.trim())
            throw new Error("Image bucket and region are required");
    }
    async uploadImage(image) {
        const id = `profile-images/${(0, node_crypto_1.randomBytes)(32).toString("hex")}.${image.extension}`;
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucketName,
            Key: id,
            Body: image.bytes,
            ContentType: ProfileImage_1.IMAGE_CONTENT_TYPES[image.extension],
            // Never overwrite another image, even on a random-key collision.
            IfNoneMatch: "*",
            // Public reads are granted by the bucket policy; no object ACL is needed.
        }));
        return { id, url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${id}` };
    }
    async deleteImage(id) {
        if (!/^profile-images\/[0-9a-f]{64}\.(png|jpg|jpeg|gif|webp)$/.test(id)) {
            throw new Error("Invalid image identifier");
        }
        await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucketName, Key: id }));
    }
}
exports.S3ImageDAO = S3ImageDAO;
