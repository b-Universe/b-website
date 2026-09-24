'use strict';

const $ = (id) => document.getElementById(id);
const editorView = $('editorView');
const compareView = $('compareView');
let outputText = '';
let outputExtension = 'json';
let fileTarget = $('source');
let lastSearchIndex = -1;

function yamlReady() {
  if (!window.jsyaml) throw new Error('YAML support could not load. Connect to the internet, then refresh the page.');
  return window.jsyaml;
}
function determineFormat(text, selected) {
  if (selected !== 'auto') return selected;
  return /^[\s]*[\[{]/.test(text) ? 'json' : 'yaml';
}
function getErrorLocation(error, text, format) {
  if (format === 'yaml' && error.mark) {
    return `Line ${error.mark.line + 1}, column ${error.mark.column + 1}`;
  }
  const message = String(error.message || error);
  const match = message.match(/position\s+(\d+)/i);
  if (!match) return '';
  const before = text.slice(0, Number(match[1]));
  const lines = before.split('\n');
  return `Line ${lines.length}, column ${lines[lines.length - 1].length + 1}`;
}
function parseInput(text, selected) {
  if (!text.trim()) throw new Error('Input is empty. Paste some JSON or YAML first.');
  const format = determineFormat(text, selected);
  try {
    return { value: format === 'json' ? JSON.parse(text) : yamlReady().load(text), format };
  } catch (error) {
    const location = getErrorLocation(error, text, format);
    throw new Error(`${format.toUpperCase()} error${location ? ` at ${location}` : ''}: ${error.reason || error.message || String(error)}`);
  }
}
function stringify(value, format) {
  if (format === 'json') {
    const spaces = $('indent').value === 'tab' ? '\t' : Number($('indent').value);
    return JSON.stringify(value === undefined ? null : value, null, spaces) + '\n';
  }
  return yamlReady().dump(value === undefined ? null : value, { indent: 2, lineWidth: -1, noRefs: true });
}
function setStatus(message, kind = 'info', target = $('status')) {
  target.textContent = message;
  target.className = `status ${kind}`;
}
function setOutput(text, extension) {
  outputText = text;
  outputExtension = extension;
  $('output').textContent = text || 'Your formatted or converted result will appear here.';
  $('outputStats').textContent = text ? `${text.split('\n').length - (text.endsWith('\n') ? 1 : 0)} lines · ${text.length.toLocaleString()} characters` : 'No output yet';
}
function runEditor(validateOnly = false) {
  const text = $('source').value;
  try {
    const parsed = parseInput(text, $('inputFormat').value);
    if (validateOnly) {
      setStatus(`Valid ${parsed.format.toUpperCase()}. No parsing errors found.`, 'success');
      return;
    }
    const target = $('outputFormat').value;
    setOutput(stringify(parsed.value, target), target);
    setStatus(`Success! ${parsed.format.toUpperCase()} formatted as ${target.toUpperCase()}.`, 'success');
  } catch (error) {
    if (!validateOnly) setOutput('', 'txt');
    setStatus(error.message, 'error');
  }
}
$('convertBtn').addEventListener('click', () => runEditor(false));
$('validateBtn').addEventListener('click', () => runEditor(true));
$('clearBtn').addEventListener('click', () => {
  $('source').value = '';
  $('searchInput').value = '';
  $('searchCount').textContent = '';
  setOutput('', 'txt');
  setStatus('Cleared. Paste some JSON or YAML to begin.');
  $('source').focus();
});
$('exampleBtn').addEventListener('click', () => {
  $('source').value = 'server:\n  name: B\n  online: true\n  max_players: 50\n  features:\n    - Denizen\n    - Custom inventories\n  ports:\n    minecraft: 25565\n';
  $('inputFormat').value = 'yaml';
  $('outputFormat').value = 'json';
  runEditor();
});
$('copyBtn').addEventListener('click', async () => {
  if (!outputText) return setStatus('There is no output to copy.', 'error');
  try {
    await navigator.clipboard.writeText(outputText);
    setStatus('Output copied to clipboard.', 'success');
  } catch (_) {
    setStatus('Clipboard permission was denied. Select the output and copy it manually, or use Download.', 'error');
  }
});
function download(text, filename, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('downloadBtn').addEventListener('click', () => {
  if (!outputText) return setStatus('There is no output to download.', 'error');
  const extension = outputExtension === 'yaml' ? 'yaml' : outputExtension === 'json' ? 'json' : 'txt';
  download(outputText, `toolbox-output.${extension}`, extension === 'json' ? 'application/json' : 'text/plain');
  setStatus(`Downloaded toolbox-output.${extension}.`, 'success');
});

function openFile(target) {
  fileTarget = target;
  $('filePicker').value = '';
  $('filePicker').click();
}
$('openBtn').addEventListener('click', () => openFile($('source')));
$('openLeftBtn').addEventListener('click', () => openFile($('leftText')));
$('openRightBtn').addEventListener('click', () => openFile($('rightText')));
$('filePicker').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  fileTarget.value = await file.text();
  if (fileTarget === $('source')) {
    if (/\.json$/i.test(file.name)) $('inputFormat').value = 'json';
    else if (/\.ya?ml$/i.test(file.name)) $('inputFormat').value = 'yaml';
    setStatus(`Opened ${file.name} locally.`, 'success');
    scheduleEditor();
  } else { setStatus(`Opened ${file.name} locally.`, 'success', $('compareStatus')); scheduleCompare(); }
});
for (const id of ['source', 'leftText', 'rightText']) {
  const area = $(id);
  area.addEventListener('dragover', (event) => event.preventDefault());
  area.addEventListener('drop', async (event) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    area.value = await file.text();
    if (id === 'source') {
      if (/\.json$/i.test(file.name)) $('inputFormat').value = 'json';
      else if (/\.ya?ml$/i.test(file.name)) $('inputFormat').value = 'yaml';
      setStatus(`Loaded ${file.name} locally.`, 'success');
      scheduleEditor();
    } else { setStatus(`Loaded ${file.name} locally.`, 'success', $('compareStatus')); scheduleCompare(); }
  });
}

