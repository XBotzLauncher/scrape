const { randomUUID } = require('crypto');

class GeminiClient {
  /**
   * @param {object} config
   * @param {string} config.cookie - Cookie header lengkap dari browser
   * @param {string} [config.sid]  - Session ID (19 digit), jika tidak diisi akan dibuat acak
   * @param {string} [config.bl]   - Build label, default diambil dari curl terbaru
   * @param {string} [config.hl]   - Bahasa (default 'id')
   */
  constructor({ cookie, sid, bl = 'boq_assistant-bard-web-server_20260525.05_p0', hl = 'id' }) {
    if (!cookie) throw new Error('cookie wajib diisi');
    this.cookie = cookie;
    this.sid = sid || this._generateSid();
    this.bl = bl;
    this.hl = hl;
    this.baseUrl = 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate';
  }

  /** Generate random 19-digit session ID */
  _generateSid() {
    return Math.floor(Math.random() * 9e18 + 1e18).toString();
  }

  /** Generate random request ID */
  _randomReqId() {
    return Math.floor(Math.random() * 10000000).toString();
  }

  /**
   * Buat body `f.req` sesuai struktur yang digunakan Gemini.
   * Prompt diletakkan di elemen pertama inner array.
   */
  _buildPromptData(prompt) {
    const convId = 'c_' + randomUUID().replace(/-/g, '').slice(0, 16);
    const respId = 'r_' + randomUUID().replace(/-/g, '').slice(0, 16);
    const candId = 'rc_' + randomUUID().replace(/-/g, '').slice(0, 16);
    const uuid = randomUUID();

    // Struktur inner array hasil reverse engineering
    const innerArray = [
      [prompt, 0, null, null, null, null, 0],
      ["id"],
      [convId, respId, candId, null, null, null, null, null, null, null],
      null,
      null,
      null,
      [0],
      1,
      null,
      null,
      1,
      0,
      null,
      null,
      null,
      null,
      null,
      [[1]],
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      1,
      null,
      null,
      [4],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [2],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      0,
      null,
      null,
      null,
      null,
      null,
      uuid,
      null,
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      1,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      1
    ];

    const innerJson = JSON.stringify(innerArray);
    const outerArray = [null, innerJson];
    return JSON.stringify(outerArray);
  }

  /**
   * Kirim prompt ke Gemini dan dapatkan respons lengkap (streaming)
   * @param {string} prompt - Teks pertanyaan
   * @returns {Promise<string>} - Jawaban dari Gemini
   */
  async sendMessage(prompt) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('bl', this.bl);
    url.searchParams.set('f.sid', this.sid);
    url.searchParams.set('hl', this.hl);
    url.searchParams.set('_reqid', this._randomReqId());
    url.searchParams.set('rt', 'c');

    const body = new URLSearchParams();
    body.append('f.req', this._buildPromptData(prompt));

    const headers = {
      'authority': 'gemini.google.com',
      'accept': '*/*',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'cookie': this.cookie,
      'origin': 'https://gemini.google.com',
      'referer': 'https://gemini.google.com/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    };

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API error: ${res.status} ${res.statusText} - ${errText.slice(0, 200)}`);
    }

    const fullText = await this._parseStream(res);
    return fullText;
  }

  /**
   * Parse streaming response Gemini
   * Format: )]}'\n<panjang>\n<JSON>\n...
   */
  async _parseStream(res) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let passedPrefix = false; // sudah lewat )]}'

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // simpan sisa yang belum lengkap

      for (const line of lines) {
        // Cari penanda awal )]}'
        if (!passedPrefix) {
          if (line.startsWith(")]}'")) {
            passedPrefix = true;
            continue;
          }
          // Jika ada )]}' di tengah baris
          if (line.includes(")]}'")) {
            passedPrefix = true;
            continue;
          }
          continue; // abaikan semua sebelum )]}'
        }

        // Abaikan baris angka (panjang data)
        if (/^\d+$/.test(line.trim())) continue;

        // Parse JSON
        let parsedOuter;
        try {
          parsedOuter = JSON.parse(line);
        } catch {
          continue;
        }

        // Struktur: [["wrb.fr",null,"<innerJson>"]]
        if (!Array.isArray(parsedOuter) || !parsedOuter[0]) continue;
        const innerJsonStr = parsedOuter[0][2];
        if (!innerJsonStr) continue;

        let inner;
        try {
          inner = JSON.parse(innerJsonStr);
        } catch {
          continue;
        }

        // Teks respons berada di inner[4][0][1][0]
        if (inner && Array.isArray(inner[4]) && inner[4].length > 0) {
          const rcEntry = inner[4][0];
          if (rcEntry && Array.isArray(rcEntry[1]) && rcEntry[1].length > 0) {
            const text = rcEntry[1][0];
            if (typeof text === 'string') {
              fullText += text;
            }
          }
        }

        // Cek apakah stream selesai (properti "44":true di inner[2])
        if (inner && inner[2] && typeof inner[2] === 'object' && inner[2]['44'] === true) {
          // Selesai, bisa break lebih awal
          // Tapi kita biarkan loop menyelesaikan stream
        }
      }
    }

    return fullText;
  }
}

module.exports = GeminiClient;