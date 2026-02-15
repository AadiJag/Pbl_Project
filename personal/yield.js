const MODEL_FEATURES = [
    "Nitrogen",
    "Phosphorus",
    "Potassium",
    "Temperature",
    "Humidity",
    "pH_Value",
    "Rainfall"
];

const MODEL_STATE = {
    loaded: false,
    rows: [],
    means: [],
    stds: []
};

let modelPromise = null;

const loadCropModel = async () => {
    if (MODEL_STATE.loaded) return MODEL_STATE;
    if (modelPromise) return modelPromise;

    if (window.location.protocol === 'file:') {
        throw new Error('Open this page with a local server (Live Server) to load the dataset.');
    }

    modelPromise = fetch(encodeURI('sensor_Crop_Dataset (1).csv'))
        .then((resp) => {
            if (!resp.ok) throw new Error('Dataset not found. Keep sensor_Crop_Dataset (1).csv next to yield.html.');
            return resp.text();
        })
        .then((text) => {
            const lines = text.trim().split(/\r?\n/);
            const rows = [];
            for (let i = 1; i < lines.length; i += 1) {
                const line = lines[i].trim();
                if (!line) continue;
                const parts = line.split(',');
                if (parts.length < 8) continue;
                const features = parts.slice(0, 7).map(Number);
                if (features.some((v) => Number.isNaN(v))) continue;
                rows.push({
                    features,
                    crop: parts[7]
                });
            }

            if (!rows.length) throw new Error('Dataset is empty or invalid.');

            const means = Array(7).fill(0);
            rows.forEach((row) => {
                row.features.forEach((val, idx) => {
                    means[idx] += val;
                });
            });
            for (let i = 0; i < means.length; i += 1) {
                means[i] /= rows.length;
            }

            const stds = Array(7).fill(0);
            rows.forEach((row) => {
                row.features.forEach((val, idx) => {
                    const diff = val - means[idx];
                    stds[idx] += diff * diff;
                });
            });
            for (let i = 0; i < stds.length; i += 1) {
                stds[i] = Math.sqrt(stds[i] / rows.length) || 1;
            }

            rows.forEach((row) => {
                row.norm = row.features.map((val, idx) => (val - means[idx]) / stds[idx]);
            });

            MODEL_STATE.loaded = true;
            MODEL_STATE.rows = rows;
            MODEL_STATE.means = means;
            MODEL_STATE.stds = stds;
            return MODEL_STATE;
        })
        .catch((err) => {
            modelPromise = null;
            throw err;
        });

    return modelPromise;
};

const predictCropLocal = (values) => {
    if (!MODEL_STATE.loaded) {
        throw new Error('Model not loaded yet.');
    }

    const normInput = values.map((val, idx) => {
        const std = MODEL_STATE.stds[idx] || 1;
        return (val - MODEL_STATE.means[idx]) / std;
    });

    const distances = MODEL_STATE.rows.map((row) => {
        let sum = 0;
        for (let i = 0; i < normInput.length; i += 1) {
            const diff = normInput[i] - row.norm[i];
            sum += diff * diff;
        }
        return { crop: row.crop, dist: Math.sqrt(sum) };
    });

    distances.sort((a, b) => a.dist - b.dist);
    const k = Math.min(7, distances.length);
    const counts = {};
    for (let i = 0; i < k; i += 1) {
        const crop = distances[i].crop;
        counts[crop] = (counts[crop] || 0) + 1;
    }

    let bestCrop = '';
    let bestCount = 0;
    Object.keys(counts).forEach((crop) => {
        if (counts[crop] > bestCount) {
            bestCrop = crop;
            bestCount = counts[crop];
        }
    });

    return {
        crop: bestCrop || 'Unknown',
        confidence: k ? bestCount / k : 0
    };
};

// Splash grow animation -> reveal app + profile wiring
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('grow-overlay');
    const app = document.getElementById('app');
    const formGrid = document.querySelector('.form-grid');
    const resultCard = document.getElementById('resultCard');
    const tipsCard = document.getElementById('tipsCard');
    const profileBtn = document.getElementById('profileBtn');
    const profileCard = document.getElementById('profileCard');
    const logoutBtn = document.getElementById('logoutBtn');
    const themeToggle = document.getElementById('themeToggle');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');

    const storedProfile = sessionStorage.getItem('ecoHarvestProfile');
    if (storedProfile && profileName && profileEmail) {
        try {
            const parsed = JSON.parse(storedProfile);
            if (parsed?.name) profileName.textContent = parsed.name;
            if (parsed?.email) profileEmail.textContent = parsed.email;
        } catch (e) {
            // ignore bad data
        }
    }

    // profile toggle
    const toggleProfile = () => {
        const isHidden = profileCard.classList.contains('hidden');
        profileCard.classList.toggle('hidden', !isHidden);
        profileBtn?.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    };

    if (profileBtn && profileCard) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleProfile();
        });
        document.addEventListener('click', (e) => {
            if (!profileCard.classList.contains('hidden') && !profileCard.contains(e.target) && e.target !== profileBtn) {
                profileCard.classList.add('hidden');
                profileBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('ecoHarvestAuth');
            sessionStorage.removeItem('ecoHarvestProfile');
            if (window.location.pathname.endsWith('.html')) {
                window.location.href = 'login.html';
            } else {
                window.location.href = '/logout';
            }
        });
    }

    // theme toggle
    const setTheme = (mode) => {
        document.documentElement.setAttribute('data-theme', mode);
        if (themeToggle) themeToggle.textContent = mode === 'dark' ? '🌞' : '🌙';
        localStorage.setItem('ecoHarvestTheme', mode);
    };
    if (themeToggle) {
        const saved = localStorage.getItem('ecoHarvestTheme') || 'light';
        setTheme(saved);
        themeToggle.addEventListener('click', () => {
            const next = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
            setTheme(next);
        });
    }

    if (formGrid && resultCard?.classList.contains('hidden')) {
        formGrid.classList.add('centered');
    }

    if (!overlay || !app) return;

    setTimeout(async () => {
        overlay.classList.add('done');
        app.style.opacity = '1';
        overlay.addEventListener('transitionend', () => overlay.remove());
    }, 2000);

    loadCropModel().catch(() => {
        // Model will be loaded on submit if possible
    });
});

