import sys

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_header = """const VERCEL_BACKEND_URL = '';
const USE_MOCK = false;

class TrafficEngine {
    static async apiFetch(url, options = {}) {
        if (!USE_MOCK) {
            try {
                const response = await fetch(VERCEL_BACKEND_URL + url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(options.headers || {})
                    }
                });
                return response;
            } catch (error) {
                console.error('Real fetch failed, falling back to mock:', error);
            }
        }
        return this.mockFetch(url, options);
    }
"""

content = content.replace("const VERCEL_BACKEND_URL = 'https://YOUR_VERCEL_BACKEND_URL.vercel.app';\n\nclass TrafficEngine {", new_header)
content = content.replace("TrafficEngine.mockFetch", "TrafficEngine.apiFetch")

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated main.js!")
