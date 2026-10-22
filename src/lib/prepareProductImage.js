// Crop and lightly adjust the selected photo before it is uploaded to the public catalog bucket.
export async function prepareProductImage(file, adjustments) {
  const bitmap = await createImageBitmap(file);
  const rotation = ((adjustments.rotation % 360) + 360) % 360;
  const sideways = rotation === 90 || rotation === 270;
  const source = document.createElement('canvas');
  source.width = sideways ? bitmap.height : bitmap.width;
  source.height = sideways ? bitmap.width : bitmap.height;
  const sourceContext = source.getContext('2d');
  sourceContext.translate(source.width / 2, source.height / 2);
  sourceContext.rotate(rotation * Math.PI / 180);
  sourceContext.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const context = canvas.getContext('2d');
  const coverScale = Math.max(canvas.width / source.width, canvas.height / source.height) * adjustments.zoom;
  const drawWidth = source.width * coverScale;
  const drawHeight = source.height * coverScale;
  const drawX = (canvas.width - drawWidth) * (adjustments.x / 100);
  const drawY = (canvas.height - drawHeight) * (adjustments.y / 100);
  context.filter = `brightness(${adjustments.brightness}%) contrast(104%) saturate(104%)`;
  context.drawImage(source, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('No se pudo preparar la fotografía.')), 'image/webp', 0.9));
  return new File([blob], `brava-${Date.now()}.webp`, { type: 'image/webp', lastModified: Date.now() });
}
