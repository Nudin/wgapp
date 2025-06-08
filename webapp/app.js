/* global localStorage */
// DOM Elements
const todoList = document.getElementById('todoList')
const addTodoForm = document.getElementById('addTodoForm')
const authSection = document.getElementById('auth-section')
const mainContent = document.getElementById('main-content')

function hide (element) {
  element.style.display = 'none'
  if (element.disabled !== undefined) {
    element.disabled = true
  }
}
function unhide (element) {
  element.style.display = 'unset'
  if (element.disabled !== undefined) {
    element.disabled = false
  }
}

function showEmoji (duration = 1000) {
  const emoji = document.getElementById('emoji')
  emoji.classList.add('visible')
  setTimeout(() => {
    emoji.classList.remove('visible')
  }, duration)
}

// API helper functions
class API {
  apiBaseUrl = '/api' // Adjust the base URL as necessary
  headers () {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }

  async login (username, password) {
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Incorrect username or password')
    }

    // Store the access token in localStorage
    const result = await response.json()
    console.log('Logged in:', result)
    localStorage.setItem('token', result.access_token)
  }

  async logout () {
    localStorage.removeItem('token')
    checkAuth()
  }

  async get (url) {
    const response = await fetch(`${this.apiBaseUrl}/${url}`, {
      headers: this.headers()
    })
    if (response.status === 401) {
      console.log('Token invalid')
      localStorage.removeItem('token')
      checkAuth()
      return {}
    }
    return response.json()
  }

  async put (url, data) {
    const response = await fetch(`${this.apiBaseUrl}/${url}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    return await response.json()
  }

  async post (url, data) {
    const response = await fetch(`${this.apiBaseUrl}/${url}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const err = new Error('Network response was not ok')
      err._data = response.json()
      throw err
    }

    return await response.json()
  }

  async delete (url) {
    const response = await fetch(`${this.apiBaseUrl}/${url}`, {
      method: 'DELETE',
      headers: this.headers()
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    return response.json()
  }
}
const api = new API()

function getActiveFilter (filter) {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(filter)
}

// Fetch Todos from API and display them
async function fetchTodos () {
  const archived = getActiveFilter('archived')
  let url = 'todos/'
  if (archived === 'true') {
    url += '?archived=true'
  }
  const todos = await api.get(url)
  const tag = getActiveFilter('tag')
  const typefilter = getActiveFilter('type')
  todoList.innerHTML = ''

  todos.forEach(todo => {
    const tagArray = todo.tags.split('+')
    if (tag && !tagArray.includes(tag)) {
      return
    }
    let type
    if (todo.frequency > 0) {
      type = 'repeating'
    } else if (todo.frequency === 0) {
      type = 'ondemand'
    } else {
      type = 'onetime'
    }
    if (typefilter && typefilter !== type) {
      return
    }

    const todoItem = document.createElement('li')
    const dueDate = new Date(todo.next_due_date).toLocaleDateString()
    const dueClass = todo.due ? 'overdue' : ''
    todoItem._data = todo
    const repeat = (type === 'repeating') ? `<em>(every ${todo.frequency} days)</em>` : ''
    todoItem.innerHTML = `
            <div class="todoContent">
                <strong>${todo.name}</strong><br>
            ${todo.description} ${repeat}
            </div>
            <div class="duedate ${dueClass}">
                ${type !== 'ondemand' ? dueDate : ''}
            </div>
            <div class="todoButtons">
                <button onclick="markTodoDone(${todo.id})">✅ Done</button>
                ${!todo.due && type !== 'ondemand' ? `<button onclick="markTodoDue(${todo.id})">🔥 Due now!</button>` : ''}
                ${todo.due && type !== 'ondemand' ? `<button onclick="postponeTodo(${todo.id})">❎ Postpone</button>` : ''}
                <!-- Dropdown container -->
                <div class="dropdown">
                  <button class="dropdown-toggle" onclick="toggleDropdown(this)">…</button>

                  <!-- Dropdown menu -->
                  <div class="dropdown-menu">
                    <button onclick='editTodoButton(event)'>✏️ Edit Task</button>
                    <button onclick='showDetails(event)'>🧾 Show logs</button>
                    <button onclick="markTodoDoneByGuest(${todo.id})">✅ Done by guest</button>
                    <button onclick='markTodoArchived(${todo.id})'>🗑 Archive</button>
                  </div>
                </div>
            </div>
        `
    todoList.appendChild(todoItem)
  })
}

// Fetch Logs from API and display them
async function fetchLogs () {
  try {
    const logs = await api.get('logs/')
    const logList = document.getElementById('log-list')

    logList.innerHTML = ''
    logs.forEach(log => {
      const logItem = document.createElement('li')
      const completionDate = new Date(log.done_date).toLocaleDateString()

      logItem.innerHTML = `
                <strong>${log.todo_name}</strong> <span>Completed by: <strong>${log.username}</strong></span> on ${completionDate}
            `

      logList.appendChild(logItem)
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
  }
}

// Function to fetch statistics and display them
async function fetchStatistics () {
  const endpoints = [
    { url: 'stats', sectionId: 'stats-section' },
    { url: `stats/monthly?month=${new Date().getMonth() + 1}`, sectionId: 'stats-section-current' },
    { url: `stats/monthly?month=${new Date().getMonth()}`, sectionId: 'stats-section-last' }
  ]

  for (const { url, sectionId } of endpoints) {
    try {
      const stats = await api.get(url)
      renderStatistics(stats.user_stats, sectionId)
    } catch (error) {
      console.error(`Error fetching statistics from ${url}:`, error)
    }
  }
}

function renderStatistics (userStats, sectionId) {
  const statsSection = document.getElementById(sectionId)
  if (!statsSection) return

  statsSection.innerHTML = '' // Clear previous content
  userStats.forEach(({ username, task_count }) => {
    const statItem = document.createElement('li')
    statItem.innerHTML = `<strong>${username}</strong>: ${task_count} tasks completed`
    statsSection.appendChild(statItem)
  })
}

async function fetchTags () {
  const logs = await api.get('tags')
  createTagButtons(logs)
  createTypeDropdown()
  createArchivedDropdown()
}

// Function to fetch and display shopping list
async function fetchShopping () {
  try {
    const shopping = await api.get('shopping')
    const shoppingSection = document.getElementById('shopping')
    shoppingSection.innerHTML = '' // Clear any previous content

    shopping.forEach(article => {
      const articleItem = document.createElement('li')
      articleItem.innerHTML = `<strong>${article.title}</strong><span>${article.description}</span><button onclick="shoppingDone(${article.id})">✅</button>`
      shoppingSection.appendChild(articleItem)
    })
  } catch (error) {
    console.error('Error fetching shopping list:', error)
  }
}

function fetchAll () {
  fetchTodos()
  fetchLogs()
  fetchStatistics()
  fetchTags()
  fetchShopping()
}

/** * Todo core functions ***/

// Mark a Todo as Done
async function markTodoDone (todoId) {
  await api.put(`todos/${todoId}/done`, {})
  fetchAll()
  showEmoji(300)
}
async function markTodoDoneByGuest (todoId) {
  const username = window.prompt('Please enter username')
  await api.put(`todos/${todoId}/done`, { username })
  fetchAll()
  showEmoji(300)
}

// Postpone a Todo
async function postponeTodo (todoId) {
  openPostponeModal(todoId)
}

async function markTodoArchived (todoId) {
  await api.put(`todos/${todoId}/`, { archived: true })
  fetchAll()
}

async function markTodoDue (todoId) {
  await api.put(`todos/${todoId}/due`, null)
  fetchTodos()
}

// Add a new Todo
async function addNewTodo (e) {
  e.preventDefault()
  const newTodo = {
    name: document.getElementById('todoName').value,
    description: document.getElementById('todoDescription').value,
    tags: document.getElementById('todoTags').value,
    frequency: document.getElementById('todoFrequency').value,
    next_due_date: document.getElementById('todoNextDueDate').value
  }
  if (document.getElementById('radioOnetime').checked === true) {
    newTodo.frequency = -1
  } else if (document.getElementById('radioOnDemand').checked === true) {
    newTodo.frequency = 0
    newTodo.next_due_date = '1970-01-01'
  }

  await api.post('todos/', newTodo)

  // Clear form and refresh todos
  addTodoForm.reset()
  fetchTodos()
}
addTodoForm.addEventListener('submit', addNewTodo)

/** * Details and edit popup ***/

async function showDetails (event) {
  const todo = event.target.closest('li')._data
  const logs = await api.get('logs/' + todo.id)
  const stats = await api.get('stats/' + todo.id)
  const content = document.querySelector('#detailsModal .content')
  content.innerHTML = ''

  // Create containers for stats and logs
  const statsContainer = document.createElement('div')
  const logsContainer = document.createElement('div')

  // Append the containers to logList
  content.appendChild(statsContainer)
  content.appendChild(logsContainer)

  stats.user_stats.forEach(stat => {
    const statItem = document.createElement('li')
    statItem.innerHTML = `<strong>${stat.username}</strong>: ${stat.task_count} tasks completed`
    statsContainer.appendChild(statItem)
  })
  logs.forEach(log => {
    const logItem = document.createElement('li')
    const completionDate = new Date(log.done_date).toLocaleDateString()

    logItem.innerHTML = `${completionDate}:&nbsp;<strong>${log.username}</strong>`

    logsContainer.appendChild(logItem)
  })

  openModal('detailsModal')
}

// Function to open the modal with the current todo's data
function openEditModal (todoId, name, description, tags, frequency, nextDueDate, archived) {
  document.getElementById('editId').value = todoId
  document.getElementById('editName').value = name
  document.getElementById('editDescription').value = description
  document.getElementById('editTags').value = tags
  document.getElementById('editFrequency').value = frequency
  document.getElementById('editDueDate').value = nextDueDate
  document.getElementById('editArchived').checked = archived
  openModal('editModal')
}
document.getElementById('submitEditBtn').addEventListener('click', submitEditTodo)

function openPostponeModal (todoId) {
  // Utility to format a date as YYYY-MM-DD
  function formatDate (date) {
    return date.toISOString().split('T')[0]
  }

  // Set default and predefined dates
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const inTwoWeeks = new Date()
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14)

  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const dateInput = document.getElementById('postponeDateInput')

  // Initialize date input
  dateInput.value = formatDate(tomorrow)

  document.getElementById('btnTomorrow').addEventListener('click', () => {
    dateInput.value = formatDate(tomorrow)
  })

  document.getElementById('btnNextWeek').addEventListener('click', () => {
    dateInput.value = formatDate(nextWeek)
  })

  document.getElementById('btnInTwoWeeks').addEventListener('click', () => {
    dateInput.value = formatDate(inTwoWeeks)
  })

  document.getElementById('btnNextMonth').addEventListener('click', () => {
    dateInput.value = formatDate(nextMonth)
  })
  openModal('postponeModal')

  async function save () {
    const newDueDate = dateInput.value
    if (newDueDate) {
      try {
        await api.post(`todos/${todoId}/postpone/`, { new_due_date: newDueDate })
        fetchTodos() // Refresh the todo list after postponing
      } catch (error) {
        window.alert('Failed to postpone todo. Please try again.' + error)
      }
    }
    document.getElementById('savePostponeBtn').removeEventListener('click', save)
    closeModal('postponeModal')
  }
  document.getElementById('savePostponeBtn').addEventListener('click', save)
}

// Function to submit the edited todo
async function submitEditTodo () {
  const name = document.getElementById('editName').value
  const description = document.getElementById('editDescription').value
  const tags = document.getElementById('editTags').value
  const frequency = document.getElementById('editFrequency').value
  const nextDueDate = document.getElementById('editDueDate').value
  const archived = document.getElementById('editArchived').checked
  const id = document.getElementById('editId').value

  // Create an object to hold the updates
  const updates = {}
  if (name) updates.name = name
  if (description) updates.description = description
  if (tags) updates.tags = tags
  if (frequency) updates.frequency = parseInt(frequency, 10)
  if (nextDueDate) updates.next_due_date = nextDueDate
  updates.archived = archived

  try {
    await api.put(`todos/${id}/`, updates)
    closeModal('editModal')
    fetchTodos() // Refresh the todo list after updating
  } catch (error) {
    window.alert('Failed to update todo. Please try again. ' + error)
  }
}

// Function to open the edit modal when the "Edit" button is clicked
function editTodoButton (event) {
  const todo = event.target.closest('li')._data
  openEditModal(todo.id, todo.name, todo.description, todo.tags, todo.frequency, todo.next_due_date, todo.archived)
}

/** * UI Elements ***/

// Tab Management
function openTab (evt, tabName) {
  const target = evt.currentTarget
  const tabcontent = target.parentElement.parentElement.querySelectorAll(':scope > .tabcontent')
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.remove('active')
  }
  document.getElementById(tabName).classList.add('active')

  const tablinks = target.parentElement.getElementsByClassName('tablinks')
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active')
  }
  target.classList.add('active')
}

