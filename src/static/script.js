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

let isEditing = false;
let currentEditId = null;

// Funções de exibição de página
function showLogin() {
    clearAlerts();
}

function showRegister() {
    clearAlerts();
}

function showMainPage() {
    clearAlerts();
    loadActivities();
    updateUserWelcome();
}


function clearAlerts() {
    const alertIds = ["login-alert", "register-alert"];
    alertIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });
}

function showAlert(element, message, type) {
    if (element) {
        element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    }
}

// Funções de Autenticação
async function register(event) {
    event.preventDefault();

    const nameEl = document.getElementById("register-name");
    const emailEl = document.getElementById("register-email");
    const passwordEl = document.getElementById("register-password");
    const registerAlert = document.getElementById("register-alert");
    const registerForm = document.getElementById("register-form");
    
    console.log("LOG DA FUNCAO REGISTER: ", nameEl," : ", emailEl," : ", passwordEl," : ", registerAlert," : ", registerForm);

    if (nameEl && emailEl && passwordEl && registerAlert && registerForm) {
        const name = nameEl.value;
        const email = emailEl.value;
        const password = passwordEl.value;

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
                showAlert(registerAlert, data.message || "Cadastro realizado com sucesso", "success");
                registerForm.reset();
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2000);
            } else {
                showAlert(registerAlert, data.message || "Erro ao registrar", "error");
            }
        } catch (error) {
            showAlert(registerAlert, `Erro de conexão: ${error.message || error}`, "error");
        }
    }
}

async function login(event) {
    event.preventDefault();

    const emailEl = document.getElementById("login-email");
    const passwordEl = document.getElementById("login-password");
    const loginAlert = document.getElementById("login-alert");
    const loginForm = document.getElementById("login-form");

    if (emailEl && passwordEl && loginAlert && loginForm) {
        const email = emailEl.value;
        const password = passwordEl.value;

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
                localStorage.setItem("userName", data.user.full_name);
                showAlert(loginAlert, "Login realizado com sucesso", "success");
                loginForm.reset();
                setTimeout(() => {
                    window.location.href = "atividades.html";
                }, 1000);
            } else {
                showAlert(loginAlert, data.message || "Erro ao fazer login", "error");
            }
        } catch (error) {
            showAlert(loginAlert, `Erro de conexão: ${error.message || error}`, "error");
        }
    }
}

