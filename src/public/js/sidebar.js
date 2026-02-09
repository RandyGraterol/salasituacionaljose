// Sidebar functionality
(function() {
  'use strict';

  // Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');

  // Check if sidebar exists (only on authenticated pages)
  if (!sidebar) return;

  // Load sidebar state from localStorage
  const SIDEBAR_STATE_KEY = 'sidebar-collapsed';
  let isSidebarCollapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === 'true';

  // Initialize sidebar state on desktop
  function initSidebarState() {
    // On mobile, sidebar is always collapsed by default
    if (window.innerWidth < 1024) {
      collapseSidebar();
    } else {
      // On desktop, restore saved state
      if (isSidebarCollapsed) {
        collapseSidebar();
      } else {
        expandSidebar();
      }
    }
  }

  // Expand sidebar
  function expandSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    
    // Show overlay on mobile
    if (window.innerWidth < 1024) {
      sidebarOverlay.classList.remove('hidden');
    }
    
    isSidebarCollapsed = false;
    localStorage.setItem(SIDEBAR_STATE_KEY, 'false');
  }

  // Collapse sidebar
  function collapseSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    
    // Hide overlay
    sidebarOverlay.classList.add('hidden');
    
    isSidebarCollapsed = true;
    localStorage.setItem(SIDEBAR_STATE_KEY, 'true');
  }

  // Toggle sidebar
  function toggleSidebar() {
    if (isSidebarCollapsed) {
      expandSidebar();
    } else {
      collapseSidebar();
    }
  }

  // Event listeners
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }

  if (sidebarClose) {
    sidebarClose.addEventListener('click', collapseSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', collapseSidebar);
  }

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      initSidebarState();
    }, 250);
  });

  // Handle escape key to close sidebar on mobile
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && window.innerWidth < 1024 && !isSidebarCollapsed) {
      collapseSidebar();
    }
  });

  // Initialize on page load
  initSidebarState();

})();
