/**
 * TaskPro Elite Core v2.7
 * Features: True Kanban Board Engine, Portfolio-Grade Mission Cards
 */

const SOUNDS = {
    add: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    delete: "https://assets.mixkit.co/active_storage/sfx/256/256-preview.mp3",
    edit: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
    complete: "https://assets.mixkit.co/active_storage/sfx/1113/1113-preview.mp3",
    click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"
};

let currentEditIndex = null;
let currentFilter = 'all';
let performanceChart = null;

function playSound(type) {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.5;
    audio.play().catch((err) => {
   console.log(err);
});
}

// -----------------------
// TOAST SYSTEM
// -----------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// -----------------------
// INITIALIZATION
// -----------------------
function loadDashboard() {
    applySavedTheme();
    checkLogin();
    showTasks();
    initChart();
    
    // Global click listener
    document.addEventListener('click', (e) => {
        if (e.target.closest('button, .nav-item, .pill-elite')) playSound('click');
    });
}

function checkLogin() {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    document.getElementById("usernameDisplay").textContent = user.name;
    document.getElementById("userAvatar").src = `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`;
}

function toggleDarkMode() {
    const isLight = document.body.classList.toggle("light");
    const btn = document.querySelector('.btn-action:nth-child(2)');
    if (btn) btn.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("theme", isLight ? "light" : "dark");
}

function applySavedTheme() {
    const theme = localStorage.getItem("theme");
    if (theme === "light") {
        document.body.classList.add("light");
        const btn = document.querySelector('.btn-action:nth-child(2)');
        if (btn) btn.textContent = "☀️";
    }
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
}

// -----------------------
// NAVIGATION
// -----------------------
function switchSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(sectionId + 'Section').classList.add('active');
    document.getElementById('nav-' + sectionId).classList.add('active');
    
    showTasks();
    if (sectionId === 'overview') updateChart();
}

function toggleInput() {
    const el = document.getElementById("inputArea");
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
}

// -----------------------
// AI COPILOT
// -----------------------
function openAIChat() {
    document.getElementById("aiChatPanel").classList.add("open");
}

function closeAIChat() {
    document.getElementById("aiChatPanel").classList.remove("open");
}