function searchNext() {
  const query = $('searchInput').value;
  if (!query) return $('searchCount').textContent = 'Enter a search term.';
  const source = $('source');
  const haystack = source.value.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  const matches = [];
  let position = 0;
  while ((position = haystack.indexOf(needle, position)) !== -1) {
    matches.push(position);
    position += Math.max(1, needle.length);
    if (matches.length >= 10000) break;
  }
  if (!matches.length) return $('searchCount').textContent = 'No matches';
  let index = matches.findIndex((p) => p > lastSearchIndex);
  if (index === -1) index = 0;
  const selected = matches[index];
  lastSearchIndex = selected;
  source.focus();
  source.setSelectionRange(selected, selected + query.length);
  $('searchCount').textContent = `${index + 1} of ${matches.length}`;
}
$('findBtn').addEventListener('click', searchNext);
$('searchInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); searchNext(); }
});
$('searchInput').addEventListener('input', () => { lastSearchIndex = -1; $('searchCount').textContent = ''; });

function diffLines(left, right) {
  const n = left.length, m = right.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = left[i] === right[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && left[i] === right[j]) {
      rows.push({ left: left[i], right: right[j], li: i + 1, rj: j + 1, kind: 'same' }); i++; j++;
    } else if (i < n && (j === m || dp[i + 1][j] >= dp[i][j + 1])) {
      rows.push({ left: left[i], right: '', li: i + 1, rj: '', kind: 'remove' }); i++;
    } else {
      rows.push({ left: '', right: right[j], li: '', rj: j + 1, kind: 'add' }); j++;
    }
  }
  return rows;
}
function normalizedForCompare(text, format) {
  if (format === 'text') return text;
  const parsed = parseInput(text, format);
  return JSON.stringify(parsed.value === undefined ? null : parsed.value, null, 2);
}
function renderDiff(rows) {
  const body = $('diffBody');
  body.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const [value, css] of [[row.li, ''], [row.left, row.kind === 'remove' ? 'remove' : row.kind === 'add' ? 'blank' : ''], [row.rj, ''], [row.right, row.kind === 'add' ? 'add' : row.kind === 'remove' ? 'blank' : '']]) {
      const td = document.createElement('td');
      td.className = css;
      td.textContent = value;
      tr.append(td);
    }
    fragment.append(tr);
  }
  body.append(fragment);
}
function runCompare() {
  try {
    const leftText = $('leftText').value, rightText = $('rightText').value;
    if (!leftText.trim() || !rightText.trim()) throw new Error('Paste or open a file on both sides first.');
    const mode = $('compareFormat').value;
    const left = normalizedForCompare(leftText, mode).replace(/\r\n/g, '\n').split('\n');
    const right = normalizedForCompare(rightText, mode).replace(/\r\n/g, '\n').split('\n');
    if (left.length > 650 || right.length > 650) throw new Error('This version compares at most 650 lines per side. Use smaller files or compare just the relevant section.');
    const rows = diffLines(left, right);
    renderDiff(rows);
    const added = rows.filter((row) => row.kind === 'add').length;
    const removed = rows.filter((row) => row.kind === 'remove').length;
    setStatus(added || removed ? `${added} added line(s), ${removed} removed line(s).` : 'No differences found.', 'success', $('compareStatus'));
  } catch (error) { clearDiff(); setStatus(error.message, 'error', $('compareStatus')); }
}
$('swapBtn').addEventListener('click', () => { [$('leftText').value, $('rightText').value] = [$('rightText').value, $('leftText').value]; scheduleCompare(); });
$('clearCompareBtn').addEventListener('click', () => {
  $('leftText').value = ''; $('rightText').value = '';
  $('diffBody').replaceChildren();
  const tr = document.createElement('tr'), td = document.createElement('td');
  td.colSpan = 4; td.className = 'empty-diff'; td.textContent = 'Differences will appear here.';
  tr.append(td); $('diffBody').append(tr);
  setStatus('Cleared. Compare two files to highlight their differences.', 'info', $('compareStatus'));
});
function setTab(compare) {
  editorView.hidden = compare;
  compareView.hidden = !compare;
  $('editTab').classList.toggle('active', !compare);
  $('compareTab').classList.toggle('active', compare);
  $('editTab').setAttribute('aria-selected', String(!compare));
  $('compareTab').setAttribute('aria-selected', String(compare));
}
$('editTab').addEventListener('click', () => setTab(false));
$('compareTab').addEventListener('click', () => setTab(true));

