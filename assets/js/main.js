const API_BASE = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    // ---- Navigation Logic ----
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
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
            const textMatch = item.querySelector('.nav-text');
            if (title && textMatch) {
                title.innerText = textMatch.innerText + (target === 'dashboard' ? ' Overview' : '');
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
            const alertsContainer = document.getElementById('alerts-container');
            alertsContainer.innerHTML = '';
            statusData.active_alerts.forEach(alertText => {
                const el = document.createElement('div');
                const isSevere = statusData.current_traffic_level === 'High';
                const isMod = statusData.current_traffic_level === 'Moderate';
                
                el.className = 'alert-item ' + (isSevere ? 'severe' : (isMod ? 'warning' : 'normal'));
                const iconClass = isSevere ? 'fa-triangle-exclamation' : (isMod ? 'fa-circle-exclamation' : 'fa-circle-check');
                
                // Strip emoji from backend text if cached
                const cleanText = alertText.replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                
                el.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${cleanText}</span>`;
                alertsContainer.appendChild(el);
            });

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
                const card = document.getElementById('smartResultCard');
                card.style.display = 'block';
                card.style.animation = 'none';
                card.offsetHeight; // trigger reflow
                card.style.animation = 'fadeIn 0.5s ease forwards';

                const badge = document.getElementById('trafficLevelBadge');
                badge.innerText = data.traffic_level + " Traffic";
                badge.className = 'result-badge ' + (data.traffic_level === 'High' ? 'badge-high' : (data.traffic_level === 'Moderate' ? 'badge-mod' : 'badge-low'));

                document.getElementById('smartRecDeparture').innerText = data.recommended_departure;
                document.getElementById('smartRecText').innerText = data.recommendation_text;
                document.getElementById('smartDuration').innerText = data.estimated_duration_mins + ' mins';
                
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            } catch (err) {
                console.warn("Prediction API failed, using simulated prediction.");
                
                // Simulated fallback
                const card = document.getElementById('smartResultCard');
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
                
                document.getElementById('smartRecDeparture').innerText = arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                document.getElementById('smartRecText').innerText = `Leave at ${arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to reach by ${arrival_time} with ${mockLevel.toLowerCase()} traffic.`;
                document.getElementById('smartDuration').innerText = duration + ' mins';
                
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

                const area = document.getElementById('simResultArea');
                area.style.display = 'block';

                document.getElementById('simTargetTime').innerText = data.formatted_departure;
                document.getElementById('simDuration').innerText = data.estimated_duration_mins + ' mins';
                document.getElementById('simVolume').innerText = data.predicted_volume.toLocaleString() + ' vehicles';
            } catch (err) {
                console.warn("Simulation API failed, using mock simulation.");
                const area = document.getElementById('simResultArea');
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
                el.className = 'insight-block glass-panel hover-glow';
                el.innerHTML = `<i class="fa-solid fa-lightbulb"></i> <span>${cleanText}</span>`;
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
        if(level === 'High') return 'var(--danger)';
        if(level === 'Moderate') return 'var(--warning)';
        return 'var(--success)';
    }

    // Initialize data logic
    setTimeout(() => {
        initDashboard();
        loadInsights();
        initWeeklyChart();
    }, 300);
});
