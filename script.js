document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictionForm');
    if (!form) return; // Only runs on predict page

    const resultContainer = document.getElementById('resultContainer');
    const resultIdle = document.getElementById('resultIdle');
    const cropNameDisplay = document.getElementById('cropName');
    const loader = document.getElementById('loader');
    const barFill = document.querySelector('.bar-fill');

    // Data-driven validation ranges
    const validationRules = {
        N:           { min: 0,   max: 140,  unit: 'kg/ha', label: 'Nitrogen' },
        P:           { min: 5,   max: 145,  unit: 'kg/ha', label: 'Phosphorus' },
        K:           { min: 5,   max: 205,  unit: 'kg/ha', label: 'Potassium' },
        temperature: { min: 8,   max: 44,   unit: '°C',    label: 'Temperature' },
        humidity:    { min: 14,  max: 100,  unit: '%',     label: 'Humidity' },
        ph:          { min: 3.5, max: 10,   unit: '',      label: 'Soil pH' },
        rainfall:    { min: 20,  max: 300,  unit: 'mm',    label: 'Rainfall' }
    };

    // Real-time inline validation
    document.querySelectorAll('.input-card input').forEach(input => {
        input.addEventListener('input',  () => validateField(input));
        input.addEventListener('blur',   () => validateField(input));
    });

    function validateField(input) {
        const rule = validationRules[input.name];
        if (!rule) return true;
        const value = parseFloat(input.value);
        const card  = input.closest('.input-card');
        const existingWarn = card.querySelector('.field-warning');
        if (existingWarn) existingWarn.remove();
        card.classList.remove('warning-active');
        if (input.value === '' || isNaN(value)) return true;

        let msg = '';
        if (value < rule.min) msg = `Too low — ${rule.label} should be at least ${rule.min}${rule.unit}`;
        else if (value > rule.max) msg = `Too high — ${rule.label} should not exceed ${rule.max}${rule.unit}`;

        if (msg) {
            const el = document.createElement('div');
            el.className = 'field-warning';
            el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
            card.appendChild(el);
            card.classList.add('warning-active');
            return false;
        }
        return true;
    }

    function validateAllFields() {
        const inputs = document.querySelectorAll('.input-card input');
        let allValid = true;
        const warnings = [];
        inputs.forEach(input => {
            if (!validateField(input)) {
                allValid = false;
                const rule = validationRules[input.name];
                const val  = parseFloat(input.value);
                if (rule) {
                    warnings.push(val < rule.min
                        ? `${rule.label} is too low (${val}${rule.unit})`
                        : `${rule.label} is too high (${val}${rule.unit})`);
                }
            }
        });
        return { allValid, warnings };
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { allValid, warnings } = validateAllFields();
        if (!allValid) { showWarningToast(warnings); return; }

        loader.classList.remove('hidden');
        if (resultContainer) resultContainer.classList.add('hidden');
        if (resultIdle)      resultIdle.classList.add('hidden');
        if (barFill)         barFill.style.width = '0%';

        const formData = new FormData(form);
        const data = {};
        formData.forEach((v, k) => { data[k] = v; });

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            setTimeout(() => {
                loader.classList.add('hidden');
                if (result.success) {
                    cropNameDisplay.innerText = result.prediction;
                    resultContainer.classList.remove('hidden');
                    updateCropIcon(result.prediction);
                    setTimeout(() => { if (barFill) barFill.style.width = '100%'; }, 100);
                    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    if (resultIdle) resultIdle.classList.remove('hidden');
                    alert('Analysis Error: ' + (result.error || 'System failed.'));
                }
            }, 1500);

        } catch (err) {
            loader.classList.add('hidden');
            if (resultIdle) resultIdle.classList.remove('hidden');
            console.error('Fetch Error:', err);
            alert('Network Error: Could not reach the analysis engine.');
        }
    });

    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            setTimeout(() => {
                document.querySelectorAll('.field-warning').forEach(w => w.remove());
                document.querySelectorAll('.warning-active').forEach(c => c.classList.remove('warning-active'));
                if (resultContainer) resultContainer.classList.add('hidden');
                if (resultIdle)      resultIdle.classList.remove('hidden');
                if (barFill)         barFill.style.width = '0%';
            }, 10);
        });
    }

    function showWarningToast(warnings) {
        const existing = document.querySelector('.warning-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'warning-toast';
        toast.innerHTML = `
            <div class="toast-header">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Input Validation Warning</span>
                <button class="toast-close" onclick="this.closest('.warning-toast').remove()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="toast-body">
                ${warnings.map(w => `<div class="toast-item"><i class="fa-solid fa-circle-info"></i> ${w}</div>`).join('')}
            </div>
            <div class="toast-footer">Please adjust the highlighted fields before analysing.</div>
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('toast-visible'));
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 400);
        }, 6000);
    }

    function updateCropIcon(crop) {
        const iconBox = document.getElementById('resultIcon');
        if (!iconBox) return;
        const icons = {
            'rice': 'fa-bowl-rice', 'maize': 'fa-wheat-awn', 'chickpea': 'fa-seedling',
            'kidneybeans': 'fa-bong', 'pigeonpeas': 'fa-clover', 'mothbeans': 'fa-bug',
            'mungbean': 'fa-leaf', 'blackgram': 'fa-circle-nodes', 'lentil': 'fa-plate-wheat',
            'pomegranate': 'fa-apple-whole', 'banana': 'fa-lemon', 'mango': 'fa-tree',
            'grapes': 'fa-wine-glass', 'watermelon': 'fa-cloud', 'muskmelon': 'fa-sun',
            'apple': 'fa-apple-whole', 'orange': 'fa-clover', 'papaya': 'fa-tree',
            'coconut': 'fa-circle-half-stroke', 'cotton': 'fa-shirt', 'jute': 'fa-scroll',
            'coffee': 'fa-mug-hot'
        };
        const cls = icons[crop.toLowerCase()] || 'fa-seedling';
        iconBox.innerHTML = `<i class="fa-solid ${cls}"></i>`;
    }

    // Magnetic button
    const btn = document.querySelector('.magnetic-btn');
    if (btn) {
        btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            const x = e.clientX - r.left - r.width / 2;
            const y = e.clientY - r.top  - r.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.4}px) scale(1.05)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0,0) scale(1)';
        });
    }
});
