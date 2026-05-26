const axios = require("axios");
const cheerio = require("cheerio");

class LayarKaca21 {
  constructor() {
    this.baseUrl = "https://gudangvape.com/";   // untuk search
  }

  // ========== Method Search (tetap seperti punyamu) ==========
  async search(query, page = 1) {
    try {
      const { data } = await axios.get(`${this.baseUrl}search.php`, {
        params: { s: query, page },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://tv10.lk21official.cc/",
          "Origin": "https://tv10.lk21official.cc",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      return data;
    } catch (err) {
      console.log(err.response?.status);
      return { status: false, message: err.message };
    }
  }

  // ========== Method Baru: Ambil Detail Film dari Halaman ==========
  async getDetail(url) {
    try {
      // 1. Ambil HTML halaman
      const { data } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      const $ = cheerio.load(data);

      // 2. Judul
      const rawTitle = $("h1").text().trim();                // "Nonton Green Book (2018) Sub Indo di Lk21"
      const title = rawTitle.replace(/^Nonton\s+/i, "").replace(/\s+Sub Indo di Lk21$/i, "").trim();

      // 3. Rating
      const rating = $(".info-tag strong").text().trim();     // "8.2"

      // 4. Metadata (durasi, kualitas, rating umur)
      const infoSpans = $(".info-tag span").toArray();
      let duration = "", quality = "", ageRating = "", source = "";
      infoSpans.forEach((el) => {
        const txt = $(el).text().trim();
        if (/^\d+h\s*\d+m$/.test(txt)) duration = txt;
        else if (/BluRay|WEB-DL|HDTV|CAM/i.test(txt)) source = txt;
        else if (/^\d+p$/.test(txt)) quality = txt;
        else if (/^\d+\+$/.test(txt)) ageRating = txt;
      });
      // Bisa juga ambil source & quality langsung dari teks yang ada setelah broken-line (ada BluRay, 1080p)

      // 5. Genre
      const genres = [];
      $(".tag-list a").each((_, el) => genres.push($(el).text().trim()));

      // 6. Negara (dari tag pertama biasanya)
      const country = $(".tag-list .tag").first().text().trim();

      // 7. Download URL (link tombol DOWNLOAD)
      const downloadLink = $(".movie-action a.btn").first().attr("href") || "";

      // 8. Sinopsis lengkap (ambil dari data-full, fallback ke teks)
      let synopsis = $(".synopsis").attr("data-full") || $(".synopsis").text().trim();
      synopsis = synopsis.replace(/\s+/g, " ").trim();

      // 9. Detail tambahan (dari .detail)
      const subtitle = $(".detail p:contains('Subtitle') a").text().trim();
      const director = $(".detail p:contains('Sutradara') a").text().trim();
      const stars = [];
      $(".detail p:contains('Bintang Film') a").each((_, el) => stars.push($(el).text().trim()));
      const negara = $(".detail p:contains('Negara') a").text().trim();
      const votes = $(".detail p:contains('Votes')").text().replace("Votes:", "").trim();
      const release = $(".detail p:contains('Release')").text().replace("Release:", "").trim();
      const updated = $(".detail p:contains('Updated')").text().replace("Updated:", "").trim();
      const poster = $(".detail img").attr("src") || $(".poster img").first().attr("src");

      // 10. Daftar server streaming (iframe sources)
      const servers = [];
      $("#player-list li a").each((_, el) => {
        servers.push({
          name: $(el).attr("data-server"),
          url: $(el).attr("data-url"),
        });
      });

      // 11. Trailer (jika ada)
      const trailerLink = $(".yt-lightbox").attr("href") || "";

      return {
        success: true,
        data: {
          title,
          altTitle: rawTitle,
          rating,
          duration,
          source,
          quality,
          ageRating,
          genres,
          country,
          synopsis,
          downloadLink,
          subtitle,
          director,
          stars,
          negara,
          votes,
          release,
          updated,
          poster,
          trailerLink,
          servers,
          pageUrl: url,
        },
      };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  }
}

module.exports = LayarKaca21;