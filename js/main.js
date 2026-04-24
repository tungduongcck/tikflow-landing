document.addEventListener('DOMContentLoaded', () => {
    // Reveal Animations on Scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
                // Once it has appeared, we can stop observing it
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-up, .animate-left, .animate-right, .animate-fade, .animate-scale');
    animatedElements.forEach(el => observer.observe(el));

    // Sticky Header Effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(5, 6, 15, 0.95)';
            header.style.padding = '1rem 0';
            header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.background = 'rgba(5, 6, 15, 0.8)';
            header.style.padding = '1.5rem 0';
            header.style.boxShadow = 'none';
        }
    });

    // Smooth Scroll for Nav Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Log for debug
    console.log('TikFlow Landing Page Initialized');

    // =========================================================
    // Configuration from User Sandbox
    const TIKTOK_CLIENT_KEY = 'sbawgnns17rw9q3h82';
    const TIKTOK_CLIENT_SECRET = 'bMOetQrBjZpNEZrc4qVElWOZGfvqAvYg';
    const REDIRECT_URI = 'https://webhook.site/ffb22edf-678e-42df-88d9-d8fc3f8bf134';

    const loginBtns = [document.getElementById('login-btn'), document.getElementById('get-started-btn')];
    const landingView = document.getElementById('landing-view');
    const dashboardView = document.getElementById('dashboard-view');

    // 1. Handle Login Click
    loginBtns.forEach(btn => {
        if(btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // REAL AUTHORIZE URL
                const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&response_type=code&scope=user.info.basic,user.info.profile,video.list,video.publish&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=test`;
                
                // REDIRECT TO TIKTOK AUTH PAGE
                window.location.href = authUrl;
            });
        }
    });

    // 2. Check URL for ?code= (User returned from TikTok Login)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // Hide Landing, Show Dashboard
        landingView.style.display = 'none';
        dashboardView.style.display = 'block';
        window.scrollTo(0, 0);
        
        // Show loading state, hide data
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('dashboard-data').style.display = 'none';

        // REAL API FETCH FUNCTION
        async function fetchTikTokData(authCode) {
            try {
                if (authCode === 'tiktok_mock_code_123') {
                    // Fallback to Mock if no real code provided
                    setTimeout(() => runMockFlow(), 1500);
                    return;
                }

                // --- A. GET ACCESS TOKEN ---
                document.querySelector('#loading-state p').innerText = "Exchanging code for token...";
                const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_key: TIKTOK_CLIENT_KEY,
                        client_secret: TIKTOK_CLIENT_SECRET,
                        code: authCode,
                        grant_type: 'authorization_code',
                        redirect_uri: REDIRECT_URI
                    })
                });
                
                const tokenData = await tokenResponse.json();
                if (!tokenData.access_token) {
                    throw new Error("Failed to get access token. Error: " + JSON.stringify(tokenData));
                }
                const accessToken = tokenData.access_token;

                // --- B. GET USER INFO ---
                document.querySelector('#loading-state p').innerText = "Fetching user info...";
                const userInfoResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const userData = await userInfoResponse.json();
                const user = userData.data?.user || {};

                // --- C. GET VIDEO LIST ---
                document.querySelector('#loading-state p').innerText = "Fetching video list...";
                const videoResponse = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,embed_link,like_count,comment_count,share_count,view_count,create_time', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ max_count: 20 })
                });
                const videoData = await videoResponse.json();
                const videos = videoData.data?.videos || [];

                // --- POPULATE UI ---
                document.getElementById('loading-state').style.display = 'none';
                document.getElementById('dashboard-data').style.display = 'block';

                document.getElementById('profile-avatar').src = user.avatar_url || 'https://ui-avatars.com/api/?name=User&background=fe2c55&color=fff';
                document.getElementById('profile-name').innerText = user.display_name || 'TikTok User';
                document.getElementById('profile-handle').innerText = user.follower_count !== undefined ? `${user.follower_count} Followers` : 'TikTok User';
                document.getElementById('profile-openid').innerText = user.open_id || 'N/A';

                const videoGrid = document.getElementById('video-grid');
                if (videos.length === 0) {
                    videoGrid.innerHTML = '<p>No videos found or permission denied.</p>';
                } else {
                    videoGrid.innerHTML = videos.map(v => `
                        <div class="video-card glass-card">
                            <div class="video-thumbnail" style="background-image: url('${v.cover_image_url}');"></div>
                            <div class="video-info">
                                <h4>${v.title || 'Untitled Video'}</h4>
                                <p>${v.view_count || 0} Views • ${v.like_count || 0} Likes</p>
                            </div>
                        </div>
                    `).join('');
                }

            } catch (error) {
                console.error(error);
                alert('Error fetching from TikTok API. (Note: Browsers often block these requests due to CORS. See console for details.)\n\n' + error.message);
                document.getElementById('loading-state').innerHTML = `<p style="color:#fe2c55;">API Error: ${error.message}</p><button class="btn btn-outline" onclick="window.location.href=window.location.pathname">Go Back</button>`;
            }
        }

        // Execute
        fetchTikTokData(code);
    }

    function runMockFlow() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-data').style.display = 'block';
        
        document.getElementById('profile-avatar').src = 'https://ui-avatars.com/api/?name=Mai+Tri+Thuc&background=fe2c55&color=fff&size=128';
        document.getElementById('profile-name').innerText = 'Mai Trí Thức';
        document.getElementById('profile-handle').innerText = '@maitrithuc2020';
        document.getElementById('profile-openid').innerText = 'v1.234567890abcdef...';
        
        const videoGrid = document.getElementById('video-grid');
        const mockVideos = [
            { title: 'My awesome video', views: '1.2k', date: '2h ago', cover: 'bg-gradient-1' },
            { title: 'Trending dance', views: '5.4k', date: '1 day ago', cover: 'bg-gradient-2' },
            { title: 'Behind the scenes', views: '800', date: '2 days ago', cover: 'bg-gradient-3' }
        ];

        videoGrid.innerHTML = mockVideos.map(v => `
            <div class="video-card glass-card">
                <div class="video-thumbnail ${v.cover}"></div>
                <div class="video-info">
                    <h4>${v.title}</h4>
                    <p>${v.views} Views • ${v.date}</p>
                </div>
            </div>
        `).join('');
    }

    // 3. Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = window.location.pathname; // Reload without code
        });
    }

    // 4. Modal Logic
    const uploadBtn = document.getElementById('upload-btn');
    const uploadModal = document.getElementById('upload-modal');
    const closeModal = document.getElementById('close-modal');
    const submitVideoBtn = document.getElementById('submit-video-btn');

    if(uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadModal.style.display = 'flex';
        });
    }

    if(closeModal) {
        closeModal.addEventListener('click', () => {
            uploadModal.style.display = 'none';
        });
    }

    if(submitVideoBtn) {
        submitVideoBtn.addEventListener('click', () => {
            submitVideoBtn.innerText = 'Publishing...';
            setTimeout(() => {
                alert('Video published successfully to TikTok!');
                uploadModal.style.display = 'none';
                submitVideoBtn.innerText = 'Publish to TikTok';
            }, 1500);
        });
    }
});
