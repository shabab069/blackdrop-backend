const express = require('express');
const { exec } = require('child_process');
const app = express();

app.use(express.json());

app.get('/api/download', (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Execute yt-dlp to extract direct video stream URL
    const command = `npx yt-dlp-exec "${videoUrl}" -g -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"`;

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Exec Error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to process media URL' });
        }

        const urls = stdout.trim().split('\n');
        if (urls.length > 0 && urls[0].startsWith('http')) {
            return res.json({ status: 'success', url: urls[0] });
        } else {
            return res.status(500).json({ error: 'No direct stream found' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`BlackDrop free backend running on port ${PORT}`);
});
