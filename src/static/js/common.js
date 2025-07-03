//utilitários, autenticação, helpers usados em várias páginas
export const API_BASE = window.location.origin + "/api";
console.log("common.js loaded", API_BASE);

export function showAlert(element, message, type) {
    if (element) {
        element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
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