export const config = {
    api: {
        bodyParser: false, // Disable body parsing to handle raw binary
    },
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Range, x-upload-url');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const uploadUrl = req.headers['x-upload-url'];
        if (!uploadUrl) {
            return res.status(400).json({ error: 'Missing x-upload-url header' });
        }

        // Read the raw body
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': req.headers['content-type'] || 'video/mp4',
                'Content-Range': req.headers['content-range'] || '',
            },
            body: body,
        });

        const responseText = await response.text();
        return res.status(response.status).send(responseText);

    } catch (error) {
        console.error('Upload proxy error:', error);
        return res.status(500).json({ error: 'Upload proxy error: ' + error.message });
    }
}
