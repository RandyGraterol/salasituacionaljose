// Main JavaScript file - Sistema de Tareas CDCE

// Confirmación antes de eliminar
function confirmarEliminacion(mensaje) {
  return confirm(mensaje || '¿Está seguro de que desea eliminar este elemento?');
}

// Validación de formularios
document.addEventListener('DOMContentLoaded', function() {
  // Validar fechas en formularios de tareas
  const formTarea = document.querySelector('form[action*="crear"]');
  if (formTarea) {
    formTarea.addEventListener('submit', function(e) {
      const fechaInicio = document.getElementById('fechaInicio');
      const fechaCulminacion = document.getElementById('fechaCulminacion');
      
      if (fechaInicio && fechaCulminacion) {
        if (new Date(fechaInicio.value) > new Date(fechaCulminacion.value)) {
          e.preventDefault();
          
          // Use toast if available, otherwise alert
          if (window.toast) {
            window.toast.error('La fecha de inicio debe ser anterior o igual a la fecha de culminación');
          } else {
            alert('La fecha de inicio debe ser anterior o igual a la fecha de culminación');
          }
        }
      }
    });
  }

  // Initialize tooltips if needed
  initTooltips();
  
  // Initialize smooth scrolling
  initSmoothScroll();
});

// Initialize tooltips
function initTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  tooltipElements.forEach(function(element) {
    element.setAttribute('title', element.getAttribute('data-tooltip'));
  });
}

// Initialize smooth scrolling for anchor links
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Utility function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('es-ES', options);
}

// Utility function to format datetime
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('es-ES', dateOptions) + ' ' + date.toLocaleTimeString('es-ES', timeOptions);
}
