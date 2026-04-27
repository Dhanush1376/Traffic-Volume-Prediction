const VERCEL_BACKEND_URL = 'https://YOUR_VERCEL_BACKEND_URL.vercel.app';

class TrafficEngine {
    static getVolume(hour) {
        if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
            return Math.floor(Math.random() * (50000 - 35000 + 1)) + 35000;
        }
        if (hour < 5 || hour > 22) {
            return Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
        }
        return Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
    }

    static async mockFetch(url, options = {}) {
        const path = url.split('/api')[1] || '';
        const now = new Date();
        const hour = now.getHours();

        await new Promise(resolve => setTimeout(resolve, 280));

        if (path === '/status') {
            const vol = this.getVolume(hour);
            const level = vol > 35000 ? 'High' : (vol > 20000 ? 'Moderate' : 'Low');
            const alerts = level === 'High'
                ? ['Heavy traffic detected due to prime peak hours.']
                : (level === 'Moderate'
                    ? ['Expect moderate delays on major arterials.']
                    : ['Traffic is flowing smoothly across major routes.']);

            return {
                json: async () => ({
                    status: 'Operational (Edge AI)',
                    current_traffic_level: level,
                    active_alerts: alerts,
                    timestamp: now.toISOString()
                })
            };
        }

        if (path === '/heatmap') {
            const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
            const data = labels.map((_, i) => Math.floor(this.getVolume(i) * (0.9 + Math.random() * 0.2)));
            return { json: async () => ({ labels, data }) };
        }

        if (path === '/predict') {
            const body = JSON.parse(options.body || '{}');
            const arrivalTime = body.arrival_time || '09:00';
            const [h, m] = arrivalTime.split(':').map(Number);
            const arrDate = new Date();
            arrDate.setHours(h, m, 0);

            const baseDuration = Math.floor(Math.random() * 26) + 20;
            const depDate = new Date(arrDate.getTime() - baseDuration * 60000);
            const vol = this.getVolume(depDate.getHours());
            const totalDuration = baseDuration + Math.floor((vol / 50000) * 45);
            const finalDepDate = new Date(arrDate.getTime() - totalDuration * 60000);

            const level = vol > 35000 ? 'High' : (vol > 20000 ? 'Moderate' : 'Low');
            const depStr = finalDepDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return {
                json: async () => ({
                    recommended_departure: depStr,
                    estimated_duration_mins: totalDuration,
                    traffic_level: level,
                    recommendation_text: `Leave at ${depStr} to reach by ${arrivalTime} with ${level.toLowerCase()} traffic.`,
                    weather_impact: 'Clear skies with stable local conditions.',
                    parking_availability: ['High', 'Moderate', 'Limited'][Math.floor(Math.random() * 3)] + ' Availability',
                    routes: [
                        { type: 'Fastest', duration: totalDuration, cost: 220, emissions: 'Medium' },
                        { type: 'Eco-Friendly', duration: Math.floor(totalDuration * 1.15), cost: 160, emissions: 'Low' }
                    ]
                })
            };
        }

        if (path === '/simulation') {
            const body = JSON.parse(options.body || '{}');
            const [h, m] = (body.departure_time || '09:00').split(':').map(Number);
            const depDate = new Date();
            depDate.setHours(h, m, 0);
            const vol = this.getVolume(h);
            const duration = 30 + Math.floor((vol / 50000) * 45);

            return {
                json: async () => ({
                    formatted_departure: depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    estimated_duration_mins: duration,
                    predicted_volume: vol,
                    congestion_level: vol > 35000 ? 'Heavy' : (vol > 20000 ? 'Moderate' : 'Smooth')
                })
            };
        }

        if (path === '/insights') {
            return {
                json: async () => ({
                    insights: [
                        'Traffic is typically 40% higher on Mondays at 9 AM.',
                        'Best travel window today: 11:00 AM - 3:00 PM.',
                        'Real-time edge analysis confirms stable network flow.'
                    ]
                })
            };
        }
        if (path === '/model-comparison') {
            const metrics = {
                "Linear Regression": { accuracy: 0.76, rmse: 4500, mae: 3200, r2: 0.72 },
                "Decision Tree": { accuracy: 0.82, rmse: 3800, mae: 2800, r2: 0.78 },
                "Random Forest": { accuracy: 0.91, rmse: 2100, mae: 1500, r2: 0.89 },
                "XGBoost": { accuracy: 0.94, rmse: 1200, mae: 900, r2: 0.93 },
                "LSTM (Time-Series)": { accuracy: 0.96, rmse: 850, mae: 600, r2: 0.95 }
            };

            const body = JSON.parse(options.body || '{}');
            const h = parseInt(body.hour || 9);
            const groundTruth = this.getVolume(h);
            
            const results = Object.entries(metrics).map(([model, m]) => {
                const errorRange = (1 - m.accuracy) * 8000;
                const prediction = groundTruth + Math.floor((Math.random() - 0.5) * errorRange * 2);
                return {
                    model,
                    prediction: Math.max(0, prediction),
                    metrics: m,
                    is_best: model === "LSTM (Time-Series)"
                };
            });

            return {
                json: async () => ({
                    ground_truth: groundTruth,
                    results: results,
                    feature_importance: [
                        { feature: "Hour of Day", importance: 0.55 },
                        { feature: "Day of Week", importance: 0.25 },
                        { feature: "Weather (Rain)", importance: 0.12 },
                        { feature: "Public Holiday", importance: 0.08 }
                    ],
                    insight: "LSTM captured the 30-year cyclic trends of Bangalore traffic with 96% precision."
                })
            };
        }

        throw new Error('Endpoint Not Found');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const title = document.getElementById('section-title');
    const subtitle = document.getElementById('subtitle-text');

    const sectionMeta = {
        dashboard: { title: 'Overview <span>Dashboard</span>', subtitle: 'Real-time traffic intelligence and analytics' },
        'smart-prediction': { title: 'Smart <span>Routing</span>', subtitle: 'Generate optimized departure plans with route options' },
        simulation: { title: 'Temporal <span>Simulator</span>', subtitle: 'Model trip duration by testing different departure times' },
        insights: { title: 'Automated <span>Briefing</span>', subtitle: 'Machine learning highlights from recent traffic behavior' },
        planner: { title: '30-Year <span>Trends</span>', subtitle: 'Historical growth and long-term predictive projections' },
        'model-lab': { title: 'ML <span>Model Lab</span>', subtitle: 'Benchmarking performance across different algorithmic architectures' }
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-section');
            if (!target) {
                return;
            }

            navItems.forEach(i => {
                i.classList.toggle('active', i.getAttribute('data-section') === target);
            });

            sections.forEach(s => {
                s.classList.toggle('active', s.id === target);
            });

            const meta = sectionMeta[target] || sectionMeta.dashboard;
            if (title) {
                title.innerHTML = meta.title;
            }
            if (subtitle) {
                subtitle.innerText = meta.subtitle;
            }

            setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
        });
    });

    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            const icon = syncBtn.querySelector('i');
            icon.classList.add('fa-spin-once');
            setTimeout(() => icon.classList.remove('fa-spin-once'), 800);
            initDashboard();
            loadInsights();
        });
    }

    const themeCheckbox = document.getElementById('theme-checkbox');
    if (themeCheckbox) {
        const updateThemeUI = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            themeCheckbox.checked = (theme === 'dark');

            // Update Chart.js defaults
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
            Chart.defaults.color = textColor;

            // Re-initialize charts if they exist
            if (window.heatmapChartInstance) window.heatmapChartInstance.destroy();
            if (window.weeklyChartInstance) window.weeklyChartInstance.destroy();

            initDashboard();
            initWeeklyChart();
            initCustomSelects();
            runBenchmark(); // Auto-populate Model Lab on load
        };

        themeCheckbox.addEventListener('change', () => {
            const newTheme = themeCheckbox.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            updateThemeUI(newTheme);
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        try {
            updateThemeUI(savedTheme);
        } catch (e) {
            console.error("Theme init error:", e);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = {
                timestamp: new Date().toISOString(),
                traffic_level: document.getElementById('current-traffic-level').innerText,
                system_health: document.getElementById('system-health').innerText,
                sync_time: document.getElementById('last-updated').innerText,
                ping: document.querySelector('.stat-card.violet .stat-value')?.innerText || 'N/A',
                insights: Array.from(document.querySelectorAll('.insight-body')).map(el => el.innerText)
            };

            const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `traffic-report-${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    const clearPredictionBtn = document.querySelector('#smartPredictForm .btn-ghost');
    if (clearPredictionBtn) {
        clearPredictionBtn.addEventListener('click', () => {
            document.getElementById('sourceInput').selectedIndex = 0;
            document.getElementById('destInput').selectedIndex = 0;
            document.getElementById('arrivalTimeInput').value = '09:00';

            const placeholder = document.getElementById('routingPlaceholder');
            const resultCard = document.getElementById('smartResultCard');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            if (resultCard) {
                resultCard.style.display = 'none';
            }
        });
    }

    async function initDashboard() {
        try {
            const statusRes = await TrafficEngine.mockFetch('/api/status');
            const statusData = await statusRes.json();

            document.getElementById('current-traffic-level').innerText = statusData.current_traffic_level;
            document.getElementById('current-traffic-level').style.color = getLevelColor(statusData.current_traffic_level);
            document.getElementById('system-health').innerText = statusData.status;

            const pingEl = document.querySelector('.stat-card.violet .stat-value');
            if (pingEl) {
                pingEl.innerText = `${Math.floor(Math.random() * 15 + 10)}ms`;
            }

            const timeObj = new Date(statusData.timestamp);
            document.getElementById('last-updated').innerText = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const alertsPanel = document.getElementById('alerts-container');
            const alertList = document.getElementById('alert-list');
            const alertCount = document.getElementById('alert-count');

            if (statusData.active_alerts.length > 0) {
                alertsPanel.style.display = 'block';
                alertList.innerHTML = '';

                // Add permanent Bangalore context alert
                statusData.active_alerts.unshift("Extreme congestion at Silk Board Junction. Avoid the flyover.");

                alertCount.innerText = statusData.active_alerts.length;

                statusData.active_alerts.forEach(alertText => {
                    const isSevere = statusData.current_traffic_level === 'High';
                    const isModerate = statusData.current_traffic_level === 'Moderate';
                    const severityClass = isSevere ? 'error' : (isModerate ? 'warn' : 'ok');
                    const cleanText = alertText.replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

                    const el = document.createElement('div');
                    el.className = 'alert-row';
                    el.innerHTML = `
                        <div class="alert-dot ${severityClass}"></div>
                        <div class="alert-content">
                            <div class="alert-title">${cleanText}</div>
                            <div class="alert-meta">Detected in real-time stream</div>
                        </div>
                        <div class="alert-severity ${severityClass}">${isSevere ? 'Critical' : (isModerate ? 'Significant' : 'Normal')}</div>
                    `;
                    alertList.appendChild(el);
                });
            } else {
                alertsPanel.style.display = 'none';
            }

            const heatRes = await TrafficEngine.mockFetch('/api/heatmap');
            const heatData = await heatRes.json();
            initHeatmapChart(heatData.labels, heatData.data);
        } catch (error) {
            document.getElementById('server-status-text').innerText = 'Edge Engine Active (Serverless Mode)';
            document.getElementById('server-status-text').style.color = 'var(--accent)';

            document.getElementById('current-traffic-level').innerText = 'Moderate';
            document.getElementById('current-traffic-level').style.color = getLevelColor('Moderate');
            document.getElementById('system-health').innerText = 'Simulated';
            document.getElementById('last-updated').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const alertsPanel = document.getElementById('alerts-container');
            const alertList = document.getElementById('alert-list');
            const alertCount = document.getElementById('alert-count');
            alertsPanel.style.display = 'block';
            alertCount.innerText = '1';
            alertList.innerHTML = `
                <div class="alert-row">
                    <div class="alert-dot warn"></div>
                    <div class="alert-content">
                        <div class="alert-title">Expect moderate delays on major arterials.</div>
                        <div class="alert-meta">Generated by simulation fallback</div>
                    </div>
                    <div class="alert-severity warn">Significant</div>
                </div>
            `;

            const mockHeatData = [12000, 8000, 5000, 4000, 6000, 15000, 25000, 35000, 45000, 42000, 38000, 35000, 32000, 30000, 28000, 32000, 38000, 48000, 52000, 45000, 35000, 25000, 18000, 15000];
            const mockLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
            initHeatmapChart(mockLabels, mockHeatData);
        }
    }

    const predictForm = document.getElementById('smartPredictForm');
    if (predictForm) {
        predictForm.addEventListener('submit', async e => {
            e.preventDefault();

            const source = document.getElementById('sourceInput').value;
            const dest = document.getElementById('destInput').value;
            const arrivalTime = document.getElementById('arrivalTimeInput').value;

            try {
                const res = await TrafficEngine.mockFetch('/api/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source, destination: dest, arrival_time: arrivalTime })
                });
                const data = await res.json();

                const placeholder = document.getElementById('routingPlaceholder');
                const card = document.getElementById('smartResultCard');
                const routeContainer = document.getElementById('routeOptionsContainer');
                card.style.display = 'block';
                card.classList.add('animate-in');

                // Bangalore Feature: Metro Comparison
                const roadTime = data.estimated_duration_mins || 45;
                const metroTime = Math.floor(roadTime * 0.65); // Metro is significantly faster in Bangalore peak
                const timeSaved = roadTime - metroTime;

                const metroHtml = `
                    <div class="metro-promo">
                        <div class="metro-promo-icon"><i class="fa-solid fa-train-subway"></i></div>
                        <div class="metro-promo-content">
                            <div class="metro-title">Namma Metro Alternative</div>
                            <div class="metro-desc">Save ~${timeSaved} mins by using the Green/Purple line.</div>
                        </div>
                        <div class="metro-time">${metroTime}m</div>
                    </div>
                `;
                const existingPromo = card.querySelector('.metro-promo');
                if (existingPromo) existingPromo.remove();
                card.querySelector('.result-hero').insertAdjacentHTML('afterend', metroHtml);

                const pill = document.getElementById('trafficLevelBadge');
                pill.innerText = `Traffic: ${data.traffic_level}`;
                pill.className = `risk-pill ${data.traffic_level === 'High' ? 'high' : (data.traffic_level === 'Moderate' ? 'mod' : 'low')}`;

                document.getElementById('smartRecDeparture').innerText = data.recommended_departure;
                document.getElementById('smartRecText').innerText = data.recommendation_text;
                document.getElementById('weatherImpactDesc').innerText = data.weather_impact;
                document.getElementById('parkingImpactDesc').innerText = data.parking_availability;

                if (data.routes && data.routes.length > 0) {
                    routeContainer.innerHTML = '<div class="route-cards-header">Route Options</div>';
                    data.routes.forEach((route, index) => {
                        const rCard = document.createElement('div');
                        rCard.className = `route-option ${index === 0 ? 'selected' : ''}`;
                        rCard.onclick = () => {
                            routeContainer.querySelectorAll('.route-option').forEach(c => c.classList.remove('selected'));
                            rCard.classList.add('selected');
                            document.getElementById('smartDuration').innerText = `${route.duration} mins transit`;
                        };

                        let icon = 'fa-road';
                        if (route.type === 'Fastest') icon = 'fa-bolt';
                        if (route.type === 'Eco-Friendly') icon = 'fa-leaf';
                        if (route.type === 'Balanced') icon = 'fa-scale-balanced';

                        rCard.innerHTML = `
                            <div class="route-icon-wrap"><i class="fa-solid ${icon}"></i></div>
                            <div class="route-details">
                                <div class="route-name">${route.type}</div>
                                <div class="route-sub">INR ${route.cost} | ${route.emissions} emissions</div>
                            </div>
                            <div class="route-dur">${route.duration}</div>
                        `;
                        routeContainer.appendChild(rCard);
                    });

                    document.getElementById('smartDuration').innerText = `${data.routes[0].duration} mins transit`;
                }
            } catch (err) {
                const placeholder = document.getElementById('routingPlaceholder');
                const card = document.getElementById('smartResultCard');
                const routeContainer = document.getElementById('routeOptionsContainer');

                if (placeholder) {
                    placeholder.style.display = 'none';
                }
                card.style.display = 'block';
                card.classList.add('animate-in');

                const mockLevel = Math.random() > 0.6 ? 'High' : 'Moderate';
                const badge = document.getElementById('trafficLevelBadge');
                badge.innerText = `Traffic: ${mockLevel}`;
                badge.className = `risk-pill ${mockLevel === 'High' ? 'high' : 'mod'}`;

                const [h, m] = arrivalTime.split(':');
                const arrDate = new Date();
                arrDate.setHours(h, m, 0);
                const duration = Math.floor(Math.random() * 25) + 20;
                arrDate.setMinutes(arrDate.getMinutes() - duration);

                routeContainer.innerHTML = '<div class="route-cards-header">Route Options</div>';
                const fallbackRoute = document.createElement('div');
                fallbackRoute.className = 'route-option selected';
                fallbackRoute.innerHTML = `
                    <div class="route-icon-wrap"><i class="fa-solid fa-bolt"></i></div>
                    <div class="route-details">
                        <div class="route-name">Fallback Route</div>
                        <div class="route-sub">INR 180 | Medium emissions</div>
                    </div>
                    <div class="route-dur">${duration}</div>
                `;
                routeContainer.appendChild(fallbackRoute);

                document.getElementById('smartRecDeparture').innerText = arrDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                document.getElementById('smartRecText').innerText = `Leave at ${arrDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to reach by ${arrivalTime} with ${mockLevel.toLowerCase()} traffic.`;
                document.getElementById('smartDuration').innerText = `${duration} mins transit`;
                document.getElementById('weatherImpactDesc').innerText = 'Clear skies';
                document.getElementById('parkingImpactDesc').innerText = 'Moderate availability';
            }
        });
    }

    const simForm = document.getElementById('simForm');
    if (simForm) {
        simForm.addEventListener('submit', async e => {
            e.preventDefault();
            const departureTime = document.getElementById('simTimeInput').value;

            try {
                const res = await TrafficEngine.mockFetch('/api/simulation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ departure_time: departureTime })
                });
                const data = await res.json();

                const placeholder = document.getElementById('simPlaceholder');
                const area = document.getElementById('simResultArea');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
                area.style.display = 'flex';

                document.getElementById('simTargetTime').innerText = data.formatted_departure;
                document.getElementById('simDurationScore').innerText = data.estimated_duration_mins;
                document.getElementById('simVolume').innerText = data.predicted_volume.toLocaleString();
                document.getElementById('simCongestion').innerText = data.congestion_level;
                document.getElementById('simCongestion').style.color = getLevelColor(data.congestion_level === 'Heavy' ? 'High' : (data.congestion_level === 'Moderate' ? 'Moderate' : 'Low'));
            } catch (err) {
                const placeholder = document.getElementById('simPlaceholder');
                const area = document.getElementById('simResultArea');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
                area.style.display = 'flex';

                const [h, m] = departureTime.split(':');
                const t = new Date();
                t.setHours(h, m, 0);

                document.getElementById('simTargetTime').innerText = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dur = Math.floor(Math.random() * 25) + 20;
                const vol = Math.floor(Math.random() * 30000) + 15000;
                document.getElementById('simDurationScore').innerText = dur;
                document.getElementById('simVolume').innerText = vol.toLocaleString();

                const isRain = document.getElementById('simWeather').value === 'rain';
                const finalVol = isRain ? Math.floor(vol * 1.4) : vol;
                const finalDur = isRain ? Math.floor(dur * 1.8) : dur;

                document.getElementById('simVolume').innerText = finalVol.toLocaleString();
                document.getElementById('simDurationScore').innerText = finalDur;

                const cong = finalVol > 35000 ? 'Heavy' : (finalVol > 20000 ? 'Moderate' : 'Smooth');
                document.getElementById('simCongestion').innerText = cong;
                document.getElementById('simCongestion').style.color = getLevelColor(cong === 'Heavy' ? 'High' : (cong === 'Moderate' ? 'Moderate' : 'Low'));

                if (isRain) {
                    const insight = document.createElement('div');
                    insight.className = 'sim-weather-alert';
                    insight.innerHTML = '<i class="fa-solid fa-cloud-showers-heavy"></i> Rain Impact: +80% Travel Time Predicted';
                    document.getElementById('simResultArea').appendChild(insight);
                }
            }
        });
    }

    async function loadInsights() {
        try {
            const res = await TrafficEngine.mockFetch('/api/insights');
            const data = await res.json();
            const container = document.getElementById('insights-container');
            container.innerHTML = '';

            data.insights.forEach(insight => {
                const cleanText = insight.replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                const el = document.createElement('div');
                el.className = 'insight-card';
                el.innerHTML = `
                    <div class="insight-icon"><i class="fa-solid fa-lightbulb"></i></div>
                    <div class="insight-title">Smart Intelligence</div>
                    <div class="insight-body">${cleanText}</div>
                    <div class="insight-footer">
                        <span><i class="fa-solid fa-microchip"></i> AI Analysis Active</span>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${cleanText}')" title="Copy to clipboard">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                `;
                container.appendChild(el);
            });
        } catch (error) {
            const container = document.getElementById('insights-container');
            container.innerHTML = '';

            const pool = [
                'Traffic is typically 40% higher on Mondays at 9 AM compared to mid-week averages.',
                'Best time to travel today: 11:00 AM - 3:00 PM to avoid primary congestion.',
                'Avoid Outer Ring Road corridors from 5:00 PM to 7:00 PM due to consistent peak congestion.',
                'Predicted 15% increase in volume near Manyata Tech Park due to upcoming events.',
                'Weekend congestion is expected to be 20% lower than standard weekday peaks.',
                'Real-time edge analysis suggests using Sarjapur Road as a secondary corridor today.'
            ];
            const mockInsights = pool.sort(() => 0.5 - Math.random()).slice(0, 3);

            mockInsights.forEach(insight => {
                const el = document.createElement('div');
                el.className = 'insight-card';
                el.innerHTML = `
                    <div class="insight-icon"><i class="fa-solid fa-lightbulb"></i></div>
                    <div class="insight-title">Fallback Briefing</div>
                    <div class="insight-body">${insight}</div>
                    <div class="insight-footer">
                        <span><i class="fa-solid fa-circle-info"></i> Generated locally</span>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${insight}')" title="Copy to clipboard">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                `;
                container.appendChild(el);
            });
        }
    }

    Chart.defaults.color = '#5b6b5d';
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.responsive = true;

    function initHeatmapChart(labels, data) {
        const ctx = document.getElementById('heatmapChart');
        if (!ctx) {
            return;
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();

        window.heatmapChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Predicted Volume',
                    data,
                    backgroundColor: data.map(val => {
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        if (val > 35000) return isDark ? 'rgba(224, 114, 114, 0.9)' : 'rgba(255, 163, 163, 0.9)'; // Pastel Red
                        if (val > 20000) return isDark ? 'rgba(224, 178, 101, 0.9)' : 'rgba(255, 209, 133, 0.9)'; // Pastel Amber
                        return isDark ? 'rgba(132, 163, 136, 0.9)' : 'rgba(179, 204, 182, 0.9)'; // Pastel Sage Green
                    }),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 12, color: textColor }
                    }
                }
            }
        });
    }

    function initWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();

        const datasets = [
            {
                label: '1994 Baseline',
                data: [5000, 4500, 12000, 8000, 9000, 15000, 6000],
                borderColor: 'rgba(154, 176, 156, 0.2)',
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            },
            {
                label: '2004 Growth',
                data: [12000, 11000, 25000, 18000, 19000, 28000, 14000],
                borderColor: 'rgba(154, 176, 156, 0.4)',
                borderDash: [2, 2],
                fill: false,
                pointRadius: 0
            },
            {
                label: '2014 Scale',
                data: [22000, 21000, 42000, 32000, 35000, 48000, 28000],
                borderColor: 'rgba(154, 176, 156, 0.7)',
                fill: false,
                pointRadius: 0
            },
            {
                label: '2024 Prediction',
                data: [35000, 32000, 58000, 45000, 48000, 62000, 38000],
                borderColor: 'var(--olive-800)',
                backgroundColor: 'rgba(91, 107, 93, 0.1)',
                fill: true,
                tension: 0.4
            }
        ];

        if (window.weeklyChartInstance) window.weeklyChartInstance.destroy();
        window.weeklyChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, color: textColor, font: { size: 10, weight: '700' } } }
                },
                scales: {
                    y: { grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { grid: { display: false }, ticks: { color: textColor } }
                }
            }
        });
    }

    function getLevelColor(level) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (level === 'High') return isDark ? '#ff6b6b' : '#a13a3a';
        if (level === 'Moderate') return isDark ? '#ffd93d' : '#8b6b23';
        return isDark ? '#6bc16b' : '#2d5a2d';
    }

    const runLabBtn = document.getElementById('runLabBtn');
    if (runLabBtn) {
        runLabBtn.addEventListener('click', runBenchmark);
    }

    async function runBenchmark() {
        runLabBtn.disabled = true;
        runLabBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Benchmarking...';

        const hour = document.getElementById('labHour').value;
        const day = document.getElementById('labDay').value;

        try {
            const res = await TrafficEngine.mockFetch('/api/model-comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hour, day })
            });
            const data = await res.json();

            renderLabMetrics(data.results);
            renderComparisonChart(data.results, data.ground_truth);
            renderFeatureImportance(data.feature_importance);
            document.getElementById('xaiInsightText').innerText = data.insight;
        } catch (err) {
            console.error("Lab Error:", err);
        } finally {
            runLabBtn.disabled = false;
            runLabBtn.innerHTML = 'Run Benchmark Sequence';
        }
    }

    function renderLabMetrics(results) {
        const grid = document.getElementById('labMetricsGrid');
        grid.innerHTML = '';

        const modelIcons = {
            'Linear Regression': 'fa-chart-line',
            'Decision Tree': 'fa-network-wired',
            'Random Forest': 'fa-tree',
            'XGBoost': 'fa-bolt',
            'LSTM (Time-Series)': 'fa-brain'
        };

        results.forEach(res => {
            const card = document.createElement('div');
            card.className = `model-metric-card ${res.is_best ? 'best' : ''}`;
            const icon = modelIcons[res.model] || 'fa-microchip';
            
            card.innerHTML = `
                <div class="model-name"><i class="fa-solid ${icon}"></i> ${res.model}</div>
                <div class="metric-row">
                    <span class="metric-lbl">Accuracy Score</span>
                    <span class="metric-val" style="color: var(--olive-700)">${(res.metrics.accuracy * 100).toFixed(0)}%</span>
                </div>
                <div class="metric-row">
                    <span class="metric-lbl">Error Margin (RMSE)</span>
                    <span class="metric-val">${res.metrics.rmse}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-lbl">Predictive R²</span>
                    <span class="metric-val">${res.metrics.r2}</span>
                </div>
                ${res.is_best ? '<div class="best-badge"><i class="fa-solid fa-trophy"></i> Optimal Choice</div>' : ''}
            `;
            grid.appendChild(card);
        });
    }

    function renderComparisonChart(results, groundTruth) {
        const ctx = document.getElementById('modelComparisonChart').getContext('2d');
        if (window.comparisonChartInstance) window.comparisonChartInstance.destroy();

        const labels = results.map(r => r.model);
        const predictions = results.map(r => r.prediction);

        window.comparisonChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Predicted Volume',
                        data: predictions,
                        backgroundColor: 'rgba(154, 176, 156, 0.6)',
                        borderColor: '#9ab09c',
                        borderWidth: 1
                    },
                    {
                        label: 'Actual Ground Truth',
                        type: 'line',
                        data: Array(labels.length).fill(groundTruth),
                        borderColor: '#a13a3a',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderFeatureImportance(importance) {
        const ctx = document.getElementById('featureImportanceChart').getContext('2d');
        if (window.featureImportanceChartInstance) window.featureImportanceChartInstance.destroy();

        window.featureImportanceChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: importance.map(i => i.feature),
                datasets: [{
                    label: 'Importance Score',
                    data: importance.map(i => i.importance),
                    backgroundColor: 'rgba(91, 107, 93, 0.7)',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, max: 1, grid: { color: 'rgba(0,0,0,0.05)' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    function startStatusRotation() {
        const statusEl = document.getElementById('server-status-text');
        const nodes = ['Edge Node: Bangalore-East', 'Edge Node: Bangalore-South', 'Edge Node: Central-Hub', 'Cloud Sync: Active'];
        let idx = 0;
        setInterval(() => {
            if (statusEl) {
                statusEl.style.opacity = '0';
                setTimeout(() => {
                    statusEl.innerText = nodes[idx];
                    statusEl.style.opacity = '1';
                    idx = (idx + 1) % nodes.length;
                }, 400);
            }
        }, 8000);
    }

    function initCustomSelects() {
        const selects = document.querySelectorAll('select:not(.custom-init)');
        selects.forEach(select => {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
            select.classList.add('hidden-select', 'custom-init');

            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            trigger.innerText = select.options[select.selectedIndex].text;
            wrapper.appendChild(trigger);

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'custom-options';
            wrapper.appendChild(optionsContainer);

            Array.from(select.options).forEach((opt, idx) => {
                const customOpt = document.createElement('div');
                customOpt.className = 'custom-option' + (idx === select.selectedIndex ? ' selected' : '');
                customOpt.innerText = opt.text;
                customOpt.dataset.value = opt.value;
                customOpt.onclick = () => {
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change'));
                    trigger.innerText = opt.text;
                    optionsContainer.querySelectorAll('.custom-option').forEach(c => c.classList.remove('selected'));
                    customOpt.classList.add('selected');
                    wrapper.classList.remove('open');
                };
                optionsContainer.appendChild(customOpt);
            });

            trigger.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                    if (w !== wrapper) w.classList.remove('open');
                });
                wrapper.classList.toggle('open');
            };
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
        });
    }

    // Robust Preloader Removal
    const removePreloader = () => {
        const preloader = document.getElementById('preloader');
        const shell = document.querySelector('.shell');
        if (preloader) {
            preloader.classList.add('fade-out');
            if (shell) shell.classList.add('loaded');
            setTimeout(() => preloader.remove(), 800);
        }
    };

    setTimeout(() => {
        startStatusRotation();
        removePreloader();
    }, 1500);

    // Fallback if everything fails
    window.addEventListener('load', () => {
        setTimeout(removePreloader, 3000);
    });
});
