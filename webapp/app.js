const apiBaseUrl = '';  // Adjust the base URL as necessary

// DOM Elements
const todoList = document.getElementById('todoList');
const logList = document.getElementById('logList');
const addTodoForm = document.getElementById('addTodoForm');
const authSection = document.getElementById('auth-section');
const mainContent = document.getElementById('main-content');
const errorMessageElement = document.getElementById('error-message');

// Check if the user is logged in (by looking for a token)
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        // User is logged in
        authSection.style.display = 'none';
        mainContent.style.display = 'block';
        fetchTodos();
        fetchLogs();
    } else {
        // User is not logged in
        authSection.style.display = 'block';
        mainContent.style.display = 'none';
    }
}

async function get(url) {
    const response = await fetch(`${apiBaseUrl}/${url}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    if (response.status === 401) {
        console.log("Token invalid")
        localStorage.removeItem('token');
        checkAuth();
        return {};
    }
    return response.json();
}
async function put(url, data) {
    const response = await fetch(`${apiBaseUrl}/${url}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    return await response.json();
}
async function post(url, data) {
    const response = await fetch(`${apiBaseUrl}/${url}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        let err = new Error("Network response was not ok");
        err._data = response.json();
        throw err;
    }

    return await response.json();
}

// Fetch Todos from API and display them
async function fetchTodos() {
    const todos = await get('todos/')
    const todoList = document.getElementById("todoList");
    todoList.innerHTML = "";

    todos.forEach(todo => {
        const todoItem = document.createElement('li');
        const dueDate = new Date(todo.next_due_date).toLocaleDateString();
        const dueClass = todo.due ? 'overdue' : '';
        todoItem._data = todo;
        todoItem.innerHTML = `
            <div>
                <strong>${todo.name}</strong><br>
            ${todo.description} <em>(every ${todo.frequency} days)</em>
            </div>
            <div class="duedate ${dueClass}">
                ${new Date(todo.next_due_date).toLocaleDateString()}
            </div>
            <div>
                <button onclick="markTodoDone(${todo.id})">✅ Done</button>
                ${!todo.due ? `<button onclick="markTodoDue(${todo.id})">🔥 Due now!</button>` : ''}
                ${todo.due ? `<button onclick="postponeTodo(${todo.id})">❎ Postpone</button>` : ''}
                <!-- Dropdown container -->
                <div class="dropdown">
                  <button class="dropdown-toggle" onclick="toggleDropdown(this)">…</button>

                  <!-- Dropdown menu -->
                  <div class="dropdown-menu">
                    <button onclick='editTodoButton(event)'>✏️ Edit Task</button>
                    <button onclick='showDetails(event)'>🧾 Show logs</button>
                    <button onclick="markTodoDoneByGuest(${todo.id})">✅ Done by guest</button>
                  </div>
                </div>
            </div>
        `;
        todoList.appendChild(todoItem);
    });
}

// Fetch Logs from API and display them
async function fetchLogs() {
    try {
        const logs = await get('logs/');
        const logList = document.getElementById('log-list');

        logList.innerHTML = '';
        logs.forEach(log => {
            const logItem = document.createElement('li');
            const completionDate = new Date(log.done_date).toLocaleDateString();

            logItem.innerHTML = `
                <strong>${log.todo_name}</strong> <span>Completed by: <strong>${log.username}</strong></span> on ${log.done_date}
            `;

            logList.appendChild(logItem);
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

// Function to fetch statistics and display them
async function fetchStatistics() {
    try {
        const stats = await get('stats');
        const statsSection = document.getElementById('stats-section');
        statsSection.innerHTML = '';  // Clear any previous content

        stats["user_stats"].forEach(stat => {
            const statItem = document.createElement('li');
            statItem.innerHTML = `<strong>${stat.username}</strong>: ${stat.task_count} tasks completed`;
            statsSection.appendChild(statItem);
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
    }
}

function fetchAll() {
    fetchTodos();
    fetchLogs();
    fetchStatistics();
}

// Mark a Todo as Done
async function markTodoDone(todoId) {
    await put(`todos/${todoId}/done`, {});
    fetchAll();
}
async function markTodoDoneByGuest(todoId) {
    const username = prompt("Please enter username")
    await put(`todos/${todoId}/done`, {"username": username});
    fetchAll();
}

// Postpone a Todo
async function postponeTodo(todoId) {
    const newDueDate = prompt("Please enter the new due date (YYYY-MM-DD):",
                              new Date().toISOString().split('T')[0]);

    if (newDueDate) {
        try {
            await post(`todos/${todoId}/postpone/`, { new_due_date: newDueDate });
            fetchTodos(); // Refresh the todo list after postponing
        } catch (error) {
            alert("Failed to postpone todo. Please try again." + error);
        }
    }
}


// Mark a Todo as Due Today
async function markTodoDue(todoId) {
    await put(`todos/${todoId}/due`, null);
    fetchTodos();
}

// Add a new Todo
addTodoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newTodo = {
        name: document.getElementById('todoName').value,
        description: document.getElementById('todoDescription').value,
        frequency: document.getElementById('todoFrequency').value,
        next_due_date: document.getElementById('todoNextDueDate').value
    };

    await post(`todos/`, newTodo);

    // Clear form and refresh todos
    addTodoForm.reset();
    fetchTodos();
});

// Initial Fetch of Todos and Logs
fetchAll();

// Tab Management
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

let currentTodoId = null; // Variable to hold the current todo ID being edited


// Function to open/close a modal
function openModal(modalName) {
    document.getElementById(modalName).style.display = 'block';
}
function closeModal(modalName) {
    document.getElementById(modalName).style.display = 'none';
}

async function showDetails(event) {
    todo = event.target.closest("li")._data
    const logs = await get("logs/" + todo.id)
    const stats = await get("stats/" + todo.id)
    const content = document.querySelector('#detailsModal .content');
    content.innerHTML = '';

    // Create containers for stats and logs
    const statsContainer = document.createElement('div');
    const logsContainer = document.createElement('div');

    // Append the containers to logList
    content.appendChild(statsContainer);
    content.appendChild(logsContainer);

    stats["user_stats"].forEach(stat => {
        const statItem = document.createElement('li');
        statItem.innerHTML = `<strong>${stat.username}</strong>: ${stat.task_count} tasks completed`;
        statsContainer.appendChild(statItem);
    });
    logs.forEach(log => {
        const logItem = document.createElement('li');
        const completionDate = new Date(log.done_date).toLocaleDateString();

        logItem.innerHTML = `${log.done_date}:&nbsp;<strong>${log.username}</strong>`;

        logsContainer.appendChild(logItem);
    });

    openModal('detailsModal');
}

// Function to open the modal with the current todo's data
function openEditModal(todoId, name, description, frequency, nextDueDate) {
    currentTodoId = todoId; // Set the current todo ID
    document.getElementById('editName').value = name;
    document.getElementById('editDescription').value = description;
    document.getElementById('editFrequency').value = frequency;
    document.getElementById('editDueDate').value = nextDueDate;
    openModal('editModal')
}

// Function to submit the edited todo
async function submitEditTodo() {
    const name = document.getElementById('editName').value;
    const description = document.getElementById('editDescription').value;
    const frequency = document.getElementById('editFrequency').value;
    const nextDueDate = document.getElementById('editDueDate').value;
    const archived = document.getElementById('editArchived').checked;

    // Create an object to hold the updates
    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (frequency) updates.frequency = parseInt(frequency, 10);
    if (nextDueDate) updates.next_due_date = nextDueDate;
    updates.archived = archived;

    try {
        await put(`todos/${currentTodoId}/`, updates);
        closeModal('editModal');
        fetchTodos(); // Refresh the todo list after updating
    } catch (error) {
        alert("Failed to update todo. Please try again. " + error);
    }
}

// Function to open the edit modal when the "Edit" button is clicked
function editTodoButton(event) {
    todo = event.target.closest("li")._data
    openEditModal(todo.id, todo.name, todo.description, todo.frequency, todo.next_due_date);
}

// Handle User Registration
document.getElementById('register-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    try {
        const result = await post(`register`, { username, password });
        console.log('User registered:', result);
        showError(''); // Clear any previous error
        // TODO: Log the user in or show success
    } catch (error) {
        const reason = error._data || "Unknown error";
        showError(`Registration failed: ${error._data}`);
    }
});

// Handle User Login
document.getElementById('login-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${apiBaseUrl}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });

        if (!response.ok) {
            const errorData = await response.json();
            showError(`Login failed: ${errorData.detail || 'Incorrect username or password'}`);
        } else {
            const result = await response.json();
            console.log('Logged in:', result);

            // Store the access token in localStorage
            localStorage.setItem('token', result.access_token);

            showError(''); // Clear any previous error
            checkAuth();   // Proceed to the main content
        }
    } catch (error) {
        showError('Login failed: Unable to connect to the server.');
    }
});

// Function to display error messages
function showError(message) {
    if (message) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    } else {
        errorMessageElement.style.display = 'none'; // Hide if no error
    }
}

function toggleDropdown(element) {
  const dropdownMenu = element.nextElementSibling;
  dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
}

// Close the dropdown when clicking outside of it
window.addEventListener('click', function(event) {
  if (!event.target.matches('.dropdown-toggle')) {
    const dropdowns = document.getElementsByClassName('dropdown-menu');
    for (let i = 0; i < dropdowns.length; i++) {
      const openDropdown = dropdowns[i];
      if (openDropdown.style.display === 'block') {
        openDropdown.style.display = 'none';
      }
    }
  }
});

// Close Popup if escape key is pressed
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' || event.keyCode === 27) {
    // Todo: generalize
    closeModal('editModal')
    closeModal('detailsModal')
  }
});

// Function to initialize the page
window.onload = function () {
    checkAuth();
};