// On page "Add todo" hide irrelevant fields
document.querySelectorAll('input[name="typeRadio"]').forEach(radio => {
  radio.addEventListener('change', () => {
    // React to the change event
    if (radio.id === 'radioRecurring') {
      unhide(document.getElementById('todoFrequency'))
      unhide(document.getElementById('todoNextDueDate'))
    } else if (radio.id === 'radioOnetime') {
      hide(document.getElementById('todoFrequency'))
      unhide(document.getElementById('todoNextDueDate'))
    } else if (radio.id === 'radioOnDemand') {
      hide(document.getElementById('todoFrequency'))
      hide(document.getElementById('todoNextDueDate'))
    }
  })
})

/** * Shopping ***/
const addShoppingArticle = document.getElementById('addShoppingArticle')
async function addArticleToShoppingList (e) {
  e.preventDefault()
  const article = {
    title: document.getElementById('shoppingArticle').value,
    description: document.getElementById('shoppingDesc').value
  }
  await api.post('shopping/', article)

  // Clear form and refresh todos
  addShoppingArticle.reset()
  fetchShopping()
}
async function shoppingDone (articleId) {
  await api.delete(`shopping/${articleId}`)
  fetchShopping()
}
addShoppingArticle.addEventListener('submit', addArticleToShoppingList)

