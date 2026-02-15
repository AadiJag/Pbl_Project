const form = document.getElementById('loginForm');
const email = document.getElementById('email');
const password = document.getElementById('password');
const togglePwd = document.getElementById('togglePwd');
const remember = document.getElementById('remember');
const errorEl = document.getElementById('error');
const successEl = document.getElementById('success');

// Toggle password visibility
togglePwd.addEventListener('click', () => {
    const isHidden = password.type === 'password';
    password.type = isHidden ? 'text' : 'password';
    togglePwd.innerHTML = isHidden ? '<i class=\"fa-regular fa-eye-slash\"></i>' : '<i class=\"fa-regular fa-eye\"></i>';
});

// Prefill remembered email if present
const remembered = localStorage.getItem('ecoHarvestRemember');
if (remembered) email.value = remembered;

// Save email if remember is checked
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (remember?.checked && email.value) {
            localStorage.setItem('ecoHarvestRemember', email.value.trim());
        } else {
            localStorage.removeItem('ecoHarvestRemember');
        }

        const emailVal = email?.value?.trim();
        const passVal = password?.value?.trim();
        if (!emailVal || !passVal) {
            if (errorEl) {
                errorEl.textContent = 'Please enter email and password.';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        const name = emailVal.split('@')[0] || 'Farmer';
        sessionStorage.setItem('ecoHarvestAuth', 'true');
        sessionStorage.setItem('ecoHarvestProfile', JSON.stringify({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            email: emailVal
        }));

        window.location.href = 'yield.html';
    });
}

// Surface server errors on static login.html (e.g., /login?error=...)
const params = new URLSearchParams(window.location.search);
const errorMsg = params.get('error');
if (errorEl && errorMsg) {
    errorEl.textContent = errorMsg;
    errorEl.classList.remove('hidden');
}
const successMsg = params.get('success');
if (successEl && successMsg) {
    successEl.textContent = successMsg;
    successEl.classList.remove('hidden');
}
