export function labelImage(dataUrl: string, label: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(img, 0, 0);

      const bannerH = Math.max(28, img.height * 0.06);
      ctx.fillStyle = 'rgba(22, 163, 74, 0.9)';
      ctx.fillRect(0, img.height - bannerH, img.width, bannerH);

      const fontSize = Math.max(12, bannerH * 0.55);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, img.width / 2, img.height - bannerH / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}