function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    showLogin();
    window.location.href = "login.html";
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
            //updateStats();
            loadStats();
        } else {
            showAlert(activityAlert, data.message || "Erro ao carregar atividades", "error");
        }
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    } finally {
        activitiesLoading.classList.add("hidden");
    }
}
function editActivity(id) {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    document.getElementById("activity-description").value = activity.description;
    document.getElementById("expected-date").value = activity.expected_date
        ? dayjs(activity.expected_date).format("YYYY-MM-DD")
        : "";

    document.getElementById("submit-btn").textContent = "Atualizar Atividade";
    isEditing = true;
    currentEditId = id;
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
            <span class="activity-date">${activity.expected_date ? `Prevista para: ${dayjs(activity.expected_date).format("DD/MM/YYYY")}` : "Sem data prevista"}</span>
            <span class="activity-date">${activity.resolution_date ? `Concluída em: ${new Date(activity.resolution_date).toLocaleString()}` : `Pendente desde: ${new Date(activity.created_at).toLocaleString()}`}</span>
            <div class="activity-actions">
                <button class="btn btn-primary btn-small" onclick="editActivity('${activity.id}')">✏️</button>
                <button class="btn btn-primary btn-small" onclick="deleteActivity('${activity.id}')" title="Excluir atividade">🗑️</button>
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

function parseDateBR(dateStr) {
    // Converte "DD/MM/YYYY" para "YYYY-MM-DD"
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`);
}

function sortActivities(criteria, direction = "asc") {
    activities.sort((a, b) => {
        let dateA, dateB;
        if (criteria === "expected_date") {
            if (!a.expected_date) return 1;
            if (!b.expected_date) return -1;
            dateA = new Date(a.expected_date);
            dateB = new Date(b.expected_date);
        } else if (criteria === "created_at") {
            if (!a.created_at) return 1;
            if (!b.created_at) return -1;
            dateA = new Date(a.created_at); 
            dateB = new Date(b.created_at);
        } else {
            return 0;
        }

        console.log("dateA: ", dateA, "|", "dateB: ", dateB, "|", "criteria: ", criteria, "|", "direction: ", direction);

        if (direction === "asc") {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });
    renderActivities();
}

async function handleActivityForm(event) {
    event.preventDefault();
    const description = document.getElementById("activity-description").value;
    const expectedDateInput = document.getElementById("expected-date");
    let expected_date = expectedDateInput.value;

    const token = getAuthToken();
    if (!token) {
        showAlert(activityAlert, "Token de acesso ausente. Faça login novamente.", "error");
        showLogin();
        return;
    }

    if (expected_date) {
        const selectedDate = dayjs(expected_date, "YYYY-MM-DD").toDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showAlert(activityAlert, "A data de previsão não pode ser anterior à data atual.", "error");
            return;
        }

        expected_date = `${selectedDate.getDate().toString().padStart(2, '0')}/${
            (selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${
            selectedDate.getFullYear()}`;
    }

    const payload = { description, expected_date };

    try {
        const url = isEditing
            ? `${API_BASE}/activities/${currentEditId}`
            : `${API_BASE}/activities`;
        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(activityAlert, data.message, "success");
            newActivityForm.reset();
            loadActivities();
            document.getElementById("submit-btn").textContent = "Adicionar Atividade";
            isEditing = false;
            currentEditId = null;
        } else {
            showAlert(activityAlert, data.message || "Erro ao salvar atividade", "error");
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

function updateUserWelcome() {
    const userName = localStorage.getItem("userName");
    if (userName) {
        userWelcome.textContent = `Bem-vindo(a), ${userName}!`;
    } else {
        userWelcome.textContent = "Bem-vindo ao seu sistema de gerenciamento de tarefas";
    }
}

async function loadStats() {
    const token = getAuthToken();

    try {
        const response = await fetch(`${API_BASE}/stats`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Erro ao carregar estatísticas");

        const stats = await response.json();

        document.getElementById("total-activities").textContent = stats.total;
        document.getElementById("pending-activities").textContent = stats.pending;
        document.getElementById("completed-activities").textContent = stats.completed;

    } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
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


document.addEventListener("DOMContentLoaded", function() {
    //const passwordInput = document.getElementById("login-password");
    /*if (passwordInput) {
        // Cria o botão do olho
        const eyeBtn = document.createElement("span");
        eyeBtn.textContent = "👁️";
        eyeBtn.style.cursor = "pointer";
        eyeBtn.style.position = "absolute";
        eyeBtn.style.right = "10px";
        eyeBtn.style.top = "50%";
        eyeBtn.style.transform = "translateY(-50%)";
        eyeBtn.id = "toggle-password";

        // Encontra o form-group da senha e posiciona o olho
        const formGroup = passwordInput.parentElement;
        formGroup.style.position = "relative";
        formGroup.appendChild(eyeBtn);

        eyeBtn.addEventListener("click", function() {
            const type = passwordInput.type === "password" ? "text" : "password";
            passwordInput.type = type;
            eyeBtn.textContent = type === "password" ? "👁️" : "🙈";
        });
    }*/
    const passwordInput = document.getElementById("login-password");
    const eyeBtn = document.getElementById("toggle-password");
    if (passwordInput && eyeBtn) {
        eyeBtn.addEventListener("click", function() {
            const type = passwordInput.type === "password" ? "text" : "password";
            passwordInput.type = type;
            eyeBtn.textContent = type === "password" ? "👁️" : "🙈";
        });
    }


    const sortSelect = document.getElementById("sort-select");
    const sortDirection = document.getElementById("sort-direction");

    function applySort() {
        const criteria = sortSelect ? sortSelect.value : "expected_date";
        const direction = sortDirection ? sortDirection.value : "asc";
        sortActivities(criteria, direction);
    }

    if (sortSelect) sortSelect.addEventListener("change", applySort);
    if (sortDirection) sortDirection.addEventListener("change", applySort);

    // Ordena inicialmente pelo critério e direção selecionados
    applySort();
});


if (loginForm) {
    loginForm.addEventListener("submit", login);
}

if (registerForm) {
    registerForm.addEventListener("submit", register);
}

if (newActivityForm) {
    newActivityForm.addEventListener("submit", handleActivityForm);
}