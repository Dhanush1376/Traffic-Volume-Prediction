const isGitHubPages = window.location.hostname.includes('github.io');
const repoName = '/Traffic-Volume-Prediction';
const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:5000/api'
    : (isGitHubPages ? `${repoName}/api` : '/api');

document.addEventListener('DOMContentLoaded', () => {
    // ---- Navigation Logic ----
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const title = document.getElementById('section-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-section');
            if (!target) return;

            navItems.forEach(i => {
                if(i.getAttribute('data-section') === target) {
                    i.classList.add('active');
                } else {
                    i.classList.remove('active');
                }
            });

            sections.forEach(s => {
                s.classList.toggle('active', s.id === target);
            });

            // Update Header Title depending on section
            // Update Header Title
            if (title) {
                const navText = item.innerText.trim();
                title.innerHTML = `${navText} <span>${target === 'dashboard' ? 'Overview' : ''}</span>`;
            }

            // Trigger resize for charts to adjust to new visible container
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        });
    });

    // ---- API Integrations & Chart Init ----

    // 1. Dashboard Status & Heatmap
    async function initDashboard() {
        try {
            const statusRes = await fetch(`${API_BASE}/status`);
            const statusData = await statusRes.json();
            
            document.getElementById('current-traffic-level').innerText = statusData.current_traffic_level;
            document.getElementById('current-traffic-level').style.color = getLevelColor(statusData.current_traffic_level);
            document.getElementById('system-health').innerText = statusData.status;
            
            const timeObj = new Date(statusData.timestamp);
            document.getElementById('last-updated').innerText = timeObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            // Handle Alerts
            const alertsPanel = document.getElementById('alerts-container');
            const alertList = document.getElementById('alert-list');
            const alertCount = document.getElementById('alert-count');
            
            if (statusData.active_alerts.length > 0) {
                alertsPanel.style.display = 'block';
                alertList.innerHTML = '';
                alertCount.innerText = statusData.active_alerts.length;
                
                statusData.active_alerts.forEach(alertText => {
                    const isSevere = statusData.current_traffic_level === 'High';
                    const isMod = statusData.current_traffic_level === 'Moderate';
                    
                    const severityClass = isSevere ? 'error' : (isMod ? 'warn' : 'ok');
                    const cleanText = alertText.replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                    
                    const el = document.createElement('div');
                    el.className = 'alert-row';
                    el.innerHTML = `
                        <div class="alert-dot ${severityClass}"></div>
                        <div class="alert-content">
                            <div class="alert-title">${cleanText}</div>
                            <div class="alert-meta">Detected in real-time stream</div>
                        </div>
                        <div class="alert-severity ${severityClass}">${isSevere ? 'Critical' : (isMod ? 'Significant' : 'Normal')}</div>
                    `;
                    alertList.appendChild(el);
                });
            } else {
                alertsPanel.style.display = 'none';
            }

            // Fetch Heatmap Data
            const heatRes = await fetch(`${API_BASE}/heatmap`);
            const heatData = await heatRes.json();
            initHeatmapChart(heatData.labels, heatData.data);

        } catch (error) {
            console.warn("Backend unreachable, falling back to simulated local data mode.");
            document.getElementById('server-status-text').innerText = "Running in Simulated Mode (Backend Offline)";
            document.getElementById('server-status-text').style.color = "var(--warning)";
            
            // Fallback Data
            document.getElementById('current-traffic-level').innerText = "Moderate";
            document.getElementById('current-traffic-level').style.color = getLevelColor("Moderate");
            document.getElementById('system-health').innerText = "Simulated";
            document.getElementById('last-updated').innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const alertsContainer = document.getElementById('alerts-container');
            alertsContainer.innerHTML = '<div class="alert-item warning"><i class="fa-solid fa-circle-exclamation"></i> <span>Expect moderate delays on major arterials.</span></div>';
            
            const mockHeatData = [12000, 8000, 5000, 4000, 6000, 15000, 25000, 35000, 45000, 42000, 38000, 35000, 32000, 30000, 28000, 32000, 38000, 48000, 52000, 45000, 35000, 25000, 18000, 15000];
            const mockLabels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
            initHeatmapChart(mockLabels, mockHeatData);
        }
    }

    // 2. Smart Prediction
    const predictForm = document.getElementById('smartPredictForm');
    if (predictForm) {
        predictForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const source = document.getElementById('sourceInput').value;
            const dest = document.getElementById('destInput').value;
            const arrival_time = document.getElementById('arrivalTimeInput').value;

            try {
                const res = await fetch(`${API_BASE}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source, destination: dest, arrival_time })
                });
                const data = await res.json();

                // Display Results
                const placeholder = document.getElementById('routingPlaceholder');
                const card = document.getElementById('smartResultCard');
                
                if (placeholder) placeholder.style.display = 'none';
                card.style.display = 'block';
                card.style.animation = 'none';
                card.offsetHeight; // trigger reflow
                card.style.animation = 'fadeIn 0.5s ease forwards';

                const pill = document.getElementById('trafficLevelBadge');
                pill.innerText = "Traffic: " + data.traffic_level;
                pill.className = 'risk-pill ' + (data.traffic_level === 'High' ? 'high' : (data.traffic_level === 'Moderate' ? 'mod' : 'low'));

                document.getElementById('smartRecDeparture').innerText = data.recommended_departure;
                document.getElementById('smartRecText').innerText = data.recommendation_text;
                
                // Update Environmental Factors
                document.getElementById('weatherImpactDesc').innerText = data.weather_impact;
                document.getElementById('parkingImpactDesc').innerText = data.parking_availability;
                
                if(data.routes && data.routes.length > 0) {
                    routeContainer.innerHTML = '<div class="route-cards-header">Route Options</div>';
                    data.routes.forEach((route, index) => {
                        const isSelected = index === 0;
                        const rCard = document.createElement('div');
                        rCard.className = `route-option ${isSelected ? 'selected' : ''}`;
                        rCard.onclick = () => {
                            document.querySelectorAll('.route-option').forEach(c => c.classList.remove('selected'));
                            rCard.classList.add('selected');
                            document.getElementById('smartDuration').innerText = route.duration + ' mins transit';
                        };
                        
                        let icon = 'fa-road';
                        if(route.type === 'Fastest') icon = 'fa-bolt';
                        if(route.type === 'Eco-Friendly') icon = 'fa-leaf';
                        if(route.type === 'Balanced') icon = 'fa-scale-balanced';
                        
                        rCard.innerHTML = `
                            <div class="route-icon-wrap" style="background: var(--blue-dim); color: var(--blue);">
                                <i class="fa-solid ${icon}"></i>
                            </div>
                            <div class="route-details">
                                <div class="route-name">${route.type}</div>
                                <div class="route-sub">₹${route.cost} • ${route.emissions} emissions</div>
                            </div>
                            <div class="route-dur">${route.duration}</div>
                        `;
                        routeContainer.appendChild(rCard);
                    });
                    
                    document.getElementById('smartDuration').innerText = data.routes[0].duration + ' mins transit';
                }
                
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            } catch (err) {
                console.warn("Prediction API failed, using simulated prediction.");
                
                // Simulated fallback
                const placeholder = document.getElementById('routingPlaceholder');
                const card = document.getElementById('smartResultCard');
                
                if (placeholder) placeholder.style.display = 'none';
                card.style.display = 'block';
                card.style.animation = 'none';
                card.offsetHeight;
                card.style.animation = 'fadeIn 0.5s ease forwards';

                const mockLevel = Math.random() > 0.6 ? "High" : "Moderate";
                const badge = document.getElementById('trafficLevelBadge');
                badge.innerText = mockLevel + " Traffic";
                badge.className = 'result-badge ' + (mockLevel === 'High' ? 'badge-high' : 'badge-mod');

                // Parse input time and subtract randomly 20-45 mins
                const [h, m] = arrival_time.split(':');
                const arrDate = new Date();
                arrDate.setHours(h, m, 0);
                const duration = Math.floor(Math.random() * 25) + 20;
                arrDate.setMinutes(arrDate.getMinutes() - duration);
                
                document.getElementById('weatherImpactBadge').innerHTML = `<i class="fa-solid fa-cloud-sun"></i> <span>Simulated Check</span>`;
                document.getElementById('parkingImpactBadge').innerHTML = `<i class="fa-solid fa-square-parking"></i> <span>Simulated Check</span>`;
                
                const routeContainer = document.getElementById('routeOptionsContainer');
                routeContainer.innerHTML = `
                    <div class="route-card selected">
                        <div class="route-type"><i class="fa-solid fa-bolt"></i> Local Sim Route</div>
                        <div class="route-duration">${duration} <span style="font-size:0.9rem; font-weight:500;">mins</span></div>
                        <div class="route-metrics">
                            <span><i class="fa-solid fa-indian-rupee-sign"></i> ₹180 est. cost</span>
                            <span><i class="fa-solid fa-smog"></i> Medium emissions</span>
                        </div>
                    </div>
                `;
                
                document.getElementById('smartRecDeparture').innerText = arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                document.getElementById('smartRecText').innerText = `Leave at ${arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to reach by ${arrival_time} with ${mockLevel.toLowerCase()} traffic.`;
                document.getElementById('smartDuration').innerText = duration + ' mins transit';
                
                document.getElementById('weatherImpactDesc').innerText = "Clear Skies";
                document.getElementById('parkingImpactDesc').innerText = "Moderate Availability";
                
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // 3. What-if Simulation
    const simForm = document.getElementById('simForm');
    if (simForm) {
        simForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const departure_time = document.getElementById('simTimeInput').value;
            
            try {
                const res = await fetch(`${API_BASE}/simulation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ departure_time })
                });
                const data = await res.json();

                const placeholder = document.getElementById('simPlaceholder');
                const area = document.getElementById('simResultArea');
                
                if (placeholder) placeholder.style.display = 'none';
                area.style.display = 'block';

                document.getElementById('simTargetTime').innerText = data.formatted_departure;
                document.getElementById('simDurationScore').innerText = data.estimated_duration_mins;
                document.getElementById('simVolume').innerText = data.predicted_volume.toLocaleString();
            } catch (err) {
                console.warn("Simulation API failed, using mock simulation.");
                const placeholder = document.getElementById('simPlaceholder');
                const area = document.getElementById('simResultArea');
                
                if (placeholder) placeholder.style.display = 'none';
                area.style.display = 'block';

                const [h, m] = departure_time.split(':');
                const t = new Date(); t.setHours(h, m, 0);
                
                document.getElementById('simTargetTime').innerText = t.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                document.getElementById('simDuration').innerText = (Math.floor(Math.random() * 25) + 20) + ' mins';
                document.getElementById('simVolume').innerText = (Math.floor(Math.random() * 30000) + 15000).toLocaleString() + ' vehicles';
            }
        });
    }

    // 4. AI Insights
    async function loadInsights() {
        try {
            const res = await fetch(`${API_BASE}/insights`);
            const data = await res.json();
            const container = document.getElementById('insights-container');
            container.innerHTML = '';
            
            data.insights.forEach(insight => {
                const cleanText = insight.replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                const el = document.createElement('div');
                el.className = 'insight-card';
                el.innerHTML = `
                    <div class="insight-icon" style="background: var(--blue-dim); color: var(--blue);"><i class="fa-solid fa-lightbulb"></i></div>
                    <div class="insight-title">Smart Intelligence</div>
                    <div class="insight-body">${cleanText}</div>
                    <div class="insight-footer"><i class="fa-solid fa-microchip"></i> AI Analysis Active</div>
                `;
                container.appendChild(el);
            });
        } catch (error) {
            console.warn("Insights API failed, loading mock insights.");
            const container = document.getElementById('insights-container');
            container.innerHTML = '';
            
            const mockInsights = [
                "Traffic is typically 40% higher on Mondays at 9 AM compared to mid-week averages.",
                "Best time to travel today: 11:00 AM - 3:00 PM to avoid primary congestion.",
                "Avoid Outer Ring Road corridors from 5:00 PM to 7:00 PM due to consistent peak congestion."
            ];
            
            mockInsights.forEach(insight => {
                const el = document.createElement('div');
                el.className = 'insight-block glass-panel hover-glow';
                el.innerHTML = `<i class="fa-solid fa-lightbulb"></i> <span>${insight}</span>`;
                container.appendChild(el);
            });
        }
    }

    // Charting functionality
    Chart.defaults.color = '#a0a0a0';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.responsive = true;

    function initHeatmapChart(labels, data) {
        const ctx = document.getElementById('heatmapChart');
        if(!ctx) return;
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Predicted Volume',
                    data: data,
                    backgroundColor: data.map(val => val > 35000 ? 'rgba(255, 77, 77, 0.8)' : (val > 20000 ? 'rgba(255, 165, 0, 0.8)' : 'rgba(0, 242, 254, 0.8)')),
                    borderRadius: 4
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
                }
            }
        });
    }

    function initWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if(!ctx) return;
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Avg Weekly Congestion %',
                    data: [85, 75, 80, 82, 95, 60, 45],
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: { max: 100, min: 0, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Helpers
    function getLevelColor(level) {
        if(level === 'High') return 'var(--rose)';
        if(level === 'Moderate') return 'var(--amber)';
        return 'var(--emerald)';
    }

    // Initialize data logic
    setTimeout(() => {
        initDashboard();
        loadInsights();
        initWeeklyChart();
    }, 300);
});
