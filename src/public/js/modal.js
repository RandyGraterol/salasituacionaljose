// Modal confirmation system
(function() {
  'use strict';

  /**
   * Show a confirmation modal
   * @param {Object} options - Modal options
   * @param {string} options.title - Modal title
   * @param {string} options.message - Modal message (can include HTML)
   * @param {string} options.confirmText - Confirm button text (default: 'Confirmar')
   * @param {string} options.cancelText - Cancel button text (default: 'Cancelar')
   * @param {string} options.type - Modal type: 'danger', 'warning', 'info' (default: 'warning')
   * @param {Function} options.onConfirm - Callback when confirmed
   * @param {Function} options.onCancel - Callback when cancelled
   */
  function showConfirmModal(options) {
    const {
      title = '¿Está seguro?',
      message = '',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'warning',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in';
    backdrop.style.animation = 'fadeIn 0.2s ease-out';

    // Determine colors based on type
    let iconColor, iconBg, confirmBtnClass;
    switch(type) {
      case 'danger':
        iconColor = 'text-red-600';
        iconBg = 'bg-red-100';
        confirmBtnClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
        break;
      case 'warning':
        iconColor = 'text-yellow-600';
        iconBg = 'bg-yellow-100';
        confirmBtnClass = 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
        break;
      case 'info':
        iconColor = 'text-blue-600';
        iconBg = 'bg-blue-100';
        confirmBtnClass = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
        break;
      default:
        iconColor = 'text-yellow-600';
        iconBg = 'bg-yellow-100';
        confirmBtnClass = 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
    }

    // Create modal content
    backdrop.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all animate-scale-in" style="animation: scaleIn 0.2s ease-out;">
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <div class="${iconBg} rounded-full p-3">
                <svg class="h-6 w-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  ${type === 'danger' ? 
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />' :
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />'
                  }
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
              <div class="text-sm text-gray-600">${message}</div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end rounded-b-lg">
          <button 
            type="button" 
            class="modal-cancel w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors font-medium"
          >
            ${cancelText}
          </button>
          <button 
            type="button" 
            class="modal-confirm w-full sm:w-auto px-4 py-2 ${confirmBtnClass} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors font-medium"
          >
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    // Add to body
    document.body.appendChild(backdrop);

    // Focus on confirm button
    const confirmBtn = backdrop.querySelector('.modal-confirm');
    const cancelBtn = backdrop.querySelector('.modal-cancel');
    
    setTimeout(() => confirmBtn.focus(), 100);

    // Handle confirm
    confirmBtn.addEventListener('click', function() {
      closeModal();
      onConfirm();
    });

    // Handle cancel
    cancelBtn.addEventListener('click', function() {
      closeModal();
      onCancel();
    });

    // Handle backdrop click
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        closeModal();
        onCancel();
      }
    });

    // Handle ESC key
    function handleEscape(e) {
      if (e.key === 'Escape') {
        closeModal();
        onCancel();
      }
    }
    document.addEventListener('keydown', handleEscape);

    // Close modal function
    function closeModal() {
      backdrop.style.opacity = '0';
      backdrop.querySelector('.bg-white').style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
        document.removeEventListener('keydown', handleEscape);
      }, 200);
    }
  }

  /**
   * Show a notification modal (info only, no confirmation)
   * @param {Object} options - Modal options
   * @param {string} options.title - Modal title
   * @param {string} options.message - Modal message
   * @param {string} options.type - Modal type: 'success', 'error', 'info', 'warning'
   * @param {string} options.buttonText - Button text (default: 'Entendido')
   * @param {Function} options.onClose - Callback when closed
   */
  function showNotificationModal(options) {
    const {
      title = 'Notificación',
      message = '',
      type = 'info',
      buttonText = 'Entendido',
      onClose = () => {}
    } = options;

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in';

    // Determine colors based on type
    let iconColor, iconBg, iconPath, btnClass;
    switch(type) {
      case 'success':
        iconColor = 'text-green-600';
        iconBg = 'bg-green-100';
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />';
        btnClass = 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
        break;
      case 'error':
        iconColor = 'text-red-600';
        iconBg = 'bg-red-100';
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />';
        btnClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
        break;
      case 'warning':
        iconColor = 'text-yellow-600';
        iconBg = 'bg-yellow-100';
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />';
        btnClass = 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
        break;
      default:
        iconColor = 'text-blue-600';
        iconBg = 'bg-blue-100';
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
        btnClass = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }

    // Create modal content
    backdrop.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all animate-scale-in">
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <div class="${iconBg} rounded-full p-3">
                <svg class="h-6 w-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  ${iconPath}
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
              <div class="text-sm text-gray-600">${message}</div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-6 py-4 flex justify-end rounded-b-lg">
          <button 
            type="button" 
            class="modal-close px-6 py-2 ${btnClass} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors font-medium"
          >
            ${buttonText}
          </button>
        </div>
      </div>
    `;

    // Add to body
    document.body.appendChild(backdrop);

    // Focus on button
    const closeBtn = backdrop.querySelector('.modal-close');
    setTimeout(() => closeBtn.focus(), 100);

    // Handle close
    function close() {
      backdrop.style.opacity = '0';
      backdrop.querySelector('.bg-white').style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
        document.removeEventListener('keydown', handleEscape);
        onClose();
      }, 200);
    }

    closeBtn.addEventListener('click', close);

    // Handle backdrop click
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        close();
      }
    });

    // Handle ESC key
    function handleEscape(e) {
      if (e.key === 'Escape') {
        close();
      }
    }
    document.addEventListener('keydown', handleEscape);
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.95);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }
    .animate-scale-in {
      animation: scaleIn 0.2s ease-out;
    }
  `;
  document.head.appendChild(style);

  // Expose to window
  window.modal = {
    confirm: showConfirmModal,
    notify: showNotificationModal
  };

})();
