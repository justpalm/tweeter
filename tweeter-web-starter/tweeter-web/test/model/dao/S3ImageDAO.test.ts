/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import crypto from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "../../../../tweeter-server/node_modules/@aws-sdk/client-s3";
import { S3ImageDAO } from "../../../../tweeter-server/src/model/dao/s3/S3ImageDAO";
import { decodeProfileImage } from "../../../../tweeter-server/src/model/domain/ProfileImage";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==";
const dao = new S3ImageDAO("profile-photos", "us-east-2");
afterEach(() => { jest.restoreAllMocks(); });

describe("S3ImageDAO (mocked SDK, no AWS calls)", () => {
  it("uploads decoded bytes with MIME type and no overwrite/ACL, returning its URL and opaque id", async () => {
    const send = jest.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({}));
    const image = decodeProfileImage(png, "PNG");
    const stored = await dao.uploadImage(image);
    expect(stored.id).toMatch(/^profile-images\/[0-9a-f]{64}\.png$/);
    expect(stored.url).toBe(`https://profile-photos.s3.us-east-2.amazonaws.com/${stored.id}`);
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "profile-photos", Key: stored.id, Body: Buffer.from(png, "base64"), ContentType: "image/png", IfNoneMatch: "*",
    });
  });

  it("assigns independent image identifiers", async () => {
    jest.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({}));
    const first = await dao.uploadImage(decodeProfileImage(png, "png"));
    const second = await dao.uploadImage(decodeProfileImage(png, "png"));
    expect(first.id).not.toBe(second.id);
  });

  it("deletes only the given image in its configured bucket", async () => {
    const send = jest.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({}));
    const id = `profile-images/${"01".repeat(32)}.png`;
    await dao.deleteImage(id);
    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    expect(send.mock.calls[0][0].input).toEqual({ Bucket: "profile-photos", Key: id });
  });

  it.each(["https://other-bucket/image.png", "../image.png", "other-prefix/image.png", ""])(
    "refuses a foreign or malformed image identifier %s", async id => {
      const send = jest.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({}));
      await expect(dao.deleteImage(id)).rejects.toThrow("Invalid image identifier");
      expect(send).not.toHaveBeenCalled();
    },
  );

  it.each(["upload", "delete"])("propagates %s failures", async operation => {
    const error = new Error("S3 unavailable");
    jest.spyOn(S3Client.prototype, "send").mockImplementation(async () => { throw error; });
    const result = operation === "upload" ? dao.uploadImage(decodeProfileImage(png, "png"))
      : dao.deleteImage(`profile-images/${"02".repeat(32)}.png`);
    await expect(result).rejects.toBe(error);
  });

  it("does not upload if secure key generation fails", async () => {
    const send = jest.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({}));
    jest.spyOn(crypto, "randomBytes").mockImplementation(() => { throw new Error("random source unavailable"); });
    await expect(dao.uploadImage(decodeProfileImage(png, "png"))).rejects.toThrow("random source unavailable");
    expect(send).not.toHaveBeenCalled();
  });

  it("requires bucket and region configuration", () => {
    expect(() => new S3ImageDAO(" ", "us-east-2")).toThrow("Image bucket and region are required");
    expect(() => new S3ImageDAO("photos", " ")).toThrow("Image bucket and region are required");
  });
});

describe("profile image validation", () => {
  it.each(["", "!!!!", "data:image/png;base64," + png, "AB==", "a".repeat(4 * 1024 * 1024 + 4)])(
    "rejects malformed, noncanonical or oversized base64 (case %#)", base64 => {
      expect(() => decodeProfileImage(base64, "png")).toThrow(/^bad-request:/);
    },
  );

  it("accepts the exact 3 MiB boundary and rejects a larger decoded image", () => {
    const bytes = Buffer.alloc(3 * 1024 * 1024);
    Buffer.from(png, "base64").copy(bytes);
    expect(decodeProfileImage(bytes.toString("base64"), "png").bytes.length).toBe(bytes.length);
    expect(() => decodeProfileImage(Buffer.concat([bytes, Buffer.from([0])]).toString("base64"), "png"))
      .toThrow(/^bad-request:/);
  });

  it.each([
    ["jpg", Buffer.from([255, 216, 255, 0])],
    ["jpeg", Buffer.from([255, 216, 255, 0])],
    ["gif", Buffer.from("GIF89a")],
    ["webp", Buffer.from("RIFF0000WEBP")],
  ])("recognizes the %s header", (extension, bytes) => {
    expect(decodeProfileImage((bytes as Buffer).toString("base64"), extension as string).extension).toBe(extension);
  });
});
