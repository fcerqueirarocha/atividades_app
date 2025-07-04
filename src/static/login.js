import { API_BASE, showAlert, getAuthToken } from './js/common.js';

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("login-form");
    const loginAlert = document.getElementById("login-alert");
    const loginLoading = document.getElementById("login-loading");

    // Validação de token para redirecionamento

    const token = getAuthToken();
    console.log("Token de autenticação:", token);
    if (token) {
        try {
            console.log(`${API_BASE}/stats`);
            const response = await fetch(`${API_BASE}/stats`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            console.log("response: ", response);
            if (response.ok) {
                window.location.href = "atividades/atividades.html";
                return;
            } else {
                localStorage.removeItem("authToken");
                localStorage.removeItem("userName");
            }
        } catch {
            localStorage.removeItem("authToken");
            localStorage.removeItem("userName");
        }
    }
    console.log("loginForm: ", loginForm);
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            if (loginLoading) loginLoading.classList.remove("hidden");
            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem("authToken", data.access_token);
                    localStorage.setItem("userName", data.user.full_name);
                    showAlert(loginAlert, "Login realizado com sucesso", "success");
                    loginForm.reset();
                    
                    console.log("Redirecionando para atividades...");
                    setTimeout(() => window.location.href = "atividades/atividades.html", 1000);
                } else {
                    showAlert(loginAlert, data.message || "Erro ao fazer login", "error");
                }
            } catch (error) {
                showAlert(loginAlert, `Erro de conexão: ${error.message || error}`, "error");
            } finally {
                if (loginLoading) loginLoading.classList.add("hidden");
            }
        });
    }

    // Toggle de visibilidade da senha
    const passwordInput = document.getElementById("login-password");
    const eyeBtn = document.getElementById("toggle-password");
    if (passwordInput && eyeBtn) {
        eyeBtn.addEventListener("click", function() {
            const type = passwordInput.type === "password" ? "text" : "password";
            passwordInput.type = type;
            
            // Alterna entre os ícones do Font Awesome
            if (type === "password") {
                eyeBtn.classList.remove("fa-eye-slash");
                eyeBtn.classList.add("fa-eye");
            } else {
                eyeBtn.classList.remove("fa-eye");
                eyeBtn.classList.add("fa-eye-slash");
            }
        });
    }
});