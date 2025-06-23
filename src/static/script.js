// Configuração da API
const API_BASE = window.location.origin + "/api";

// Elementos do DOM
const loginPage = document.getElementById("login-page");
const registerPage = document.getElementById("register-page");
const mainPage = document.getElementById("main-page");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const newActivityForm = document.getElementById("new-activity-form");

const loginAlert = document.getElementById("login-alert");
const registerAlert = document.getElementById("register-alert");
const activityAlert = document.getElementById("activity-alert");

const activitiesContainer = document.getElementById("activities-container");
const activitiesLoading = document.getElementById("activities-loading");
const noActivitiesMessage = document.getElementById("no-activities");
const saveChangesBtn = document.getElementById("save-changes-btn");
const pendingToggle = document.getElementById("pending-toggle");
const toggleLabel = document.getElementById("toggle-label");

const totalActivitiesSpan = document.getElementById("total-activities");
const pendingActivitiesSpan = document.getElementById("pending-activities");
const completedActivitiesSpan = document.getElementById("completed-activities");
const userWelcome = document.getElementById("user-welcome");

let activities = []; // Armazena as atividades carregadas
let changesMade = false; // Indica se há alterações pendentes para salvar

// Funções de exibição de página
function showLogin() {
    loginPage.classList.remove("hidden");
    registerPage.classList.add("hidden");
    mainPage.classList.add("hidden");
    clearAlerts();
}

function showRegister() {
    loginPage.classList.add("hidden");
    registerPage.classList.remove("hidden");
    mainPage.classList.add("hidden");
    clearAlerts();
}

function showMainPage() {
    loginPage.classList.add("hidden");
    registerPage.classList.add("hidden");
    mainPage.classList.remove("hidden");
    clearAlerts();
    loadActivities();
    updateUserWelcome();
}

function clearAlerts() {
    loginAlert.innerHTML = "";
    registerAlert.innerHTML = "";
    activityAlert.innerHTML = "";
}

function showAlert(element, message, type) {
    element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

// Funções de Autenticação
async function register(event) {
    event.preventDefault();
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ full_name: name, email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            showAlert(registerAlert, data.message, "success");
            registerForm.reset();
            setTimeout(showLogin, 2000);
        } else {
            showAlert(registerAlert, data.message || "Erro ao registrar", "error");
        }
    } catch (error) {
        showAlert(registerAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("authToken", data.access_token);
            localStorage.setItem("userName", data.user_name);
            showAlert(loginAlert, data.message, "success");
            loginForm.reset();
            showMainPage();
        } else {
            showAlert(loginAlert, data.message || "Erro ao fazer login", "error");
        }
    } catch (error) {
        showAlert(loginAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
}

function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    showLogin();
}

function getAuthToken() {
    return localStorage.getItem("authToken");
}

// Funções de Atividades
async function loadActivities() {
    activitiesLoading.classList.remove("hidden");
    activitiesContainer.innerHTML = "";
    noActivitiesMessage.classList.add("hidden");
    saveChangesBtn.classList.add("hidden");
    changesMade = false;

    const token = getAuthToken();
    if (!token) {
        showAlert(activityAlert, "Token de acesso ausente. Faça login novamente.", "error");
        showLogin();
        return;
    }

    const pending = pendingToggle.checked;
    toggleLabel.textContent = pending ? "Mostrar Pendentes" : "Mostrar Concluídas";

    try {
        const response = await fetch(`${API_BASE}/activities?pending=${pending}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            showAlert(activityAlert, "Sessão expirada ou token inválido. Faça login novamente.", "error");
            logout();
            return;
        }

        const data = await response.json();
        if (response.ok) {
            activities = data.activities; // Armazena as atividades carregadas
            renderActivities();
            updateStats();
        } else {
            showAlert(activityAlert, data.message || "Erro ao carregar atividades", "error");
        }
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    } finally {
        activitiesLoading.classList.add("hidden");
    }
}

function renderActivities() {
    activitiesContainer.innerHTML = "";
    if (activities.length === 0) {
        noActivitiesMessage.classList.remove("hidden");
        return;
    }
    noActivitiesMessage.classList.add("hidden");

    activities.forEach(activity => {
        const activityItem = document.createElement("div");
        activityItem.classList.add("activity-item");
        if (activity.resolution_date) {
            activityItem.classList.add("completed");
        }

        activityItem.innerHTML = `
            <input type="checkbox" class="activity-checkbox" data-id="${activity.id}" ${activity.resolution_date ? "checked" : ""}>
            <span class="activity-description">${activity.description}</span>
            <span class="activity-date">${activity.resolution_date ? `Concluída em: ${new Date(activity.resolution_date).toLocaleString()}` : "Pendente"}</span>
            <div class="activity-actions">
                <button class="btn btn-danger btn-small" onclick="deleteActivity(\'${activity.id}\')">Excluir</button>
            </div>
        `;
        activitiesContainer.appendChild(activityItem);
    });

    // Adiciona listeners para os checkboxes
    document.querySelectorAll(".activity-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const activityId = event.target.dataset.id;
            const isChecked = event.target.checked;
            const activity = activities.find(a => a.id === activityId);
            if (activity) {
                // Marca a atividade como modificada localmente
                activity.modified = true;
                // Atualiza o resolution_date baseado no checkbox
                activity.resolution_date = isChecked ? new Date().toISOString() : null;
                
                // Atualiza a classe CSS do item para refletir o estado
                const activityItem = event.target.closest(".activity-item");
                if (isChecked) {
                    activityItem.classList.add("completed");
                } else {
                    activityItem.classList.remove("completed");
                }
            }
            showSaveChangesButton();
        });
    });
}

async function addActivity(event) {
    event.preventDefault();
    const description = document.getElementById("activity-description").value;

    const token = getAuthToken();
    if (!token) {
        showAlert(activityAlert, "Token de acesso ausente. Faça login novamente.", "error");
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/activities`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ description }),
        });

        if (response.status === 401) {
            showAlert(activityAlert, "Sessão expirada ou token inválido. Faça login novamente.", "error");
            logout();
            return;
        }

        const data = await response.json();
        if (response.ok) {
            showAlert(activityAlert, data.message, "success");
            newActivityForm.reset();
            loadActivities(); // Recarrega a lista de atividades
        } else {
            showAlert(activityAlert, data.message || "Erro ao criar atividade", "error");
        }
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
}

