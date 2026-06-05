import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File, maxWidthOrHeight = 600, quality = 0.6): Promise<string> => {
  const options = {
    maxSizeMB: 0.1, // Max 100KB to fit easily inside Firestore docs
    maxWidthOrHeight: maxWidthOrHeight,
    initialQuality: quality,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error('Error al comprimir imagen:', error);
    throw error;
  }
};
