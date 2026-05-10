// Save all tasks
function saveTasks(tasks) {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Load all tasks
function loadTasks() {
    return JSON.parse(localStorage.getItem("tasks")) || [];
}