// Toast notification system
(function() {
  'use strict';

  // Toast container
  const toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) {
    console.warn('Toast container not found');
    return;
  }

  // Toast templates
  const templates = {
    success: document.getElementById('toast-success-template'),
    error: document.getElementById('toast-error-template'),
    info: document.getElementById('toast-info-template'),
    warning: document.getElementById('toast-warning-template')
  };

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - The type of toast (success, error, info, warning)
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  function showToast(message, type = 'info', duration = 4000) {
    // Validate type
    if (!templates[type]) {
      console.error(`Invalid toast type: ${type}`);
      type = 'info';
    }

    // Clone template
    const template = templates[type];
    if (!template) {
      console.error('Toast template not found');
      return;
    }

    const toastElement = template.content.cloneNode(true);
    const toast = toastElement.querySelector('.toast');
    
    // Set message
    const messageElement = toast.querySelector('.toast-message');
    messageElement.textContent = message;

    // Add to container
    toastContainer.appendChild(toast);

    // Setup close button
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', function() {
      removeToast(toast);
    });

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(function() {
        removeToast(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Remove a toast notification
   * @param {HTMLElement} toast - The toast element to remove
   */
  function removeToast(toast) {
    if (!toast) return;

    // Add fade-out animation
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';

    // Remove from DOM after animation
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Show success toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds
   */
  function showSuccess(message, duration) {
    return showToast(message, 'success', duration);
  }

  /**
   * Show error toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds
   */
  function showError(message, duration) {
    return showToast(message, 'error', duration);
  }

  /**
   * Show info toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds
   */
  function showInfo(message, duration) {
    return showToast(message, 'info', duration);
  }

  /**
   * Show warning toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds
   */
  function showWarning(message, duration) {
    return showToast(message, 'warning', duration);
  }

  // Expose toast functions globally
  window.toast = {
    show: showToast,
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning
  };

  // Check for flash messages in URL params (for redirects)
  const urlParams = new URLSearchParams(window.location.search);
  const flashMessage = urlParams.get('message');
  const flashType = urlParams.get('type') || 'info';
  
  if (flashMessage) {
    showToast(decodeURIComponent(flashMessage), flashType);
    
    // Clean URL
    const url = new URL(window.location);
    url.searchParams.delete('message');
    url.searchParams.delete('type');
    window.history.replaceState({}, '', url);
  }

})();
