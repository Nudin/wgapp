const apiBaseUrl = 'http://127.0.0.1:8000';  // Adjust the base URL as necessary

// DOM Elements
const todoList = document.getElementById('todoList');
const logList = document.getElementById('logList');
const addTodoForm = document.getElementById('addTodoForm');

// Fetch Todos from API and display them
async function fetchTodos() {
    const response = await fetch(`${apiBaseUrl}/todos/`);
    const todos = await response.json();

    todoList.innerHTML = '';
    todos.forEach(todo => {
        const todoItem = document.createElement('li');
        todoItem.innerHTML = `
            <div>
                <strong>${todo.name}</strong> - Next Due: ${todo.next_due_date} <br>
                ${todo.description}
            </div>
            <div>
                <button onclick="markTodoDone(${todo.id})">Mark as Done</button>
                <button onclick="postponeTodo(${todo.id})">Postpone</button>
                <button onclick="markTodoDue(${todo.id})">Mark as Due</button>
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
            <strong>${log.todo_name}</strong> - Completed by: ${log.username} on ${log.done_date}
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
    await fetch(`${apiBaseUrl}/todos/${todoId}/postpone`, { method: 'PUT' });
    fetchTodos();
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