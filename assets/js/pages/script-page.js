(function() {
  function init_script_page() {
    const source = document.querySelector('[data-script-src]');
    const copy_button = document.querySelector('[data-copy-source]');

    if (!source) return;

    function highlight_source() {
      if (typeof window.format_denizen_script !== 'function') return;
      source.innerHTML = window.format_denizen_script(source.textContent);
    }

    fetch(source.dataset.scriptSrc)
      .then(response => {
        if (!response.ok) throw new Error('script file could not be loaded');
        return response.text();
      })
      .then(text => {
        source.textContent = text.trim();
        highlight_source();
      })
      .catch(() => {
        source.textContent = 'the script file could not be loaded.';
      });

    if (!copy_button) return;

    copy_button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(source.textContent);
        copy_button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> copied';
      } catch {
        copy_button.textContent = 'copy failed';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_script_page);
  } else {
    init_script_page();
  }
})();
