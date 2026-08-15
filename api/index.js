const express = require('express');
const instagramGetUrl = require('instagram-url-direct');
const app = express();

app.use(express.json());

app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        let links = await instagramGetUrl(videoUrl);
        if (links && links.url_list && links.url_list.length > 0) {
            return res.json({ status: 'success', url: links.url_list[0] });
        } else {
            return res.status(500).json({ error: 'Failed to extract video' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = app;
