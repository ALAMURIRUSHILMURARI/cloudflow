/**
 * CloudFlow S3 Attachment & File Upload Service
 * 
 * ARCHITECTURAL DESIGN & AWS ROADMAP:
 * Current: Client-side file abstraction with simulated presigned URL negotiation.
 * Future AWS Integration:
 *   1. Client initiates upload: POST /uploads/presign (API Gateway -> Lambda)
 *   2. Lambda generates Amazon S3 Pre-signed URL with restrictive policy and 15-minute expiration
 *   3. Client uploads directly to S3 bucket (PUT https://${VITE_S3_BUCKET}.s3.amazonaws.com/...)
 *   4. S3 triggers ObjectCreated notification to AWS Lambda for virus scanning & metadata indexing
 */

class UploadService {
  /**
   * Request a pre-signed S3 upload URL and simulate direct-to-S3 binary upload.
   * @param {File} file 
   * @returns {Promise<{ fileName: string, fileSize: string, s3Url: string, key: string }>}
   */
  async uploadAttachment(file) {
    // Simulated pre-signed URL generation and S3 PUT latency (400ms)
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (!file) {
      throw new Error('No file provided for upload');
    }

    const s3Key = `attachments/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileSizeFormatted = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;

    return {
      fileName: file.name,
      fileSize: fileSizeFormatted,
      s3Key,
      s3Url: `https://mock-s3-bucket.s3.us-east-1.amazonaws.com/${s3Key}`,
      uploadedAt: new Date().toISOString()
    };
  }
}

export const uploadService = new UploadService();
export default uploadService;
