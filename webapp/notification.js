'use strict'

/* global localStorage */

const pushButton = document.querySelector('#notifyBtn')

let isSubscribed = false
let swRegistration = null

function urlB64ToUint8Array (base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function updateBtn () {
  if (window.Notification.permission === 'denied') {
    pushButton.disabled = true
    return
  }

  if (isSubscribed) {
    pushButton.textContent = '🔕'
  } else {
    pushButton.textContent = '🔔'
  }

  pushButton.disabled = false
}

function updateSubscriptionOnServer (subscription, isSubscribed) {
  if (isSubscribed) {
    // Send subscription to the server
    fetch('/api/subscription/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subscription_token: subscription })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to send subscription to server')
        }
        console.log('Subscription successfully sent to the server')
      })
      .catch(error => {
        console.error('Error sending subscription to server:', error)
      })
  } else {
    fetch('/api/subscription/', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subscription_token: subscription })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to delete subscription from server')
        }
        console.log('Subscription successfully deleted from the server')
      })
      .catch(error => {
        console.error('Error deleting subscription from server:', error)
      })
  }
}

function subscribeUser () {
  const applicationServerPublicKey = localStorage.getItem('applicationServerPublicKey')
  const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey)
  swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  })
    .then(function (subscription) {
      console.log('User is subscribed.')

      updateSubscriptionOnServer(subscription, true)
      localStorage.setItem('sub_token', JSON.stringify(subscription))
      isSubscribed = true

      updateBtn()
    })
    .catch(function (err) {
      console.log('Failed to subscribe the user: ', err)
      updateBtn()
    })
}

function unsubscribeUser () {
  swRegistration.pushManager.getSubscription()
    .then(function (subscription) {
      if (subscription) {
        updateSubscriptionOnServer(subscription, false)
        return subscription.unsubscribe()
      }
    })
    .catch(function (error) {
      console.log('Error unsubscribing', error)
    })
    .then(function () {
      console.log('User is unsubscribed.')
      isSubscribed = false
      updateBtn()
    })
}

function initializeUI () {
  pushButton.addEventListener('click', function () {
    pushButton.disabled = true
    if (isSubscribed) {
      unsubscribeUser()
    } else {
      subscribeUser()
    }
  })

  // Set the initial subscription value
  swRegistration.pushManager.getSubscription()
    .then(function (subscription) {
      isSubscribed = !(subscription === null)

      if (isSubscribed) {
        console.log('User IS subscribed.')
      } else {
        console.log('User is NOT subscribed.')
      }

      updateBtn()
    })
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
  console.log('Service Worker and Push is supported')

  navigator.serviceWorker.register('/webapp/sw.js')
    .then(function (swReg) {
      console.log('Service Worker is registered', swReg)

      swRegistration = swReg
      initializeUI()
    })
    .catch(function (error) {
      console.error('Service Worker Error', error)
    })
} else {
  console.warn('Push meapplicationServerPublicKeyssaging is not supported')
  pushButton.textContent = 'Push Not Supported'
}

function push_message () {
  console.log('sub_token', localStorage.getItem('sub_token'))

  fetch('/push_v1/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ sub_token: localStorage.getItem('sub_token') })
  })
    .then(response => response.json())
    .then(data => {
      console.log('success', data)
    })
    .catch(error => {
      console.log('error', error)
    })
}

document.addEventListener('DOMContentLoaded', function () {
  fetch('/api/subscription/')
    .then(response => response.json())
    .then(data => {
      console.log('response', data)
      localStorage.setItem('applicationServerPublicKey', data.public_key)
    })
    .catch(error => {
      console.error('Error:', error)
    })
})
