const axios = require('axios');
const FormData = require('form-data');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({
  jar: cookieJar,
  withCredentials: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://www.imagetotext.info',
    'Referer': 'https://www.imagetotext.info/',
    'Sec-Ch-Ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?1',
    'Sec-Ch-Ua-Platform': '"Android"',
    'X-Requested-With': 'XMLHttpRequest'
  }
}));

async function getPageData() {
  const { data } = await client.get('https://www.imagetotext.info/');
  const $ = cheerio.load(data);

  const csrfToken = $('meta[name="csrf-token"]').attr('content') ||
                    $('input[name="_token"]').attr('value');
  if (!csrfToken) {
    throw new Error('CSRF token tidak ditemukan di halaman.');
  }

  return { csrfToken };
}

async function verifyCaptcha(csrfToken) {
  const timestamp = Date.now();
  const endpoint = `https://www.imagetotext.info/emd/captcha-verify/${timestamp}`;

  const params = new URLSearchParams();
  params.append('emd_is_tool_premium', '0');
  params.append('emd_captcha_1', "1CCaXLG8Ufj2nCvxTnIxCyXRwZhWHda2tepVJ2BwDJ");
  params.append('emd_captcha_2', "");
  params.append('emd_captcha_3', "1779857718.257");

  const { data } = await client.post(endpoint, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  if (!data.request) {
    throw new Error('Verifikasi captcha gagal: ' + JSON.stringify(data));
  }

  return {
    reqKey: data.req_key,
    keyTime: data.key_time
  };
}

async function uploadImage(base64Image, csrfToken, reqKey, imageName = 'image.jpeg') {
  const form = new FormData();
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  form.append('base64', dataUri);
  form.append('count', 'ITVwkY');
  form.append('_token', csrfToken);
  form.append('req_key', reqKey);

  const now = new Date();
  const format = (d) => d.toISOString().replace('T', ' ').substring(0, 19);
  form.append('user_got_captcha_result_at', format(now));
  form.append('user_clicked_on_button_at', format(new Date(now.getTime() - 1000)));
  form.append('req_key_generate_time', format(new Date(now.getTime() - 8 * 3600000)));
  form.append('get_dimension_before', format(now));
  form.append('get_dimension_after', format(now));
  form.append('converter_function_took_time', format(now));
  form.append('e_track_key', `${Date.now()}8bowl38inu9`);
  form.append('tool_id', '1');
  form.append('parent_id', '1');
  form.append('tool_key', 'image_to_text');
  form.append('dimension', '554 x 554');
  form.append('size', '0.02 MB');
  form.append('name', imageName);
  form.append('ocr_mode', 'simple_ocr');
  form.append('fetchUrl', 'false');

  const { data } = await client.post(
    'https://www.imagetotext.info/free-image-to-text',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'X-CSRF-Token': csrfToken
      }
    }
  );

  return data;
}

async function imageToText(base64Image) {
  const { csrfToken } = await getPageData();
  const { reqKey } = await verifyCaptcha(csrfToken);
  const result = await uploadImage(base64Image, csrfToken, reqKey);
  return result;
}

module.exports = { imageToText };