async function deleteActivity(id) {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) {
        return;
    }

    const token = getAuthToken();
    if (!token) {
        showAlert(activityAlert, "Token de acesso ausente. Faça login novamente.", "error");
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/activities/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            showAlert(activityAlert, "Sessão expirada ou token inválido. Faça login novamente.", "error");
            logout();
            return;
        }

        if (response.ok) {
            showAlert(activityAlert, "Atividade excluída com sucesso!", "success");
            loadActivities(); // Recarrega a lista de atividades
        } else {
            const data = await response.json();
            showAlert(activityAlert, data.message || "Erro ao excluir atividade", "error");
        }
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
}

async function saveChanges() {
    const token = getAuthToken();
    if (!token) {
        showAlert(activityAlert, "Token de acesso ausente. Faça login novamente.", "error");
        showLogin();
        return;
    }

    const activitiesToUpdate = activities.filter(activity => activity.modified);

    if (activitiesToUpdate.length === 0) {
        showAlert(activityAlert, "Nenhuma alteração para salvar.", "info");
        return;
    }

    try {
        for (const activity of activitiesToUpdate) {
            const checkbox = document.querySelector(`input[data-id="${activity.id}"]`);
            const completed = checkbox && checkbox.checked;

            const response = await fetch(`${API_BASE}/activities/${activity.id}/toggle`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    completed: completed,
                }),
            });

            if (response.status === 401) {
                showAlert(activityAlert, "Sessão expirada ou token inválido. Faça login novamente.", "error");
                logout();
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                showAlert(activityAlert, `Erro ao atualizar atividade ${activity.description}: ${data.message || "Erro desconhecido"}`, "error");
                return; // Para de salvar se um erro ocorrer
            }
        }
        showAlert(activityAlert, "Alterações salvas com sucesso!", "success");
        saveChangesBtn.classList.add("hidden");
        changesMade = false;
        loadActivities(); // Recarrega para refletir as datas de resolução
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
}

function showSaveChangesButton() {
    // Verifica se há alguma atividade com a flag 'modified' true
    const hasModifiedActivities = activities.some(activity => activity.modified);
    if (hasModifiedActivities) {
        saveChangesBtn.classList.remove("hidden");
        changesMade = true;
    } else {
        saveChangesBtn.classList.add("hidden");
        changesMade = false;
    }
}

function toggleActivityView() {
    loadActivities();
}

function updateStats() {
    const total = activities.length;
    const pending = activities.filter(a => !a.resolution_date).length;
    const completed = total - pending;

    totalActivitiesSpan.textContent = total;
    pendingActivitiesSpan.textContent = pending;
    completedActivitiesSpan.textContent = completed;
}

function updateUserWelcome() {
    const userName = localStorage.getItem("userName");
    if (userName) {
        userWelcome.textContent = `Bem-vindo(a), ${userName}!`;
    } else {
        userWelcome.textContent = "Bem-vindo ao seu sistema de gerenciamento de tarefas";
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    if (getAuthToken()) {
        showMainPage();
    } else {
        showLogin();
    }
});

loginForm.addEventListener("submit", login);
registerForm.addEventListener("submit", register);
newActivityForm.addEventListener("submit", addActivity);