const axios = require("axios");

const BASE_HEADERS = {
  'accept': '*/*',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'referer': 'https://gane.pk/',
  'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'cookie': '_ga=GA1.1.406358529.1779841732; _ga_2M77RNVSGW=GS2.1.s1779841731$o1$g1$t1779841799$j60$l0$h0'
};

class Gane {
  constructor() {
    this.base = 'https://gane.pk/api';
  }

  async search(query, page = 1) {
    try {
      const res = await axios.get(`${this.base}/search`, {
        params: { q: query, page },
        headers: BASE_HEADERS
      });
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  async detail(content_id, content_type = 'track') {
    try {
      const res = await axios.get(`${this.base}/details`, {
        params: { content_id, content_type },
        headers: BASE_HEADERS
      });
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
}

module.exports = Gane;