function toggleAISettings() {
    const el = document.getElementById("aiSettings");
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

function saveApiKey() {
    const key = document.getElementById("geminiApiKey").value.trim();
    if (key) {
        localStorage.setItem("gemini_api_key", key);
        showToast("AI Key Saved", "success");
        toggleAISettings();
    }
}

async function sendChatToAI() {
    const input = document.getElementById("aiChatInput");
    const msg = input.value.trim();
    if (!msg) return;

    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        showToast("Please enter your Gemini API Key in settings (⚙️)", "warning");
        toggleAISettings();
        return;
    }

    appendChatMessage('user', msg);
    input.value = "";
    
    const typingIndicator = document.getElementById("aiTyping");
    typingIndicator.style.display = "block";

    try {
        const tasks = loadTasks();
        const user = JSON.parse(localStorage.getItem("currentUser"));
        
        // Contextual prompt construction
        const context = `
            You are a highly efficient productivity assistant called TaskPro Copilot.
            The user's name is ${user ? user.name : 'User'}.
            Current Missions on Board: ${JSON.stringify(tasks.map(t => ({ text: t.text, priority: t.priority, category: t.category, completed: t.completed }))) }
            User Message: "${msg}"
            Please provide a helpful, professional, and strategic response based on the current missions. Keep it concise (under 3 sentences unless asked for detail).
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || "Failed to connect to AI");
        }

        const aiText = data.candidates[0].content.parts[0].text;
        appendChatMessage('ai', aiText);
        playSound('add');

    } catch (error) {
        console.error("AI Error:", error);
        appendChatMessage('ai', "Error: I couldn't reach the intelligence core. Please check your API key and connection.");
        showToast("AI Connection Failed", "warning");
    } finally {
        typingIndicator.style.display = "none";
    }
}

function appendChatMessage(sender, text) {
    const container = document.getElementById("aiChatMessages");
    if (!container) return;
    const div = document.createElement("div");
    div.className = `chat-msg ${sender}`;
    div.innerHTML = text.replace(/\n/g, '<br>');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    
    const insightText = document.getElementById("aiInsightText");
    if (insightText && sender === 'ai') insightText.textContent = text.split('.')[0] + '.';
}

// -----------------------
// KANBAN ENGINE (THE UPGRADE)
// -----------------------
function addTask() {
    const textInput = document.getElementById("taskText");
    const text = textInput.value.trim();
    if (!text) return;

    const selectedDate = new Date(document.getElementById("taskDueDate").value);
const today = new Date();

today.setHours(0,0,0,0);

if(document.getElementById("taskDueDate").value && selectedDate < today){

    showToast("Please select a future date", "warning");

    return;
}

    const tasks = loadTasks();
    tasks.push({ 
        text, 
        dueDate: document.getElementById("taskDueDate").value || null,
        tag: document.getElementById("taskTag").value.trim() || null,
        category: document.getElementById("taskCategory").value, 
        priority: document.getElementById("taskPriority").value, 
        completed: false, 
        id: Date.now(), 
        createdDate: new Date().toLocaleDateString() 
    });
    saveTasks(tasks);

    textInput.value = "";
    document.getElementById("taskDueDate").value = "";
    document.getElementById("taskTag").value = "";
    
    playSound('add');
    showToast("Mission Deployed Successfully", "success");
    showTasks();
    toggleInput();
}

function toggleComplete(id) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completedDate = task.completed ? new Date().toLocaleDateString() : null;
        saveTasks(tasks);
        if (task.completed) {
            playSound('complete');
            showToast(`Mission "${task.text}" Solved`, "success");
        } else {
            showToast(`Mission "${task.text}" Reactivated`, "info");
        }
        showTasks();
        updateChart();
    }
}

function showTasks() {
    const tasks = loadTasks();
    const searchInput = document.getElementById("taskSearch");

const searchTerm = searchInput
    ? searchInput.value.toLowerCase()
    : "";
    
    const highList = document.getElementById("highPriorityList");
    const standardList = document.getElementById("standardPriorityList");
    const completedList = document.getElementById("completedList");

    if (!highList) return; // Not in missions section

    [highList, standardList, completedList].forEach(l => l.innerHTML = "");

    let counts = { high: 0, standard: 0, done: 0 };

    tasks.forEach((task) => {
        const matchesFilter = currentFilter === 'all' || task.category === currentFilter;
        const matchesSearch = task.text.toLowerCase().includes(searchTerm) || (task.tag && task.tag.toLowerCase().includes(searchTerm));
        if (!matchesFilter || !matchesSearch) return;

        const originalIndex = tasks.findIndex(t => t.id === task.id);
        const card = document.createElement("div");
        card.className = `task-card ${task.priority === 'High' ? 'high-p' : ''} ${task.completed ? 'done-p' : ''}`;
        card.draggable = true;
        card.dataset.id = task.id;
        
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('.column-tasks').forEach(c => c.classList.remove('drag-over'));
        });
        
        card.innerHTML = `
            <div class="card-title">
                <div class="task-check ${task.completed ? 'checked' : ''}" onclick="toggleComplete(${task.id})">
                    ${task.completed ? '✓' : ''}
                </div>
                <span class="card-text">${task.text}</span>
            </div>
            <div class="card-meta">
                <div class="meta-left">
                    <span class="badge">${task.category}</span>
                    ${task.tag ? `<span class="badge" style="color:#a855f7;">#${task.tag}</span>` : ''}
                    ${task.dueDate ? `<span class="due-alert">📅 ${task.dueDate}</span>` : ''}
                </div>
                <div class="card-actions">
                    <button class="btn-card-action" onclick="openEditModal(${originalIndex})" title="Edit Mission">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-card-action delete" onclick="deleteTask(${originalIndex})" title="Delete Mission">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;

        if (task.completed) {
            completedList.appendChild(card);
            counts.done++;
        } else if (task.priority === 'High') {
            highList.appendChild(card);
            counts.high++;
        } else {
            standardList.appendChild(card);
            counts.standard++;
        }
    });

    // Update UI Stats
    document.getElementById("criticalCount").textContent = counts.high;
    document.getElementById("activeCount").textContent = counts.high + counts.standard;
    document.getElementById("completedCount").textContent = counts.done;
    
    document.getElementById("highListCount").textContent = counts.high;
    document.getElementById("standardListCount").textContent = counts.standard;
    document.getElementById("doneListCount").textContent = counts.done;

    initDragAndDrop();
    updateStats(tasks);
}