let editorTimer;
let compareTimer;
const delay = 220;
function clearDiff() {
  const td = document.createElement('td');
  td.colSpan = 4; td.className = 'empty-diff';
  td.textContent = 'Add valid content on both sides to compare.';
  const tr = document.createElement('tr'); tr.append(td);
  $('diffBody').replaceChildren(tr);
}
function scheduleEditor() {
  clearTimeout(editorTimer);
  if (!$('liveToggle').checked) return;
  if (!$('source').value.trim()) {
    setOutput('', 'txt');
    setStatus('Paste JSON or YAML to begin.');
    return;
  }
  editorTimer = setTimeout(() => runEditor(false), delay);
}
function scheduleCompare() {
  clearTimeout(compareTimer);
  if (!$('liveCompareToggle').checked) return;
  if (!$('leftText').value.trim() || !$('rightText').value.trim()) {
    clearDiff();
    setStatus('Paste or open two files to compare.', 'info', $('compareStatus'));
    return;
  }
  compareTimer = setTimeout(runCompare, delay);
}
$('compareBtn').addEventListener('click', runCompare);
$('source').addEventListener('input', scheduleEditor);
for (const id of ['inputFormat', 'outputFormat', 'indent']) $(id).addEventListener('change', scheduleEditor);
$('liveToggle').addEventListener('change', scheduleEditor);
for (const id of ['leftText', 'rightText']) $(id).addEventListener('input', scheduleCompare);
$('compareFormat').addEventListener('change', scheduleCompare);
$('liveCompareToggle').addEventListener('change', scheduleCompare);
