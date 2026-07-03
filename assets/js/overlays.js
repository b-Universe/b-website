document.addEventListener('DOMContentLoaded', () => {

  // --- Modals Logic ---
  
  const modalTriggers = document.querySelectorAll('[data-toggle="modal"]');
  const modalDismissers = document.querySelectorAll('[data-dismiss="modal"]');
  
  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'block';
    // Force reflow
    modalEl.offsetHeight;
    modalEl.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }
  
  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('show');
    setTimeout(() => {
      modalEl.style.display = 'none';
      // Only restore scrolling if no other modals are open
      if (!document.querySelector('.modal.show')) {
        document.body.style.overflow = '';
      }
    }, 300); // match transition duration
  }

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSelector = trigger.getAttribute('data-target') || trigger.getAttribute('href');
      const modalEl = document.querySelector(targetSelector);
      
      if (modalEl) {
        // Varying modal content logic for the demo
        const modalTitleData = trigger.getAttribute('data-modal-title');
        if (modalTitleData) {
          const titleEl = modalEl.querySelector('.modal-title');
          if (titleEl) titleEl.textContent = modalTitleData;
          
          const recipientInput = modalEl.querySelector('#recipient-name');
          if (recipientInput) {
            // Extract the @name from the title string (e.g. "New message to @mdo")
            const parts = modalTitleData.split('to ');
            if (parts.length > 1) {
              recipientInput.value = parts[1];
            }
          }
        }
        openModal(modalEl);
      }
    });
  });

  modalDismissers.forEach(dismisser => {
    dismisser.addEventListener('click', (e) => {
      e.preventDefault();
      const modalEl = dismisser.closest('.modal');
      closeModal(modalEl);
    });
  });

  // Close when clicking on the backdrop
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target);
    }
  });


  // --- Popovers Logic ---
  
  const popoverTriggers = document.querySelectorAll('[data-toggle="popover"]');
  let activePopover = null;
  let activeTrigger = null;

  function createPopover() {
    const popover = document.createElement('div');
    popover.className = 'popover';
    popover.innerHTML = `
      <div class="arrow"></div>
      <h3 class="popover-header"></h3>
      <div class="popover-body"></div>
    `;
    document.body.appendChild(popover);
    return popover;
  }

  function hidePopover() {
    if (activePopover) {
      activePopover.classList.remove('show');
      setTimeout(() => {
        if (activePopover && !activePopover.classList.contains('show')) {
          activePopover.style.display = 'none';
        }
      }, 200);
      activeTrigger = null;
    }
  }

  function showPopover(trigger) {
    if (!activePopover) {
      activePopover = createPopover();
    }
    
    // Reset classes and set content
    activePopover.className = 'popover';
    activePopover.style.display = 'block';
    
    const title = trigger.getAttribute('data-popover-title') || '';
    const content = trigger.getAttribute('data-popover-content') || '';
    const customClass = trigger.getAttribute('data-custom-class') || trigger.getAttribute('data-popover-class') || '';
    const placement = trigger.getAttribute('data-placement') || 'top';
    
    activePopover.querySelector('.popover-header').textContent = title;
    activePopover.querySelector('.popover-header').style.display = title ? 'block' : 'none';
    activePopover.querySelector('.popover-body').textContent = content;
    
    activePopover.classList.add(`bs-popover-${placement}`);
    if (customClass) {
      activePopover.classList.add(customClass);
    }
    
    // Position calculations
    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = activePopover.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    let top = 0;
    let left = 0;
    
    switch (placement) {
      case 'top':
        top = triggerRect.top + scrollY - popoverRect.height - 8; // 8px for arrow
        left = triggerRect.left + scrollX + (triggerRect.width / 2) - (popoverRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + (triggerRect.width / 2) - (popoverRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height / 2) - (popoverRect.height / 2);
        left = triggerRect.left + scrollX - popoverRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height / 2) - (popoverRect.height / 2);
        left = triggerRect.right + scrollX + 8;
        break;
    }
    
    activePopover.style.top = `${top}px`;
    activePopover.style.left = `${left}px`;
    
    // Force reflow
    activePopover.offsetHeight;
    activePopover.classList.add('show');
    activeTrigger = trigger;
  }

  popoverTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (activeTrigger === trigger) {
        hidePopover();
      } else {
        hidePopover(); // Hide any existing ones first
        // Need a slight delay if hiding an existing one, but for simplicity we just show the new one
        setTimeout(() => showPopover(trigger), 10);
      }
    });
  });

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (activePopover && activePopover.classList.contains('show')) {
      // Check if click was inside popover
      if (!activePopover.contains(e.target)) {
        hidePopover();
      }
    }
  });

  // --- Dropdown Logic ---
  const dropdownTriggers = document.querySelectorAll('[data-toggle="dropdown"]');
  
  dropdownTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const menu = trigger.parentElement.querySelector('.dropdown-menu');
      if (menu) {
        const isShowing = menu.classList.contains('show');
        
        // Hide all other dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
          openMenu.classList.remove('show');
        });
        
        if (!isShowing) {
          menu.classList.add('show');
        }
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-toggle="dropdown"]')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });

});
