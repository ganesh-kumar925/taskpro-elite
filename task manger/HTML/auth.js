// =======================
//  AUTH.JS (WORKING)
// =======================

// Load users from localStorage
function getUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}

// Save users
function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

// -----------------------
// SIGN UP
// -----------------------
if (document.getElementById("registerForm")) {
    document.getElementById("registerForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value.trim();

        let users = getUsers();

        // Check user exists
        if (users.some(u => u.email === email)) {
            alert("User already exists!");
            return;
        }

        users.push({ name, email, password });
        saveUsers(users);

        alert("Account Created Successfully!");
        window.location.href = "index.html"; // go to login
    });
}

// -----------------------
// LOGIN
// -----------------------
if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        let users = getUsers();
        let user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            alert("Invalid Email or Password!");
            return;
        }

        // Save current user
        localStorage.setItem("currentUser", JSON.stringify(user));

        window.location.href = "dashboard.html"; // redirect to dashboard
    });
}