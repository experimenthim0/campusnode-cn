/**
 * Utility for cropping and rotating images on an offscreen Canvas
 * Designed for use with react-easy-crop coordinates.
 */

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle
 */
export function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Crops and rotates an image based on react-easy-crop pixel coordinates.
 *
 * @param {string} imageSrc - Source URL or DataURL of the image
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop - react-easy-crop croppedAreaPixels
 * @param {number} [rotation=0] - Rotation angle in degrees
 * @param {{ horizontal: boolean, vertical: boolean }} [flip={ horizontal: false, vertical: false }] - Flip settings
 * @param {string} [mimeType='image/webp'] - Target MIME type (falls back to image/jpeg)
 * @param {number} [quality=0.90] - Compression quality between 0 and 1
 * @returns {Promise<{ blob: Blob, fileUrl: string }>}
 */
export default async function getCroppedImg(
  imageSrc,
  pixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  mimeType = 'image/webp',
  quality = 0.90
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get 2d context for image cropping.');
  }

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to a central point on canvas to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image onto canvas
  ctx.drawImage(image, 0, 0);

  // Create cropped canvas
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('Could not get 2d context for cropped canvas.');
  }

  croppedCanvas.width = Math.round(pixelCrop.width);
  croppedCanvas.height = Math.round(pixelCrop.height);

  // Draw the cropped region from the rotated canvas onto the target canvas
  croppedCtx.drawImage(
    canvas,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height)
  );

  // Export to Blob with fallback
  const blob = await new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          // Fallback to JPEG if WebP fails
          croppedCanvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) {
                resolve(fallbackBlob);
              } else {
                reject(new Error('Canvas export to blob failed.'));
              }
            },
            'image/jpeg',
            quality
          );
        }
      },
      mimeType,
      quality
    );
  });

  return {
    blob,
    fileUrl: URL.createObjectURL(blob),
  };
}