/** * Tags and Filters ***/

function createDropdown (selector, values, active, handler) {
  const container = document.getElementById(selector)
  container.innerHTML = ''
  // Create a dropdown (select element)
  const dropdown = document.createElement('select')
  dropdown.className = 'type-dropdown'

  // Populate the dropdown with options
  values.forEach(value => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = value

    // Highlight the active option
    if (value === active) {
      option.selected = true
    }

    dropdown.appendChild(option)
  })

  // Add event listener for change event
  dropdown.addEventListener('change', (event) => {
    handler(event.target.value, dropdown)
  })

  // Append the dropdown to the container
  container.appendChild(dropdown)
}

function createTypeDropdown () {
  const values = ['All Types', 'Repeating', 'Ondemand', 'Onetime']
  const activeType = getActiveFilter('type')
  createDropdown('typefilter', values, activeType, handleTypeClick)
}

function createArchivedDropdown () {
  const values = ['Active', 'Archived']
  const activeType = getActiveFilter('archived')
  const activeOption = activeType === 'true' ? 'Archived' : 'Active'
  createDropdown('archivedfilter', values, activeOption, handleArchivedClick)
}

function createTagButtons (tagList) {
  const container = document.getElementById('taglist')

  // Get currently active tag from the URL
  const activeTag = getActiveFilter('tag')

  container.innerHTML = ''

  tagList.forEach(tag => {
    const button = document.createElement('button')
    button.textContent = tag
    button.className = 'tag-button'

    // Highlight the active button
    if (tag === activeTag) {
      button.classList.add('active')
    }

    button.addEventListener('click', () => handleTagClick(tag, button))

    container.appendChild(button)
  })
}

