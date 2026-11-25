"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_CONTENT_TYPES = void 0;
exports.decodeProfileImage = decodeProfileImage;
exports.IMAGE_CONTENT_TYPES = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
};
/** Bound the decoded upload to 3 MiB, leaving room for base64/JSON in Lambda. */
function decodeProfileImage(base64, fileExtension) {
    const extension = fileExtension.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(exports.IMAGE_CONTENT_TYPES, extension)) {
        throw new Error("bad-request: Image must be PNG, JPEG, GIF, or WebP");
    }
    if (!base64 || base64.length > 4 * 1024 * 1024 ||
        base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
        throw new Error("bad-request: Invalid image base64 or image exceeds 3 MiB");
    }
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0 || bytes.toString("base64") !== base64) {
        throw new Error("bad-request: Invalid image base64");
    }
    const matches = extension === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : extension === "jpg" || extension === "jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
            : extension === "gif" ? ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))
                : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (!matches)
        throw new Error("bad-request: Image content does not match its file extension");
    return { bytes, extension: extension };
}
