import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Uploads an image buffer to Cloudinary under the given folder. Used by
// the avatar and (future) portfolio upload routes.
export function uploadImage(
  buffer: Buffer,
  folder: string
): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed.'))
          return
        }
        resolve({ url: result.secure_url, public_id: result.public_id })
      }
    )
    stream.end(buffer)
  })
}
