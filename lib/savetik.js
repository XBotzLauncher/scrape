const { execFile } = require('child_process');
const cheerio = require('cheerio');

function curlPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-X', 'POST',
      '--compressed',
      '--data-raw', body,
    ];

    for (const [k, v] of Object.entries(headers)) {
      args.push('-H', `${k}: ${v}`);
    }

    args.push(url);

    execFile('curl', args, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error('Parse error: ' + stdout.slice(0, 200)));
      }
    });
  });
}

async function savetikDownload(videoUrl, lang = 'id') {
  const params = new URLSearchParams();
  params.append('q', videoUrl);
  params.append('lang', lang);
  params.append('cftoken', '');

  const headers = {
    'authority': 'savetik.co',
    'accept': '*/*',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'origin': 'https://savetik.co',
    'referer': 'https://savetik.co/id/douyin-downloader',
    'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'x-requested-with': 'XMLHttpRequest',
  };

  const result = await curlPost(
    'https://savetik.co/api/ajaxSearch',
    params.toString(),
    headers
  );

  if (result.status !== 'ok') {
    throw new Error('Gagal: ' + JSON.stringify(result));
  }

  const $ = cheerio.load(result.data);

  const thumbnail = $('.image-tik img').attr('src') || '';
  const title = $('.clearfix h3').text().trim();
  const duration = $('.clearfix p').first().text().trim();
  const tiktokId = $('#TikTokId').val() || '';

  const downloadLinks = [];
  $('.dl-action a.tik-button-dl').each((i, el) => {
    const href = $(el).attr('href');
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (href) downloadLinks.push({ label, href });
  });

  return { status: 'ok', thumbnail, title, duration, tiktokId, downloadLinks };
}

module.exports = { savetikDownload };