// AI-assisted: see AI-ATTRIBUTION.md
import type { ProfileImage } from "../domain/ProfileImage";

export interface StoredImage {
  /** Opaque storage identifier; callers must not interpret it as an S3 key. */
  readonly id: string;
  readonly url: string;
}

/** Image storage independent of any cloud provider or bucket. Failures reject. */
export interface ImageDAO {
  /** Stores a new, independently identified image and returns its public URL. */
  uploadImage(image: ProfileImage): Promise<StoredImage>;
  /** Deletes only this DAO's image identifier. Already absent is a success. */
  deleteImage(id: string): Promise<void>;
}
