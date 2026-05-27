const GeminiClient = require('./lib/gemini');

const client = new GeminiClient({
  cookie: 'AEC=AaJma5tU59XnsPO7fpz7loYL9n5VPZf_tvAd1U8RQlQ3VTIIH8_K1xW5dKw; NID=531=LH2jEg2k6t2M4247aKu-uk4uZBM33dGsXFkfktQc_NcujIqVH16VX2nMzdKOhPSKos_OCDGII5fnISHQSX6wiV9e4sSV5Mz2jHcG3XXHOFvLRkcKRiSCQnQuNGMJW8PG3mFlwD8mhsvgrJbgPpQXlgTSZB6_Twj8pGnhq10NIg4E8Hugg2aB-h_cNNxt4vRo4uxRJLgnc0Y3hvXyWmVtQsEcBey-wodnf9mBbuSwmRIYw0weaGu0QOR-5svd-fE; _gcl_au=1.1.1545704959.1779844215; _ga=GA1.1.1305874318.1779844224; COMPASS=gemini-pd=CjwACWuJV93jFYb_b6k1ZbZc5AVi75OXfwVJx6huPFdJgLZgT-iphNSBtyIyTho-2Gurv4U86El7hPmdVFUQ9ave0AYaUQAJa4lXS1lXsJ53rbFNzerBbY3m9wPLAZfg5STWNQUvPrG2iDg5AGLGGmEoQcKmbFvzqhuL3mL9ILxa3tSsQ84tC88epYaeFekQZPN3U6HjKSABMAE:gemini-hl=CkkACWuJV4Jq7gXnYGXm-CCWRGf1MNczIJ0yMsen8R98zb0fdd_v1HDcw_-Y0Gxw7WZu_GGVl89NUAGecp6EG6tM_DjudIlkdiK-EIes3tAGGl4ACWuJVzeEeLF6G6m3f0lanBa0lBF8t6Hbb8779UpCmFGUspig9gXrezxPAgsgoAoGqEb135PkCYNr6zC4JX97O_k42FZ9iZbC6748hlAiBQq0bUKe84BGtG96g_raIAEwAQ; _ga_WC57KJ50ZZ=GS2.1.s1779844223$o1$g1$t1779844717$j60$l0$h0; _ga_BF8Q35BMLM=GS2.1.s1779844224$o1$g1$t1779844717$j60$l0$h0',  // cookie lengkap dari browser
  // sid: '1488448731814144751',     // opsional, bisa dari cookie lama
});

(async () => {
  try {
    const answer = await client.sendMessage('Halo, apa kabar?');
    console.log('Jawaban:', answer);
  } catch (err) {
    console.error('Gagal:', err.message);
  }
})();
