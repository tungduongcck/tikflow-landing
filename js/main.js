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
    const REDIRECT_URI = 'https://tikflow-landing.vercel.app/';

    const loginBtns = [document.getElementById('login-btn'), document.getElementById('get-started-btn')];
    const landingView = document.getElementById('landing-view');
    const dashboardView = document.getElementById('dashboard-view');

    // 1. Handle Login Click
    loginBtns.forEach(btn => {
        if(btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // REAL AUTHORIZE URL
                const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&response_type=code&scope=user.info.basic,user.info.profile,video.list,video.publish,video.upload&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=test`;
                
                // REDIRECT TO TIKTOK AUTH PAGE
                window.location.href = authUrl;
            });
        }
    });

    // 2. Check URL for ?code= (User returned from TikTok Login)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // --- HELPER FUNCTIONS ---
    async function fetchUserAndVideos(accessToken) {
        // --- B. GET USER INFO ---
        document.querySelector('#loading-state p').innerText = "Fetching user info...";
        const userInfoResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const userData = await userInfoResponse.json();
        if (!userInfoResponse.ok || (userData.error && userData.error.code !== 'ok')) {
            const errStr = userData.error ? (userData.error.message || userData.error.code) : `HTTP ${userInfoResponse.status}`;
            const error = new Error(errStr);
            error.code = userData.error ? userData.error.code : 'unknown';
            throw error;
        }
        console.log("user", userData);
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
        if (!videoResponse.ok || (videoData.error && videoData.error.code !== 'ok')) {
            const errStr = videoData.error ? (videoData.error.message || videoData.error.code) : `HTTP ${videoResponse.status}`;
            const error = new Error(errStr);
            error.code = videoData.error ? videoData.error.code : 'unknown';
            throw error;
        }
        console.log("videos", videoData);
        const videos = videoData.data?.videos || [];

        return { user, videos };
    }

    function renderDashboardData(user, videos) {
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
    }

    async function fetchTikTokData(authCode) {
        try {
            if (authCode === 'tiktok_mock_code_123') {
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
            localStorage.setItem('tiktok_access_token', tokenData.access_token);
            if (tokenData.refresh_token) {
                localStorage.setItem('tiktok_refresh_token', tokenData.refresh_token);
            }

            // Clear the ?code= parameter from the URL to prevent "Authorization code expired" on F5
            window.history.replaceState({}, document.title, window.location.pathname);

            const { user, videos } = await fetchUserAndVideos(accessToken);
            renderDashboardData(user, videos);

        } catch (error) {
            console.error(error);
            alert('Error fetching from TikTok API. (Note: Browsers often block these requests due to CORS. See console for details.)\n\n' + error.message);
            document.getElementById('loading-state').innerHTML = `<p style="color:#fe2c55;">API Error: ${error.message}</p><button class="btn btn-outline" onclick="window.location.href=window.location.pathname">Go Back</button>`;
        }
    }

    async function handleReloadData() {
        let accessToken = localStorage.getItem('tiktok_access_token');
        const refreshToken = localStorage.getItem('tiktok_refresh_token');

        if (!accessToken && !refreshToken) {
            alert('No saved tokens found. Please login first.');
            return;
        }

        // Show loading
        landingView.style.display = 'none';
        dashboardView.style.display = 'block';
        window.scrollTo(0, 0);

        document.getElementById('dashboard-data').style.display = 'none';
        document.getElementById('loading-state').style.display = 'block';
        document.querySelector('#loading-state p').innerText = "Reloading data...";

        try {
            if (accessToken) {
                try {
                    const { user, videos } = await fetchUserAndVideos(accessToken);
                    renderDashboardData(user, videos);
                    return; // Successfully fetched, exit function
                } catch (e) {
                    console.log("Access token fetch failed, trying refresh...", e);
                    // Proceed to refresh
                }
            }

            if (!refreshToken) {
                throw new Error("Access token expired and no refresh token available.");
            }

            // Refresh token
            document.querySelector('#loading-state p').innerText = "Refreshing token...";
            const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_key: TIKTOK_CLIENT_KEY,
                    client_secret: TIKTOK_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });
            
            const tokenData = await tokenResponse.json();
            if (!tokenData.access_token) {
                throw new Error("Failed to refresh token. Error: " + JSON.stringify(tokenData));
            }
            
            accessToken = tokenData.access_token;
            localStorage.setItem('tiktok_access_token', tokenData.access_token);
            if (tokenData.refresh_token) {
                localStorage.setItem('tiktok_refresh_token', tokenData.refresh_token);
            }

            const { user, videos } = await fetchUserAndVideos(accessToken);
            renderDashboardData(user, videos);

        } catch (error) {
            console.error(error);
            alert('Error reloading data: ' + error.message);
            document.getElementById('loading-state').innerHTML = `<p style="color:#fe2c55;">API Error: ${error.message}</p><button class="btn btn-outline" onclick="window.location.href=window.location.pathname">Go Back</button>`;
        }
    }

    const reloadDataBtn = document.getElementById('reload-data-btn');
    if (reloadDataBtn) {
        reloadDataBtn.addEventListener('click', handleReloadData);
    }

    if (code) {
        // Hide Landing, Show Dashboard
        landingView.style.display = 'none';
        dashboardView.style.display = 'block';
        window.scrollTo(0, 0);
        
        // Show loading state, hide data
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('dashboard-data').style.display = 'none';

        // Execute
        fetchTikTokData(code);
    } else if (localStorage.getItem('tiktok_access_token') || localStorage.getItem('tiktok_refresh_token')) {
        handleReloadData();
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
            localStorage.removeItem('tiktok_access_token');
            localStorage.removeItem('tiktok_refresh_token');
            window.location.href = window.location.pathname; // Reload without code
        });
    }

    // 4. Upload Modal Logic
    const uploadBtn = document.getElementById('upload-btn');
    const uploadModal = document.getElementById('upload-modal');
    const closeModal = document.getElementById('close-modal');
    const submitVideoBtn = document.getElementById('submit-video-btn');
    const uploadArea = document.getElementById('upload-area');
    const videoFileInput = document.getElementById('video-file-input');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const videoFileName = document.getElementById('video-file-name');
    const changeVideoBtn = document.getElementById('change-video-btn');
    const videoCaption = document.getElementById('video-caption');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadStatusText = document.getElementById('upload-status-text');
    const uploadPercent = document.getElementById('upload-percent');
    const uploadProgressBar = document.getElementById('upload-progress-bar');

    let selectedVideoFile = null;

    // Open modal
    if(uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadModal.style.display = 'flex';
        });
    }

    // Close modal
    if(closeModal) {
        closeModal.addEventListener('click', () => {
            resetUploadModal();
            uploadModal.style.display = 'none';
        });
    }

    // Click upload area -> trigger file input
    if(uploadArea) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target.closest('#change-video-btn') || e.target.closest('#video-preview')) return;
            videoFileInput.click();
        });
    }

    // Change button
    if(changeVideoBtn) {
        changeVideoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            videoFileInput.click();
        });
    }

    // File selected via input
    if(videoFileInput) {
        videoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleVideoSelected(file);
        });
    }

    // Drag & Drop
    if(uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
            uploadArea.style.background = 'rgba(254, 44, 85, 0.08)';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('video/')) {
                handleVideoSelected(file);
            } else {
                alert('Please select a video file (MP4, WebM, etc.)');
            }
        });
    }

    function handleVideoSelected(file) {
        selectedVideoFile = file;
        
        // Show preview
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        videoFileName.innerText = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
        
        uploadPlaceholder.style.display = 'none';
        videoPreviewContainer.style.display = 'block';
        submitVideoBtn.disabled = false;
    }

    function resetUploadModal() {
        selectedVideoFile = null;
        videoFileInput.value = '';
        if (videoPreview.src) {
            URL.revokeObjectURL(videoPreview.src);
            videoPreview.src = '';
        }
        uploadPlaceholder.style.display = 'block';
        videoPreviewContainer.style.display = 'none';
        videoCaption.value = '';
        uploadProgress.style.display = 'none';
        uploadProgressBar.style.width = '0%';
        uploadPercent.innerText = '0%';
        submitVideoBtn.disabled = true;
        submitVideoBtn.innerText = 'Publish to TikTok';
    }

    // Publish to TikTok
    if(submitVideoBtn) {
        submitVideoBtn.addEventListener('click', async () => {
            if (!selectedVideoFile) {
                alert('Please select a video file first.');
                return;
            }

            const accessToken = localStorage.getItem('tiktok_access_token');
            if (!accessToken) {
                alert('You must be logged in to upload. Please login with TikTok first.');
                return;
            }

            submitVideoBtn.disabled = true;
            submitVideoBtn.innerText = 'Publishing...';
            uploadProgress.style.display = 'block';

            try {
                // Step 1: Initialize upload via proxy (avoids CORS)
                uploadStatusText.innerText = 'Initializing upload...';
                uploadProgressBar.style.width = '10%';
                uploadPercent.innerText = '10%';

                const initResponse = await fetch('/api/tiktok-upload-init', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        source_info: {
                            source: 'FILE_UPLOAD',
                            video_size: selectedVideoFile.size,
                            chunk_size: selectedVideoFile.size,
                            total_chunk_count: 1
                        }
                    })
                });

                const initData = await initResponse.json();
                console.log('Upload init response:', initData);

                if (initData.error && initData.error.code !== 'ok') {
                    throw new Error(initData.error.message || initData.error.code || 'Failed to initialize upload');
                }

                const uploadUrl = initData.data?.upload_url;
                const publishId = initData.data?.publish_id;

                if (!uploadUrl) {
                    throw new Error('No upload URL received from TikTok. Response: ' + JSON.stringify(initData));
                }

                // Step 2: Upload the video file via proxy (avoids CORS)
                uploadStatusText.innerText = 'Uploading video...';
                uploadProgressBar.style.width = '30%';
                uploadPercent.innerText = '30%';

                const uploadResponse = await fetch('/api/tiktok-upload-video', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'video/mp4',
                        'Content-Range': `bytes 0-${selectedVideoFile.size - 1}/${selectedVideoFile.size}`,
                        'x-upload-url': uploadUrl
                    },
                    body: selectedVideoFile
                });

                console.log('Upload response status:', uploadResponse.status);

                uploadProgressBar.style.width = '80%';
                uploadPercent.innerText = '80%';
                uploadStatusText.innerText = 'Processing...';

                // Step 3: Done
                uploadProgressBar.style.width = '100%';
                uploadPercent.innerText = '100%';
                uploadStatusText.innerText = 'Upload complete!';

                setTimeout(() => {
                    alert('✅ Video uploaded successfully to TikTok! It will appear in your TikTok inbox for review.');
                    resetUploadModal();
                    uploadModal.style.display = 'none';
                }, 1000);

            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload failed: ' + error.message);
                uploadStatusText.innerText = 'Upload failed';
                uploadProgressBar.style.width = '0%';
                uploadPercent.innerText = '0%';
                submitVideoBtn.disabled = false;
                submitVideoBtn.innerText = 'Retry Upload';
            }
        });
    }
});