// Function to handle tag button click
function handleTagClick (tag, button) {
  const urlParams = new URLSearchParams(window.location.search)

  // Reset button styles
  document.querySelectorAll('.tag-button').forEach(btn => btn.classList.remove('active'))

  // If filter was already active, deactivate it
  if (getActiveFilter('tag') === tag) {
    urlParams.delete('tag')
  } else {
    urlParams.set('tag', tag)
    button.classList.add('active')
  }

  window.history.pushState({}, '', `${window.location.pathname}?${urlParams}`)
  fetchTodos()
}

// Function to handle type dropdown click
function handleTypeClick (type, dropdown) {
  const urlParams = new URLSearchParams(window.location.search)
  type = type.toLowerCase()

  if (type === 'all types') {
    urlParams.delete('type')
  } else {
    urlParams.set('type', type)
  }

  window.history.pushState({}, '', `${window.location.pathname}?${urlParams}`)
  fetchTodos()
}
function handleArchivedClick (type, dropdown) {
  const urlParams = new URLSearchParams(window.location.search)
  type = type.toLowerCase()

  if (type === 'active') {
    urlParams.delete('archived')
  } else {
    urlParams.set('archived', 'true')
  }

  window.history.pushState({}, '', `${window.location.pathname}?${urlParams}`)
  fetchTodos()
}

