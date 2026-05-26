const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function generateImage(imagePath, prompt) {
  const imageBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);

  const formData = new FormData();
  formData.append('image', imageBuffer, {
    filename: fileName,
    contentType: 'image/jpeg',
  });
  formData.append('prompt', prompt);

  const response = await fetch('https://gpt2images.vercel.app/api/generate', {
    method: 'POST',
    headers: formData.getHeaders(),
    body: formData.getBuffer(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const buffer = await response.arrayBuffer();
  const outputPath = `edited_${Date.now()}.png`;
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}

generateImage('./foto.jpg', 'ubah background menjadi langit malam berbintang')
  .then(out => console.log('Done:', out))
  .catch(err => console.error('Error:', err.message));
