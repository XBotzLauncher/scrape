const axios = require('axios');

async function tiktokDownload(url) {
    const response = await axios.get('https://www.tiktokdl.web.id/api/tiktok', {
        params: { url: url },
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const data = response.data;
    
    const result = {
        status: data.status,
        id: data.id,
        description: data.description,
        author: data.author,
        duration: data.duration,
        stats: {
            likes: data.stats.like,
            views: data.stats.views,
            shares: data.stats.share,
            comments: data.stats.comment
        },
        music: {
            title: data.music.title,
            author: data.music.author,
            duration: data.music.duration
        },
        video_url: data.videoId,
        audio_url: data.audioId
    };
    
    return result;
}

module.exports = tiktokDownload;