/** * Login/Registration ***/

// Check if the user is logged in (by looking for a token)
function checkAuth () {
  const token = localStorage.getItem('token')
  if (token) {
    // User is logged in
    hide(authSection)
    unhide(mainContent)
    fetchAll()
  } else {
    // User is not logged in
    unhide(authSection)
    hide(mainContent)
  }
}

async function checkRegistation () {
  const info = await api.get('info/')
  if (!info.registation_open) {
    hide(document.querySelector('#register-block'))
  }
}
// Function to display login-error messages
function showError (message) {
  const errorMessageElement = document.getElementById('error-message')
  if (message) {
    errorMessageElement.textContent = message
    unhide(errorMessageElement)
  } else {
    hide(errorMessageElement)
  }
}

async function register (event) {
  event.preventDefault()
  const username = document.getElementById('register-username').value
  const password = document.getElementById('register-password').value

  try {
    const result = await api.post('register', { username, password })
    console.log('User registered:', result)
    showError('') // Clear any previous error
    // TODO: Log the user in or show success
  } catch (error) {
    const reason = error._data || 'Unknown error'
    showError(`Registration failed: ${reason}`)
  }
}

async function login (event) {
  event.preventDefault()
  const username = document.getElementById('login-username').value
  const password = document.getElementById('login-password').value

  try {
    await api.login(username, password)
    showError('') // Clear any previous error
    checkAuth() // Proceed to the main content
  } catch (error) {
    showError(`Login failed: ${error.message}`)
  }
}
async function logout () {
  await api.logout()
  checkAuth()
}
document.getElementById('register-form').addEventListener('submit', register)
document.getElementById('login-form').addEventListener('submit', login)
document.getElementById('logoutBtn').addEventListener('click', logout)

/** * Popup and dropdown handling ***/

function toggleDropdown (element) {
  const dropdownMenu = element.nextElementSibling
  dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block'
}

// Close the dropdown when clicking outside of it
window.addEventListener('click', function (event) {
  if (!event.target.matches('.dropdown-toggle')) {
    const dropdowns = document.getElementsByClassName('dropdown-menu')
    for (let i = 0; i < dropdowns.length; i++) {
      hide(dropdowns[i])
    }
  }
})

// Close Popup if escape key is pressed
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' || event.keyCode === 27) {
    document.querySelectorAll('.modal').forEach(modal => {
      hide(modal)
    })
  }
})

// Function to open/close a modal
function openModal (modalName) {
  const modal = document.getElementById(modalName)
  modal.getElementsByClassName('close')[0].onclick = function () {
    closeModal(modalName)
  }
  unhide(modal)
}
function closeModal (modalName) {
  hide(document.getElementById(modalName))
}

// Function to initialize the page
window.onload = function () {
  checkAuth()
  checkRegistation()
}
