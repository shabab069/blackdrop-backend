const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

function cleanUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return `${parsed.origin}${parsed.pathname}`;
    } catch (e) {
        return rawUrl;
    }
}

app.get('/api/download', async (req, res) => {
    let videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    videoUrl = cleanUrl(videoUrl);

    // 1. TIKTOK ENGINE (TikWM API)
    if (videoUrl.includes('tiktok.com')) {
        try {
            const tikRes = await axios.post('https://www.tikwm.com/api/', 
                new URLSearchParams({ url: videoUrl, count: 12, cursor: 0, web: 1, hd: 1 }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 8000
                }
            );

            if (tikRes.data && tikRes.data.data && tikRes.data.data.play) {
                return res.json({ status: 'success', platform: 'tiktok', url: tikRes.data.data.play });
            }
        } catch (e) {
            console.log("TikTok Direct Engine failed");
        }
    }

    // 2. INSTAGRAM ENGINE (DDInstagram / PubProxy)
    if (videoUrl.includes('instagram.com')) {
        try {
            // Converts instagram.com/reel/xyz to ddinstagram.com/reel/xyz/embed/video
            const ddUrl = videoUrl.replace('instagram.com', 'ddinstagram.com');
            const igRes = await axios.get(ddUrl, {
                headers: {
                    'User-Agent': 'TelegramBot (like TwitterBot)'
                },
                maxRedirects: 5,
                timeout: 8000
            });

            // Extract video stream from meta tags
            const match = igRes.data.match(/<meta property="og:video" content="([^"]+)"/);
            if (match && match[1]) {
                const directUrl = match[1].replace(/&amp;/g, '&');
                return res.json({ status: 'success', platform: 'instagram', url: directUrl });
            }
        } catch (e) {
            console.log("Instagram Direct Engine failed");
        }
    }

    // 3. YOUTUBE ENGINE (Piped API Network)
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const pipedInstances = [
            'https://pipedapi.kavin.rocks',
            'https://api.piped.privacydev.net',
            'https://pipedapi.mha.fi'
        ];

        for (const instance of pipedInstances) {
            try {
                let videoId = '';
                if (videoUrl.includes('youtu.be/')) {
                    videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                } else if (videoUrl.includes('watch?v=')) {
                    videoId = videoUrl.split('v=')[1].split('&')[0];
                } else if (videoUrl.includes('shorts/')) {
                    videoId = videoUrl.split('shorts/')[1].split('?')[0];
                }

                if (videoId) {
                    const pipedRes = await axios.get(`${instance}/streams/${videoId}`, { timeout: 6000 });
                    if (pipedRes.data && pipedRes.data.videoStreams && pipedRes.data.videoStreams.length > 0) {
                        // Get highest resolution stream with audio
                        const stream = pipedRes.data.videoStreams.find(s => s.mimeType.includes('mp4') && s.videoOnly === false) || pipedRes.data.videoStreams[0];
                        if (stream && stream.url) {
                            return res.json({ status: 'success', platform: 'youtube', url: stream.url });
                        }
                    }
                }
            } catch (e) {
                console.log(`Piped instance ${instance} failed`);
            }
        }
    }

    // 4. GLOBAL COBALT V10 API ENGINE
    const cobaltv10Instances = [
        'https://cobalt.api.scout9.com',
        'https://api.cobalt.tools'
    ];

    for (const instance of cobaltv10Instances) {
        try {
            const cobaltRes = await axios.post(`${instance}/`, {
                url: videoUrl,
                videoQuality: '1080'
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 8000
            });

            if (cobaltRes.data && cobaltRes.data.url) {
                return res.json({ status: 'success', platform: 'cobalt', url: cobaltRes.data.url });
            }
        } catch (err) {
            console.log(`Cobalt v10 instance (${instance}) failed`);
        }
    }

    return res.status(500).json({ error: 'All extraction methods exhausted for this URL. Please verify if video is public.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