if(counts.high === 0 && counts.standard === 0 && counts.done === 0){

    document.querySelector(".mission-board").innerHTML = `
        <div class="empty-state">
            <h2>No missions yet 🚀</h2>
            <p>Deploy your first mission to begin productivity.</p>
        </div>
    `;
}

function initDragAndDrop() {
    const columns = document.querySelectorAll('.column-tasks');
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });
        
        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });
        
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            const taskId = parseInt(e.dataTransfer.getData('text/plain'));
            const targetColumnId = column.id;
            handleTaskDrop(taskId, targetColumnId);
        });
    });
}

function handleTaskDrop(taskId, targetColumnId) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (targetColumnId === 'completedList') {
        task.completed = true;
        task.completedDate = new Date().toLocaleDateString();
    } else {
        task.completed = false;
        task.completedDate = null;
        task.priority = (targetColumnId === 'highPriorityList') ? 'High' : 'Medium';
    }

    saveTasks(tasks);
    playSound('edit');
    showToast(`Mission Position Updated`, "info");
    showTasks();
    updateChart();
}

function updateStats(tasks) {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const percentEl = document.getElementById("progressPercent");
    if (percentEl) percentEl.textContent = `${percent}%`;
    const bar = document.getElementById("progressBar");
    if (bar) bar.style.width = `${percent}%`;
}

// -----------------------
// ANALYTICS
// -----------------------
function initChart() {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Efficiency',
                data: [],
                borderColor: '#6366f1',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: '#a1a1aa', font: { size: 10 } } } }
        }
    });
    updateChart();
}

function updateChart() {
    if (!performanceChart) return;
    const tasks = loadTasks();
    const history = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        history[d.toLocaleDateString()] = 0;
    }
    tasks.forEach(t => { if (t.completed && t.completedDate && history[t.completedDate] !== undefined) history[t.completedDate]++; });
    performanceChart.data.labels = Object.keys(history).map(d => d.split('/')[0] + '/' + d.split('/')[1]);
    performanceChart.data.datasets[0].data = Object.values(history);
    performanceChart.update();
}

function exportTasks() {
    const tasks = loadTasks();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = "tasks_export.json"; a.click();
}

// -----------------------
// MODAL & UTILS
// -----------------------
function openEditModal(index) {
    const tasks = loadTasks();
    currentEditIndex = index;
    const t = tasks[index];
    document.getElementById("editTaskText").value = t.text;
    document.getElementById("editTaskDueDate").value = t.dueDate || "";
    document.getElementById("editTaskTag").value = t.tag || "";
    document.getElementById("editTaskCategory").value = t.category;
    document.getElementById("editTaskPriority").value = t.priority;
    document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("editModal").style.display = "none";
}

document.getElementById("saveEditBtn")?.addEventListener("click", () => {
    const tasks = loadTasks();
    tasks[currentEditIndex].text = document.getElementById("editTaskText").value;
    tasks[currentEditIndex].dueDate = document.getElementById("editTaskDueDate").value || null;
    tasks[currentEditIndex].tag = document.getElementById("editTaskTag").value.trim() || null;
    tasks[currentEditIndex].category = document.getElementById("editTaskCategory").value;
    tasks[currentEditIndex].priority = document.getElementById("editTaskPriority").value;
    saveTasks(tasks);
    playSound('edit');
    showToast("Mission Parameters Updated", "info");
    closeModal();
    showTasks();
});

    function deleteTask(idx) {

    const confirmDelete = confirm("Are you sure you want to delete this mission?");

    if(!confirmDelete) return;

    const tasks = loadTasks();

    tasks.splice(idx, 1);

    saveTasks(tasks);

    playSound('delete');

    showToast("Mission Terminated", "warning");

    showTasks();
}


function filterTasks(cat) {
    currentFilter = cat;
    document.querySelectorAll('.pill-elite').forEach(b => b.classList.toggle('active', b.textContent === cat || (cat==='all' && b.textContent==='All')));
    showTasks();
}