// Navigation Logic
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
    });
    // Show selected page
    document.getElementById(pageId).classList.add('active-page');
    
    // Update Active Nav Link
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active');
    });
    // Simple logic to highlight nav (in production use IDs on Nav items)
    if(pageId === 'home') document.querySelector('.nav-links li:nth-child(1)').classList.add('active');
    if(pageId === 'predict') document.querySelector('.nav-links li:nth-child(2)').classList.add('active');
    if(pageId === 'dashboard') document.querySelector('.nav-links li:nth-child(3)').classList.add('active');
}

// Form Handling
document.getElementById('yieldForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // UI Loading State
    const btn = document.querySelector('.btn-primary');
    const btnText = document.querySelector('.btn-text');
    const loader = document.getElementById('loader');
    
    btnText.style.display = 'none';
    loader.style.display = 'block';
    btn.disabled = true;

    // Simulate latency while "model" runs
    setTimeout(async () => {
        // Collect Data
        const n = Number(document.getElementById('nitrogen').value);
        const p = Number(document.getElementById('phosphorus').value);
        const k = Number(document.getElementById('potassium').value);
        const temp = Number(document.getElementById('temperature').value);
        const humidity = Number(document.getElementById('humidity').value);
        const ph = Number(document.getElementById('ph_value').value);
        const rain = Number(document.getElementById('rainfall').value);

        let yieldResult;
        let suggestedCrop;
        let recommendations = [];

        try {
            await loadCropModel();
            const result = predictCropLocal([n, p, k, temp, humidity, ph, rain]);
            yieldResult = 0;
            suggestedCrop = result.crop || '—';
            recommendations = [
                n < 50 ? 'Nitrogen low: consider urea or compost.' : 'Nitrogen is adequate.',
                p < 40 ? 'Phosphorus low: consider DAP/SSP.' : 'Phosphorus is adequate.',
                k < 40 ? 'Potassium low: consider MOP.' : 'Potassium is adequate.',
                rain < 200 ? 'Low rainfall: plan irrigation schedule.' : 'Rainfall is sufficient.'
            ];
        } catch (e) {
            // Fallback if API not reachable
            yieldResult = 0;
            suggestedCrop = '—';
            recommendations = [
                e?.message || 'Model not loaded. Please try again.'
            ];
        }

        // Update Results UI
        document.getElementById('cropSuggestion').innerText = suggestedCrop;
        
        // Dynamic Recommendations based on inputs
        const recList = document.getElementById('recList');
        recList.innerHTML = ''; // Clear previous
        
        recommendations.forEach(rec => {
            let li = document.createElement('li');
            li.innerText = rec;
            recList.appendChild(li);
        });

        // Tips generation
        const tipsList = document.getElementById('tipsList');
        tipsList.innerHTML = '';
        const tips = [
            { title: "Week 0: Seed treatment", detail: "Soak seeds in bio-fungicide and dry in shade before sowing for better germination." },
            { title: "Week 2: Nutrient check", detail: "Balance NPK based on soil test and target crop requirements." },
            { title: "Week 3-4: Irrigation", detail: rain < 200 ? "Plan irrigation; rainfall is low." : "Rainfall adequate; monitor soil moisture." },
            { title: "Week 5: Weed control", detail: "Use mechanical weeding between rows; mulch with straw to retain moisture." },
            { title: "Pre-flowering: Weather watch", detail: "Monitor humidity and temperature to prevent disease." },
            { title: "Pre-harvest: Pest check", detail: "Scout twice weekly; if leaf damage >10%, apply neem-based biopesticide." }
        ];
        tips.forEach(t => {
            const div = document.createElement('div');
            div.className = 'tip';
            div.innerHTML = `<strong>${t.title}</strong><small>${suggestedCrop}</small><p>${t.detail}</p>`;
            tipsList.appendChild(div);
        });

        // Show Result & Tips Section
        const grid = document.querySelector('.form-grid');
        if (grid) grid.classList.remove('centered');
        document.getElementById('resultCard').classList.remove('hidden');
        document.getElementById('tipsCard').classList.remove('hidden');

        // Reset Button
        btnText.style.display = 'block';
        loader.style.display = 'none';
        btn.disabled = false;
        
    }, 900);
});

function rainfallValue() {
    const val = document.getElementById('rainfall')?.value;
    return val ? val : '200';
}
