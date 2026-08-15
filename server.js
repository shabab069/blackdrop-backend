const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Clean tracking parameters from social media links
function cleanUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return `${parsed.origin}${parsed.pathname}`;
    } catch (e) {
        return rawUrl;
    }
}

// Global Headers to mimic real browser requests
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

app.get('/api/download', async (req, res) => {
    let videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    videoUrl = cleanUrl(videoUrl);

    // ==========================================
    // 1. INSTAGRAM DEDICATED ENGINES
    // ==========================================
    if (videoUrl.includes('instagram.com')) {
        // Method A: Direct Embed HTML Scraper
        try {
            const embedUrl = videoUrl.endsWith('/') ? `${videoUrl}embed/captioned/` : `${videoUrl}/embed/captioned/`;
            const response = await axios.get(embedUrl, { headers: BROWSER_HEADERS, timeout: 6000 });
            const match = response.data.match(/video_url\\":\\"([^\\"]+)\\"/);
            if (match && match[1]) {
                const directUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
                return res.json({ status: 'success', platform: 'instagram', url: directUrl });
            }
        } catch (e) {
            console.log("Instagram Method A failed");
        }

        // Method B: SnapInsta / PubAPI Fallback
        try {
            const pubRes = await axios.post('https://v3.viddl.com/api/video/info', { url: videoUrl }, { timeout: 6000 });
            if (pubRes.data && pubRes.data.url) {
                return res.json({ status: 'success', platform: 'instagram', url: pubRes.data.url });
            }
        } catch (e) {
            console.log("Instagram Method B failed");
        }
    }

    // ==========================================
    // 2. TIKTOK DEDICATED ENGINES
    // ==========================================
    if (videoUrl.includes('tiktok.com')) {
        // Method A: TikWM Engine
        try {
            const tikRes = await axios.get(`https://v3.tikwm.com/api/`, { params: { url: videoUrl }, timeout: 6000 });
            if (tikRes.data && tikRes.data.data && tikRes.data.data.play) {
                return res.json({ status: 'success', platform: 'tiktok', url: tikRes.data.data.play });
            }
        } catch (e) {
            console.log("TikTok Method A failed");
        }
    }

    // ==========================================
    // 3. YOUTUBE & FACEBOOK ENGINES
    // ==========================================
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch')) {
        // Method A: Invidious Open Public Instances (For YouTube)
        if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
            const invidiousInstances = [
                'https://inv.nadeko.net',
                'https://invidious.nerdvpn.de',
                'https://invidious.drgns.space'
            ];
            for (const instance of invidiousInstances) {
                try {
                    const videoId = videoUrl.includes('v=') ? videoUrl.split('v=')[1].split('&')[0] : videoUrl.split('/').pop();
                    const invRes = await axios.get(`${instance}/api/v1/videos/${videoId}`, { timeout: 5000 });
                    if (invRes.data && invRes.data.formatStreams) {
                        const highestRes = invRes.data.formatStreams.pop();
                        if (highestRes && highestRes.url) {
                            return res.json({ status: 'success', platform: 'youtube', url: highestRes.url });
                        }
                    }
                } catch (e) {
                    console.log(`Invidious instance (${instance}) failed`);
                }
            }
        }
    }

    // ==========================================
    // 4. MULTI-PLATFORM COBALT ENGINE (GLOBAL FALLBACK)
    // ==========================================
    const cobaltInstances = [
        'https://api.cobalt.tools/api/json',
        'https://cobalt-api.kwippy.com/api/json',
        'https://cobalt.hyper.lol/api/json',
        'https://co.wuk.sh/api/json'
    ];

    for (const instance of cobaltInstances) {
        try {
            const cobaltRes = await axios.post(instance, {
                url: videoUrl,
                vQuality: '1080'
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': BROWSER_HEADERS['User-Agent']
                },
                timeout: 7000
            });

            if (cobaltRes.data && cobaltRes.data.url) {
                return res.json({ status: 'success', platform: 'cobalt-global', url: cobaltRes.data.url });
            } else if (cobaltRes.data && cobaltRes.data.picker && cobaltRes.data.picker.length > 0) {
                return res.json({ status: 'success', platform: 'cobalt-global', url: cobaltRes.data.picker[0].url });
            }
        } catch (err) {
            console.log(`Cobalt instance (${instance}) failed`);
        }
    }

    return res.status(500).json({ error: 'All extraction methods exhausted for this URL. Please verify if video is public.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
