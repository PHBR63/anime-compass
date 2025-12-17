/**
 * Utilitário para recortar imagens usando Canvas API
 * Recebe uma imagem e as coordenadas de crop e retorna um Blob
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Cria uma imagem a partir de uma URL
 */
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Recorta a imagem com base nas coordenadas fornecidas
 * @param imageSrc - URL da imagem original (pode ser data URL ou URL normal)
 * @param pixelCrop - Coordenadas do recorte em pixels
 * @param outputSize - Tamanho de saída da imagem (default: 256x256)
 * @returns Blob da imagem recortada
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize: number = 256
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Não foi possível criar contexto do canvas');
  }

  // Define o tamanho de saída do canvas
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Desenha a parte recortada da imagem no canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  // Converte o canvas para Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao criar blob da imagem'));
        }
      },
      'image/jpeg',
      0.9
    );
  });
}
