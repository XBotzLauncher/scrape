const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function uploadImage(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);

  const formData = new FormData();
  formData.append('file', imageBuffer, {
    filename: fileName,
    contentType: 'image/jpeg',
  });

  const response = await fetch('https://imgdrop.web.id/upload.php', {
    method: 'POST',
    headers: formData.getHeaders(),
    body: formData.getBuffer(),
  });

  const result = await response.json();
  if (!result.success) throw new Error('Upload gagal');

  return result;
}

module.exports = uploadImage;