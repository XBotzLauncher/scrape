const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://ssstik.io";
const HEADERS_BASE = {
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
};

async function getToken() {
  const res = await axios.get(`${BASE_URL}/id`, {
    headers: {
      ...HEADERS_BASE,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  const $ = cheerio.load(res.data);
  let tt = null;

  $("script").each((_, el) => {
    const src = $(el).html() || "";
    const match = src.match(/tt\s*=\s*["']([^"']+)["']/);
    if (match) tt = match[1];
  });

  if (!tt) tt = $('input[name="tt"]').val();

  const cookies = res.headers["set-cookie"]
    ?.map((c) => c.split(";")[0])
    .join("; ") || "";

  return { tt, cookies };
}

function parseResult(html) {
  const $ = cheerio.load(html);
  const result = { author: null, title: null, stats: {}, links: {} };

  result.author = $("h2").first().text().trim();
  result.title = $("p.maintext").first().text().trim();

  const statKeys = ["likes", "comments", "shares"];
  $(".trending-actions .d-flex").each((i, el) => {
    const val = $(el).find("div").last().text().trim();
    if (statKeys[i]) result.stats[statKeys[i]] = val;
  });

  const sdLink = $("a.download_link.without_watermark:not(.without_watermark_hd)").attr("href");
  if (sdLink) result.links.no_watermark = sdLink;

  const mp3Link = $("a.download_link.music").attr("href");
  if (mp3Link) result.links.mp3 = mp3Link;

  return result;
}

async function downloadTikTok(tiktokUrl) {
  const { tt, cookies } = await getToken();
  if (!tt) throw new Error("Gagal ambil token tt");

  const params = new URLSearchParams({ id: tiktokUrl, locale: "id", tt });

  const res = await axios.post(`${BASE_URL}/abc?url=dl`, params.toString(), {
    headers: {
      ...HEADERS_BASE,
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded",
      "hx-current-url": `${BASE_URL}/id`,
      "hx-request": "true",
      "hx-target": "target",
      "hx-trigger": "_gcaptcha_pt",
      origin: BASE_URL,
      referer: `${BASE_URL}/id`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      cookie: cookies,
    },
  });

  return parseResult(res.data);
}

module.exports = { downloadTikTok };