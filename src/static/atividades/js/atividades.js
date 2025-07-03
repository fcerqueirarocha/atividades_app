import { API_BASE, showAlert, getAuthToken, logout } from '../../js/common.js';

// Elementos principais
const activitiesContainer = document.getElementById("activities-container");
const noActivitiesMessage = document.getElementById("no-activities");
const activityAlert = document.getElementById("activity-alert");
const newActivityForm = document.getElementById("new-activity-form");
const saveChangesBtn = document.getElementById("save-changes-btn");
const activitiesLoading = document.getElementById("activities-loading");
const pendingToggle = document.getElementById("pending-toggle");
const toggleLabel = document.getElementById("toggle-label");

// Elementos das estatísticas
const totalActivitiesSpan = document.getElementById("total-activities");
const pendingActivitiesSpan = document.getElementById("pending-activities");
const completedActivitiesSpan = document.getElementById("completed-activities");
const userWelcome = document.getElementById("user-welcome");

// Variáveis globais
let activities = [];
let isEditing = false;
let currentEditId = null;
let changesMade = false;

// Função para colorir atividade conforme data
function setActivityColor(activityElement, expectedDateStr) {
    if (!expectedDateStr) return;
    let expectedDate;
    if (expectedDateStr.includes('/')) {
        const [day, month, year] = expectedDateStr.split('/');
        expectedDate = new Date(`${year}-${month}-${day}`);
    } else {
        expectedDate = new Date(expectedDateStr);
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    expectedDate.setHours(0,0,0,0);

    if (expectedDate.getTime() === today.getTime()) {
        activityElement.style.backgroundColor = "#fff3cd";
    } else if (expectedDate < today) {
        activityElement.style.backgroundColor = "#f8d7da";
    } else {
        activityElement.style.backgroundColor = "";
    }
}

// Função para renderizar atividades (CORRIGIDA)
function renderActivities() {
    if (!activitiesContainer || !noActivitiesMessage) return;
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
        if (activity.expected_date) {
            setActivityColor(activityItem, activity.expected_date);
        }
        activitiesContainer.appendChild(activityItem);
    });

    // Adiciona listeners para os checkboxes (resto do código mantém...)
    document.querySelectorAll(".activity-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const activityId = event.target.dataset.id;
            const isChecked = event.target.checked;
            const activity = activities.find(a => a.id === activityId);
            if (activity) {
                activity.modified = true;
                activity.resolution_date = isChecked ? new Date().toISOString() : null;
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

// Função para carregar atividades
async function loadActivities() {
    if (activitiesLoading) activitiesLoading.classList.remove("hidden");
    if (activitiesContainer) activitiesContainer.innerHTML = "";
    if (noActivitiesMessage) noActivitiesMessage.classList.add("hidden");
    if (saveChangesBtn) saveChangesBtn.classList.add("hidden");
    changesMade = false;

    const token = getAuthToken();
    if (!token) {
        showAlert(activityAlert, "Token de acesso ausente. Faça login novamente.", "error");
        return;
    }

    const pending = pendingToggle ? pendingToggle.checked : false;
    if (toggleLabel) {
        toggleLabel.textContent = pending ? "Mostrar Pendentes" : "Mostrar Concluídas";
    }

    try {
        const response = await fetch(`${API_BASE}/activities?pending=${pending}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            activities = data.activities || [];
            renderActivities();
            loadStats(); // Carrega as estatísticas
        } else {
            showAlert(activityAlert, data.message || "Erro ao carregar atividades", "error");
        }
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    } finally {
        if (activitiesLoading) activitiesLoading.classList.add("hidden");
    }
}

// Função para carregar estatísticas
async function loadStats() {
    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE}/stats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Erro ao carregar estatísticas");
        const stats = await response.json();
        
        if (totalActivitiesSpan) totalActivitiesSpan.textContent = stats.total;
        if (pendingActivitiesSpan) pendingActivitiesSpan.textContent = stats.pending;
        if (completedActivitiesSpan) completedActivitiesSpan.textContent = stats.completed;
    } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
    }
}

// Função para atualizar boas-vindas
function updateUserWelcome() {
    const userName = localStorage.getItem("userName");
    if (userWelcome) {
        if (userName) {
            userWelcome.textContent = `Bem-vindo(a), ${userName}!`;
        } else {
            userWelcome.textContent = "Bem-vindo ao seu sistema de gerenciamento de tarefas";
        }
    }
}

// Função para adicionar/editar atividade (CORRIGIDA)
async function handleActivityForm(event) {
    event.preventDefault();
    const description = document.getElementById("activity-description").value;
    const expectedDateInput = document.getElementById("expected-date");
    let expected_date = expectedDateInput.value;
    const token = getAuthToken();

    if (!description) {
        showAlert(activityAlert, "Descrição obrigatória.", "error");
        return;
    }

    // Conversão de data corrigida
    if (expected_date) {
        const selectedDate = dayjs(expected_date, "YYYY-MM-DD").toDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showAlert(activityAlert, "A data de previsão não pode ser anterior à data atual.", "error");
            return;
        }

        // Converte para o formato DD/MM/YYYY que a API espera
        expected_date = `${selectedDate.getDate().toString().padStart(2, '0')}/${
            (selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${
            selectedDate.getFullYear()}`;
    }

    const payload = {
        description,
        expected_date: expected_date || null,
    };

    let url = `${API_BASE}/activities`;
    let method = "POST";
    if (isEditing && currentEditId) {
        url = `${API_BASE}/activities/${currentEditId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok) {
            showAlert(activityAlert, data.message || "Atividade salva com sucesso", "success");
            newActivityForm.reset();
            isEditing = false;
            currentEditId = null;
            document.getElementById("submit-btn").textContent = "Adicionar Atividade";
            await loadActivities();
        } else {
            showAlert(activityAlert, data.message || "Erro ao salvar atividade", "error");
        }
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
}

// Função para editar atividade (CORRIGIDA)
window.editActivity = function(id) {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    document.getElementById("activity-description").value = activity.description;
    document.getElementById("expected-date").value = activity.expected_date
        ? dayjs(activity.expected_date).format("YYYY-MM-DD")
        : "";
    document.getElementById("submit-btn").textContent = "Atualizar Atividade";
    isEditing = true;
    currentEditId = id;
};

// Função para deletar atividade
window.deleteActivity = async function(id) {
    const token = getAuthToken();
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;
    try {
        const response = await fetch(`${API_BASE}/activities/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            showAlert(activityAlert, data.message || "Atividade excluída", "success");
            await loadActivities();
        } else {
            showAlert(activityAlert, data.message || "Erro ao excluir atividade", "error");
        }
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
};

// Função para salvar alterações
async function saveChanges() {
    const token = getAuthToken();
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
                body: JSON.stringify({ completed }),
            });
            if (!response.ok) {
                const data = await response.json();
                showAlert(activityAlert, `Erro ao atualizar atividade: ${data.message}`, "error");
                return;
            }
        }
        showAlert(activityAlert, "Alterações salvas com sucesso!", "success");
        if (saveChangesBtn) saveChangesBtn.classList.add("hidden");
        changesMade = false;
        await loadActivities();
    } catch (error) {
        showAlert(activityAlert, `Erro de conexão: ${error.message || error}`, "error");
    }
}

// Função para mostrar botão de salvar
function showSaveChangesButton() {
    const hasModifiedActivities = activities.some(activity => activity.modified);
    if (hasModifiedActivities) {
        if (saveChangesBtn) saveChangesBtn.classList.remove("hidden");
        changesMade = true;
    } else {
        if (saveChangesBtn) saveChangesBtn.classList.add("hidden");
        changesMade = false;
    }
}

// Função para alternar visualização
function toggleActivityView() {
    loadActivities();
}

// Função para ordenar atividades
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
        if (direction === "asc") {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });
    renderActivities();
}

// Reconhecimento de voz para descrição da atividade
const micBtn = document.getElementById("mic-btn");
const activityDescriptionInput = document.getElementById("activity-description");
const isSpeechRecognitionSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

if (micBtn) {
    if (!isSpeechRecognitionSupported) {
        micBtn.style.display = "none";
    } else if (activityDescriptionInput) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "pt-BR";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        micBtn.addEventListener("click", () => {
            micBtn.disabled = true;
            micBtn.textContent = "🎙️";
            recognition.start();
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            activityDescriptionInput.value = transcript;
        };

        recognition.onend = () => {
            micBtn.disabled = false;
            micBtn.textContent = "🎤";
        };

        recognition.onerror = (event) => {
            alert("Erro ao captar voz: " + event.error);
            micBtn.disabled = false;
            micBtn.textContent = "🎤";
        };
    }
}

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    const token = getAuthToken();
    if (!token) {
        window.location.href = "/";
        return;
    }
    
    updateUserWelcome();
    await loadActivities();

    // Event listeners
    if (newActivityForm) {
        newActivityForm.addEventListener("submit", handleActivityForm);
    }
    
    if (pendingToggle) {
        pendingToggle.addEventListener("change", toggleActivityView);
    }
    
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener("click", saveChanges);
    }

    // Ordenação
    const sortSelect = document.getElementById("sort-select");
    const sortDirection = document.getElementById("sort-direction");

    function applySort() {
        const criteria = sortSelect ? sortSelect.value : "expected_date";
        const direction = sortDirection ? sortDirection.value : "asc";
        sortActivities(criteria, direction);
    }

    if (sortSelect) sortSelect.addEventListener("change", applySort);
    if (sortDirection) sortDirection.addEventListener("change", applySort);
    applySort();
});

// Torna as funções globais disponíveis
window.saveChanges = saveChanges;
window.toggleActivityView = toggleActivityView;