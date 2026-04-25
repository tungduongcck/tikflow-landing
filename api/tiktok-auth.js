export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { code, grant_type, refresh_token } = req.body;

        const params = new URLSearchParams();
        params.append('client_key', process.env.TIKTOK_CLIENT_KEY);
        params.append('client_secret', process.env.TIKTOK_CLIENT_SECRET);
        params.append('grant_type', grant_type || 'authorization_code');

        if (grant_type === 'refresh_token') {
            params.append('refresh_token', refresh_token);
        } else {
            params.append('code', code);
            params.append('redirect_uri', process.env.REDIRECT_URI);
        }

        const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: params.toString()
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
            console.error('TikTok API Error:', tokenData);
            return res.status(tokenResponse.status).json(tokenData);
        }

        return res.status(200).json(tokenData);
    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
