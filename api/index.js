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

    // Engine 1: Cobalt
    try {
        const response = await axios.get(`https://api.cobalt.tools/api/json`, {
            params: { url: videoUrl },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            timeout: 8000
        });

        if (response.data && response.data.url) {
            return res.json({ status: 'success', url: response.data.url });
        } else if (response.data && response.data.picker && response.data.picker.length > 0) {
            return res.json({ status: 'success', url: response.data.picker[0].url });
        }
    } catch (err) {
        console.log("Engine 1 failed");
    }

    // Engine 2: TikWM / IG Fallback
    try {
        const fallbackRes = await axios.get(`https://v3.tikwm.com/api/`, {
            params: { url: videoUrl },
            timeout: 8000
        });

        if (fallbackRes.data && fallbackRes.data.data && fallbackRes.data.data.play) {
            return res.json({ status: 'success', url: fallbackRes.data.data.play });
        }
    } catch (err) {
        console.log("Engine 2 failed");
    }

    return res.status(500).json({ error: 'Failed to extract video' });
});

module.exports = app;
