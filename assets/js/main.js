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
                el.className = 'alert-item ' + (statusData.current_traffic_level === 'High' ? 'severe' : (statusData.current_traffic_level === 'Moderate' ? 'warning' : 'normal'));
                el.innerHTML = `<span>⚠️</span> ${alertText}`;
                alertsContainer.appendChild(el);
            });

            // Fetch Heatmap Data
            const heatRes = await fetch(`${API_BASE}/heatmap`);
            const heatData = await heatRes.json();
            initHeatmapChart(heatData.labels, heatData.data);

        } catch (error) {
            console.error("Failed to load dashboard data", error);
            document.getElementById('server-status-text').innerText = "Intelligence core offline (Check backend connection)";
            document.getElementById('server-status-text').style.color = "var(--danger)";
        } else {
            document.getElementById('server-status-text').innerText = "Intelligence core connected";
            document.getElementById('server-status-text').style.color = "var(--success)";
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
                console.error(err);
                alert("Failed to connect to the prediction engine.");
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
                console.error(err);
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
                const el = document.createElement('div');
                el.className = 'insight-block glass';
                el.innerText = insight;
                container.appendChild(el);
            });
        } catch (error) {
            console.error(error);
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
