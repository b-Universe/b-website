(function() {
  const dateInput = document.getElementById('dateInput');
  const output = document.getElementById('output');

  const formats = [
    { f: 't', desc: 'Short Time' },
    { f: 'T', desc: 'Long Time' },
    { f: 'd', desc: 'Short Date' },
    { f: 'D', desc: 'Long Date' },
    { f: 'f', desc: 'Short Date/Time' },
    { f: 'F', desc: 'Long Date/Time' },
    { f: 'R', desc: 'Relative Time' }
  ];

  const formatOptions = {
    t: { hour: 'numeric', minute: '2-digit' },
    T: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
    d: { year: 'numeric', month: '2-digit', day: '2-digit' },
    D: { year: 'numeric', month: 'long', day: 'numeric' },
    f: { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' },
    F: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  };

  let rowElements = [];

  function setInitialTime() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    dateInput.value = new Date(now - offset).toISOString().slice(0, 19);
  }

  function getPreview(date, flag) {
    if (flag === 'R') {
      const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'long' });
      const diffInSeconds = Math.floor((date.getTime() - Date.now()) / 1000);
      return formatter.format(Math.floor(diffInSeconds), 'second');
    }
    return new Intl.DateTimeFormat('en-US', formatOptions[flag]).format(date);
  }

  function renderRows() {
    output.innerHTML = '';
    rowElements = [];

    formats.forEach(({ f, desc }) => {
      const row = document.createElement('div');
      row.className = 'result-row';

      const contentCol = document.createElement('div');
      contentCol.style.textAlign = 'left';
      contentCol.innerHTML = `<div class="label-box">${desc}</div>`;
      
      const previewElem = document.createElement('div');
      previewElem.className = 'preview-text';
      contentCol.appendChild(previewElem);

      const tagCol = document.createElement('div');
      tagCol.className = 'tag-col';
      const codeElem = document.createElement('code');
      tagCol.appendChild(codeElem);

      const btn = document.createElement('button');
      btn.className = 'logo copy-btn';
      btn.textContent = 'Copy';
      
      btn.addEventListener('click', () => {
        const currentUnix = Math.floor(new Date(dateInput.value).getTime() / 1000);
        const tag = `<t:${currentUnix}:${f}>`;
        
        navigator.clipboard.writeText(tag).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('saved');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('saved');
          }, 1500);
        });
      });

      row.append(contentCol, tagCol, btn);
      output.appendChild(row);
      rowElements.push({ flag: f, previewElem, codeElem });
    });
    updateText();
  }

  function updateText() {
    const selectedDate = new Date(dateInput.value);
    if (isNaN(selectedDate.getTime())) return;
    const unix = Math.floor(selectedDate.getTime() / 1000);

    rowElements.forEach(({ flag, previewElem, codeElem }) => {
      const newPreview = getPreview(selectedDate, flag);
      const newTag = `<t:${unix}:${flag}>`;
      if (previewElem.textContent !== newPreview) previewElem.textContent = newPreview;
      if (codeElem.textContent !== newTag) codeElem.textContent = newTag;
    });
  }

  setInitialTime();
  renderRows();
  setInterval(updateText, 1000);
  dateInput.addEventListener('input', updateText);
})();
