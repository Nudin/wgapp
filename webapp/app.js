const apiBaseUrl = 'http://127.0.0.1:8000';  // Adjust the base URL as necessary

// DOM Elements
const todoList = document.getElementById('todoList');
const logList = document.getElementById('logList');
const addTodoForm = document.getElementById('addTodoForm');

// Fetch Todos from API and display them
async function fetchTodos() {
    const response = await fetch(`${apiBaseUrl}/todos/`);
    const todos = await response.json();
    const todoList = document.getElementById("todoList");
    todoList.innerHTML = ""; // Clear existing list

    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    todos.forEach(todo => {
        const todoItem = document.createElement('li');
        todoItem.innerHTML = `
            <div>
                <strong>${todo.name}</strong><br>
                ${todo.description}
            </div>
            <div class="duedate ${todo.next_due_date <= today ? 'overdue' : ''}">
                ${new Date(todo.next_due_date).toLocaleDateString()}
            </div>
            <div>
                <button onclick="markTodoDone(${todo.id})">✅ Done</button>
                <button onclick="markTodoDue(${todo.id})">🔥 Due now!</button>
                <button onclick="postponeTodo(${todo.id})">❎ Postpone</button>
                <button onclick='editTodoButton(${JSON.stringify(todo)})'>⚙️ Edit</button>
            </div>
        `;
        todoList.appendChild(todoItem);
    });
}

// Fetch Logs from API and display them
async function fetchLogs() {
    const response = await fetch(`${apiBaseUrl}/logs/`);
    const logs = await response.json();

    logList.innerHTML = '';
    logs.forEach(log => {
        const logItem = document.createElement('li');
        logItem.innerHTML = `
            <strong>${log.todo_name}</strong> - Completed by: <strong>${log.username}</strong> on ${log.done_date}
        `;
        logList.appendChild(logItem);
    });
}

// Mark a Todo as Done
async function markTodoDone(todoId) {
    const username = prompt("Enter your username to mark this task as done:");
    if (username) {
        await fetch(`${apiBaseUrl}/todos/${todoId}/done`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        fetchTodos();
        fetchLogs();
    }
}

// Postpone a Todo
async function postponeTodo(todoId) {
    const newDueDate = prompt("Please enter the new due date (YYYY-MM-DD):");

    if (newDueDate) {
        try {
            const response = await fetch(`/todos/${todoId}/postpone/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
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
    await fetch(`${apiBaseUrl}/todos/${todoId}/due`, { method: 'PUT' });
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
        headers: { 'Content-Type': 'application/json' },
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

    // Create an object to hold the updates
    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (frequency) updates.frequency = parseInt(frequency, 10);
    if (nextDueDate) updates.next_due_date = nextDueDate;

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

