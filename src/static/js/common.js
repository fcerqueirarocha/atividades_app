//utilitários, autenticação, helpers usados em várias páginas
export const API_BASE = window.location.origin + "/api";

export function showAlert(element, message, type, autoHide = true) {
    if (element) {
        element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    }
    // Auto-hide para mensagens de sucesso
    console.log("autoHide: ", type === "success");
    if (autoHide && type === "success") {
        setTimeout(() => {
            const alertDiv = element.querySelector('.alert');
            if (alertDiv) {
                alertDiv.classList.add('fade-out');
                setTimeout(() => {
                    element.innerHTML = '';
                }, 500); // Espera a animação terminar
            }
        }, 2000); // Começa a desaparecer após 3 segundos
    }
}

export function getAuthToken() {
    return localStorage.getItem("authToken");
}

export function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    window.location.href = "/";
}

// Torna a função disponível globalmente para uso em onclick
window.logout = logout;