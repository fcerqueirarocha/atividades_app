import { API_BASE, showAlert } from '../../js/common.js';

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const registerAlert = document.getElementById("register-alert");

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const name = document.getElementById("register-name").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;

            try {
                const response = await fetch(`${API_BASE}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ full_name: name, email, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    showAlert(registerAlert, data.message || "Cadastro realizado com sucesso", "success");
                    registerForm.reset();
                    setTimeout(() => window.location.href = "../login.html", 2000);
                } else {
                    showAlert(registerAlert, data.message || "Erro ao registrar", "error");
                }
            } catch (error) {
                showAlert(registerAlert, `Erro de conexão: ${error.message || error}`, "error");
            }
        });
    }
});