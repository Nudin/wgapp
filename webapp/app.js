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

// Fetch Todos from API and display them
async function fetchTodos() {
    const response = await fetch(`${apiBaseUrl}/todos/`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    const todos = await response.json();
    const todoList = document.getElementById("todoList");
    todoList.innerHTML = ""; // Clear existing list

    todos.forEach(todo => {
        const todoItem = document.createElement('li');
        const dueDate = new Date(todo.next_due_date).toLocaleDateString();
        const dueClass = todo.due ? 'overdue' : '';
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
                <button onclick='editTodoButton(${JSON.stringify(todo)})'>⚙️ Edit</button>
            </div>
        `;
        todoList.appendChild(todoItem);
    });
}

// Fetch Logs from API and display them
async function fetchLogs() {
    try {
        const response = await fetch(`${apiBaseUrl}/logs/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.status === 401) {
            console.log("Token invalid")
            localStorage.removeItem('token');
            checkAuth();
            return;
        }
        const logs = await response.json();
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

        // After fetching logs, fetch the statistics
        await fetchStatistics();
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

// Function to fetch statistics and display them
async function fetchStatistics() {
    try {
        const response = await fetch(`${apiBaseUrl}/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const stats = await response.json();
        const statsSection = document.getElementById('stats-section');
        statsSection.innerHTML = '';  // Clear any previous content

        console.log(stats)
        stats["user_stats"].forEach(stat => {
            const statItem = document.createElement('li');
            statItem.innerHTML = `<strong>${stat.username}</strong>: ${stat.task_count} tasks completed`;
            statsSection.appendChild(statItem);
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
    }
}


// Mark a Todo as Done
async function markTodoDone(todoId) {
    await fetch(`${apiBaseUrl}/todos/${todoId}/done`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({}),
    });
    fetchTodos();
    fetchLogs();
}

// Postpone a Todo
async function postponeTodo(todoId) {
    const newDueDate = prompt("Please enter the new due date (YYYY-MM-DD):",
                              new Date().toISOString().split('T')[0]);

    if (newDueDate) {
        try {
            const response = await fetch(`${apiBaseUrl}/todos/${todoId}/postpone/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ new_due_date: newDueDate }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const result = await response.json();
            alert(result.message);
            fetchTodos(); // Refresh the todo list after postponing
        } catch (error) {
            console.error("Error postponing todo:", error);
            alert("Failed to postpone todo. Please try again.");
        }
    }
}


// Mark a Todo as Due Today
async function markTodoDue(todoId) {
    await fetch(`${apiBaseUrl}/todos/${todoId}/due`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
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

    await fetch(`${apiBaseUrl}/todos/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newTodo)
    });

    // Clear form and refresh todos
    addTodoForm.reset();
    fetchTodos();
});

// Initial Fetch of Todos and Logs
fetchTodos();
fetchLogs();

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

// Function to open the modal with the current todo's data
function openEditModal(todoId, name, description, frequency, nextDueDate) {
    currentTodoId = todoId; // Set the current todo ID
    
    // Populate the form with the current todo values
    document.getElementById('editName').value = name;
    document.getElementById('editDescription').value = description;
    document.getElementById('editFrequency').value = frequency;
    document.getElementById('editDueDate').value = nextDueDate;

    // Display the modal
    document.getElementById('editModal').style.display = 'block';
}

// Function to close the modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
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
        const response = await fetch(`/todos/${currentTodoId}/`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const result = await response.json();
        alert(result.message);
        closeModal(); // Close the modal after successful submission
        fetchTodos(); // Refresh the todo list after updating
    } catch (error) {
        console.error("Error updating todo:", error);
        alert("Failed to update todo. Please try again.");
    }
}

// Function to open the edit modal when the "Edit" button is clicked
function editTodoButton(todo) {
    openEditModal(todo.id, todo.name, todo.description, todo.frequency, todo.next_due_date);
}

// Handle User Registration
document.getElementById('register-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${apiBaseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            showError(`Registration failed: ${errorData.detail || 'Unknown error'}`);
        } else {
            const result = await response.json();
            console.log('User registered:', result);
            showError(''); // Clear any previous error
            // Optionally log the user in after registration
        }
    } catch (error) {
        showError('Registration failed: Unable to connect to the server.');
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

// Function to initialize the page
window.onload = function () {
    checkAuth();
};
