const axios = require('axios').default;
const { CookieJar, Cookie } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cheerio = require('cheerio');

const BASE = 'https://spotmate.online';
const MAIN_PAGE = `${BASE}/en1`;
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

/**
 * Memasukkan cookie string ke dalam CookieJar
 * @param {CookieJar} jar
 * @param {string} cookieString - format seperti "nama1=nilai1; nama2=nilai2; ..."
 * @param {string} url - URL untuk menetapkan domain/path default
 */
function loadCookiesFromString(jar, cookieString, url) {
  const cookies = cookieString.split(';');
  for (const raw of cookies) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const parsed = Cookie.parse(trimmed);
    if (parsed) {
      jar.setCookieSync(parsed, url);
    }
  }
}

/**
 * Scrape Spotify track info & download link dari spotmate.online
 * @param {string} spotifyUrl - URL Spotify track (misal: https://open.spotify.com/track/...)
 * @param {string} cookieString - string cookie lengkap dari browser/curl
 * @returns {Promise<{ trackData: object, downloadLink: string|null, rawConvertResponse: object }>}
 */
async function scrapeSpotify(spotifyUrl, cookieString = "cf_clearance=b9moCc7w2dpSWBt5w8cBTVyrhreVhWbDYBZmFg0b1Yk-1780192440-1.2.1.1-mmDueKNUh8N7MNAITftrscHW1T.BVTNFo.39cNzXjwB7jaQbOZucfdWlgJIhi5BYH_cbAkP.1O7OrIO8qT7IPwggTpj.mEJnzHVHNajHkd5vYXr3xJYqMf2Cb3xiJo_d4aGhkzUBVubV9VZiTArBa5XKj4XR.FbErMRW3I.zFW_.jg0_IJd0HkdcAUTWf444DJJDCCgjM1HhOD2WSc5DkaKYPUnypv7VBv.alXx3OQ7y48FmckGRNbY5cfCFvNsLPypyhjzNS8RKGwY95h3hCkKsBgeMYoS0YfJSDD1gc5xG60xx8L3mZAQscpr32r0otjzJTF0FqS.k_BnYKK1rlQeeJuA9GCjmSIysZFCUyD_vdkn11pXpT8b6ekKf4WOS6EIrHDuxce1QuHx8Yi4kg.q3q8IUiwpL1ZQ2Jq1gXaA;") {
  const jar = new CookieJar();
  if (cookieString) {
    loadCookiesFromString(jar, cookieString, BASE);
  }
  const client = wrapper(axios.create({ jar }));

  const { data: html } = await client.get(MAIN_PAGE, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  const $ = cheerio.load(html);
  const csrfToken = $('meta[name="csrf-token"]').attr('content');
  if (!csrfToken) {
    throw new Error('CSRF token tidak ditemukan pada halaman');
  }

  const headers = {
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': csrfToken,
    Origin: BASE,
    Referer: MAIN_PAGE,
  };

  const { data: trackData } = await client.post(
    `${BASE}/getTrackData`,
    { spotify_url: spotifyUrl },
    { headers }
  );

  const { data: convertData } = await client.post(
    `${BASE}/convert`,
    { urls: spotifyUrl },
    { headers }
  );

  return {
    trackData,
    downloadLink: convertData.url || null,
    rawConvertResponse: convertData,
  };
}

module.exports = { scrapeSpotify };