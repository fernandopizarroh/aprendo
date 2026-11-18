import imageCompression from "browser-image-compression";

// PRD 6.2: máx. 1024-1500px lado mayor antes de subir.
export async function compressImages(files: File[], maxSide = 1500): Promise<File[]> {
  return Promise.all(
    files.map((f) =>
      imageCompression(f, { maxWidthOrHeight: maxSide, maxSizeMB: 1, useWebWorker: true }),
    ),
  );
}
