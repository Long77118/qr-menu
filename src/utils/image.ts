/**
 * Compress images on the client side using HTML5 Canvas before storing in localStorage
 */

export function compressImageFile(
  file: File,
  maxDimension = 800,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Tệp tải lên không phải là hình ảnh'));
      return;
    }

    // Check raw file size limit (e.g. max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Dung lượng ảnh gốc không được vượt quá 5MB'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ảnh bị lỗi hoặc không hỗ trợ định dạng'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo bộ xử lý ảnh'));
          return;
        }

        // Draw image smoothly
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(new Error('Không thể nén ảnh: ' + (err as Error).message));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function compressHeaderBackgroundImage(file: File): Promise<string> {
  return compressImageFile(file, 1400, 0.82);
}
