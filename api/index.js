const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        // Public API endpoint parsing Instagram, TikTok, YouTube, FB videos
        const response = await axios.get(`https://api.cobalt.tools/api/json`, {
            params: { url: videoUrl },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.url) {
            return res.json({ status: 'success', url: response.data.url });
        } else if (response.data && response.data.picker && response.data.picker.length > 0) {
            return res.json({ status: 'success', url: response.data.picker[0].url });
        } else {
            return res.status(500).json({ error: 'Failed to extract video stream' });
        }
    } catch (error) {
        console.error("Extraction error:", error.message);
        return res.status(500).json({ error: 'Download engine error or link not supported' });
    }
});

module.exports = app;
