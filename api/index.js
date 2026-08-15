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

    // Engine 1: Cobalt POST API
    try {
        const cobaltRes = await axios.post('https://api.cobalt.tools/api/json', {
            url: videoUrl,
            vQuality: '1080'
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 9000
        });

        if (cobaltRes.data && cobaltRes.data.url) {
            return res.json({ status: 'success', url: cobaltRes.data.url });
        } else if (cobaltRes.data && cobaltRes.data.picker && cobaltRes.data.picker.length > 0) {
            return res.json({ status: 'success', url: cobaltRes.data.picker[0].url });
        }
    } catch (err) {
        console.log("Cobalt Engine failed, trying fallbacks...");
    }

    // Engine 2: Dedicated Instagram Proxy
    if (videoUrl.includes('instagram.com')) {
        try {
            const igRes = await axios.get(`https://api.instavideosave.com/allinone`, {
                headers: {
                    'url': videoUrl,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                timeout: 9000
            });

            if (igRes.data && igRes.data.video && igRes.data.video.length > 0) {
                return res.json({ status: 'success', url: igRes.data.video[0].video });
            }
        } catch (err) {
            console.log("Instagram Scraper failed...");
        }
    }

    // Engine 3: TikWM Proxy
    if (videoUrl.includes('tiktok.com')) {
        try {
            const tikRes = await axios.get(`https://v3.tikwm.com/api/`, {
                params: { url: videoUrl },
                timeout: 9000
            });

            if (tikRes.data && tikRes.data.data && tikRes.data.data.play) {
                return res.json({ status: 'success', url: tikRes.data.data.play });
            }
        } catch (err) {
            console.log("TikWM failed...");
        }
    }

    return res.status(500).json({ error: 'Failed to extract video stream across all engines' });
});

// Local & Vercel Listener
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
