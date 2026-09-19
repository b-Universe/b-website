(function() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const statusBox = document.getElementById('status-box');
  const workspace = document.getElementById('workspace');
  
  const sourcePreview = document.getElementById('source-preview');
  const infoFilename = document.getElementById('info-filename');
  const infoDimensions = document.getElementById('info-dimensions');
  const infoFilesize = document.getElementById('info-filesize');
  const btnClear = document.getElementById('btn-clear');
  
  const checkGenerateCustom = document.getElementById('check-generate-custom');
  const inputWidth = document.getElementById('input-width');
  const inputHeight = document.getElementById('input-height');
  const btnAddPreset = document.getElementById('btn-add-preset');
  
  const selectAspectRatio = document.getElementById('select-aspect-ratio');
  const selectFitMode = document.getElementById('select-fit-mode');
  const selectCropAlign = document.getElementById('select-crop-align');
  const groupCropAlign = document.getElementById('group-crop-align');
  
  const selectFormat = document.getElementById('select-format');
  const groupQuality = document.getElementById('group-quality');
  const inputQuality = document.getElementById('input-quality');
  const labelQualityVal = document.getElementById('label-quality-val');
  const groupJpegBg = document.getElementById('group-jpeg-bg');
  const inputJpegBg = document.getElementById('input-jpeg-bg');
  const optionWebp = document.getElementById('option-webp');
  
  const presetsContainer = document.getElementById('presets-container');
  const btnGenerate = document.getElementById('btn-generate');
  
  const resultsHeader = document.getElementById('results-header');
  const resultsContainer = document.getElementById('results');
  const btnDownloadAll = document.getElementById('btn-download-all');
  
  const presets = [16, 32, 64, 128, 256, 512, 1024];
  let currentFile = null;
  let currentImageBitmap = null;
  let currentObjectURL = null;
  
  let generatedUrls = [];
  let generatedFiles = [];
  
  const testCanvas = document.createElement('canvas');
  testCanvas.width = 1;
  testCanvas.height = 1;
  if (!testCanvas.toDataURL('image/webp').startsWith('data:image/webp')) {
    optionWebp.disabled = true;
    optionWebp.textContent = 'WebP (Unsupported by browser)';
  }
  
  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function initPresets() {
    presets.forEach(size => {
      const div = document.createElement('div');
      div.className = 'checkbox-group';
      const id = `preset-${size}`;
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.value = size;
      cb.className = 'preset-checkbox';
      
      const label = document.createElement('label');
      label.htmlFor = id;
      label.innerHTML = `${size}&times;${size}`;
      
      div.appendChild(cb);
      div.appendChild(label);
      presetsContainer.appendChild(div);
    });
  }

  function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = 'status-box ' + type;
  }
  
  function hideStatus() {
    statusBox.textContent = '';
    statusBox.className = 'status-box';
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });
  
  btnClear.addEventListener('click', () => {
    resetWorkspace();
    hideStatus();
  });
  
  function resetWorkspace() {
    currentFile = null;
    if (currentImageBitmap && typeof currentImageBitmap.close === 'function') {
      currentImageBitmap.close();
    }
    currentImageBitmap = null;
    
    if (currentObjectURL) {
      URL.revokeObjectURL(currentObjectURL);
      currentObjectURL = null;
    }
    clearGeneratedUrls();
    
    fileInput.value = '';
    workspace.style.display = 'none';
    dropZone.style.display = 'block';
  }
  
  function clearGeneratedUrls() {
    generatedUrls.forEach(url => URL.revokeObjectURL(url));
    generatedUrls = [];
    generatedFiles = [];
    resultsContainer.innerHTML = '';
    resultsHeader.style.display = 'none';
  }

  async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showStatus('Unsupported file format. Please upload an image.', 'error');
      return;
    }
    hideStatus();
    resetWorkspace();
    
    currentFile = file;
    currentObjectURL = URL.createObjectURL(file);
    
    try {
      if ('createImageBitmap' in window) {
        currentImageBitmap = await createImageBitmap(file);
      } else {
        currentImageBitmap = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = currentObjectURL;
        });
      }
      
      sourcePreview.src = currentObjectURL;
      infoFilename.textContent = file.name;
      infoDimensions.textContent = `${currentImageBitmap.width} × ${currentImageBitmap.height}`;
      infoFilesize.textContent = formatBytes(file.size);
      
      inputWidth.value = currentImageBitmap.width;
      inputHeight.value = currentImageBitmap.height;
      checkGenerateCustom.checked = false;
      selectAspectRatio.value = 'original';
      
      dropZone.style.display = 'none';
      workspace.style.display = 'block';
      
    } catch (e) {
      resetWorkspace();
      showStatus('Error decoding image. It may be corrupted or unsupported.', 'error');
      console.error(e);
    }
  }
  
  selectFitMode.addEventListener('change', () => {
    if (selectFitMode.value === 'cover') {
      groupCropAlign.style.display = 'block';
    } else {
      groupCropAlign.style.display = 'none';
    }
  });

  selectFormat.addEventListener('change', () => {
    const fmt = selectFormat.value;
    if (fmt === 'image/jpeg') {
      groupQuality.style.display = 'block';
      groupJpegBg.style.display = 'block';
    } else if (fmt === 'image/webp') {
      groupQuality.style.display = 'block';
      groupJpegBg.style.display = 'none';
    } else {
      groupQuality.style.display = 'none';
      groupJpegBg.style.display = 'none';
    }
  });

  inputQuality.addEventListener('input', () => {
    labelQualityVal.textContent = inputQuality.value + '%';
  });

  function getTargetRatio() {
    const val = selectAspectRatio.value;
    if (val === 'original' && currentImageBitmap) return currentImageBitmap.width / currentImageBitmap.height;
    if (val === '1:1') return 1;
    if (val === '4:3') return 4 / 3;
    if (val === '3:2') return 3 / 2;
    if (val === '16:9') return 16 / 9;
    if (val === '9:16') return 9 / 16;
    return null; // custom
  }
  
  function activateCustomSize() {
    checkGenerateCustom.checked = true;
  }
  
  function syncDimensionsFromWidth() {
    activateCustomSize();
    const ratio = getTargetRatio();
    if (ratio) {
      const w = parseInt(inputWidth.value, 10);
      if (!isNaN(w) && w > 0) {
        inputHeight.value = Math.round(w / ratio);
      }
    }
  }
  
  function syncDimensionsFromHeight() {
    activateCustomSize();
    const ratio = getTargetRatio();
    if (ratio) {
      const h = parseInt(inputHeight.value, 10);
      if (!isNaN(h) && h > 0) {
        inputWidth.value = Math.round(h * ratio);
      }
    }
  }
  
  inputWidth.addEventListener('input', syncDimensionsFromWidth);
  inputHeight.addEventListener('input', syncDimensionsFromHeight);
  selectAspectRatio.addEventListener('change', syncDimensionsFromWidth);
  
  btnAddPreset.addEventListener('click', () => {
    const w = parseInt(inputWidth.value, 10);
    const h = parseInt(inputHeight.value, 10);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      alert('Invalid dimensions.');
      return;
    }
    
    let found = false;
    document.querySelectorAll('.preset-checkbox').forEach(cb => {
      let cbW, cbH;
      if (cb.value.includes('x')) {
        [cbW, cbH] = cb.value.split('x').map(n => parseInt(n, 10));
      } else {
        cbW = cbH = parseInt(cb.value, 10);
      }
      if (cbW === w && cbH === h) {
        cb.checked = true;
        found = true;
      }
    });
    
    if (found) {
      showStatus(`Preset ${w}x${h} already exists and was selected.`, '');
      checkGenerateCustom.checked = false;
      return;
    }
    
    const id = `preset-${w}x${h}`;
    
    const div = document.createElement('div');
    div.className = 'checkbox-group';
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.value = `${w}x${h}`;
    cb.className = 'preset-checkbox';
    cb.checked = true;
    
    const label = document.createElement('label');
    label.htmlFor = id;
    label.innerHTML = `${w}&times;${h}`;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'preset-remove-btn';
    removeBtn.setAttribute('aria-label', `Remove ${w}x${h} preset`);
    removeBtn.title = 'Remove';
    removeBtn.style.background = 'none';
    removeBtn.style.border = 'none';
    removeBtn.style.padding = '0';
    removeBtn.style.marginLeft = '0.5rem';
    removeBtn.style.cursor = 'pointer';
    removeBtn.innerHTML = '<i class="fas fa-times" style="color: var(--muted); font-size: 0.8rem;"></i>';
    removeBtn.onclick = () => div.remove();
    
    div.appendChild(cb);
    div.appendChild(label);
    div.appendChild(removeBtn);
    presetsContainer.appendChild(div);
    
    checkGenerateCustom.checked = false;
  });

  function setControlsDisabled(disabled) {
    selectFormat.disabled = disabled;
    inputQuality.disabled = disabled;
    inputJpegBg.disabled = disabled;
    selectFitMode.disabled = disabled;
    selectCropAlign.disabled = disabled;
    selectAspectRatio.disabled = disabled;
    inputWidth.disabled = disabled;
    inputHeight.disabled = disabled;
    checkGenerateCustom.disabled = disabled;
    btnAddPreset.disabled = disabled;
    document.querySelectorAll('.preset-checkbox').forEach(cb => cb.disabled = disabled);
    document.querySelectorAll('.preset-remove-btn').forEach(btn => btn.disabled = disabled);
  }
  
  btnGenerate.addEventListener('click', async () => {
    if (!currentImageBitmap) return;
    
    clearGeneratedUrls();
    hideStatus();
    
    const jobs = [];
    
    if (checkGenerateCustom.checked) {
      const w = parseInt(inputWidth.value, 10);
      const h = parseInt(inputHeight.value, 10);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        jobs.push({ width: w, height: h });
      }
    }
    
    document.querySelectorAll('.preset-checkbox:checked').forEach(cb => {
      let w, h;
      if (cb.value.includes('x')) {
        [w, h] = cb.value.split('x').map(n => parseInt(n, 10));
      } else {
        w = h = parseInt(cb.value, 10);
      }
      jobs.push({ width: w, height: h });
    });
    
    if (jobs.length === 0) {
      showStatus('Select a preset or enable Generate Custom Size.', 'error');
      return;
    }
    
    const uniqueJobs = [];
    const seen = new Set();
    for (const job of jobs) {
      const key = `${job.width}x${job.height}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueJobs.push(job);
      }
    }
    
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    setControlsDisabled(true);
    
    const MAX_DIMENSION = 16384;
    const MAX_AREA = 64000000; // 64 MP limit
    
    const settings = {
      format: selectFormat.value,
      qualityPercentage: inputQuality.value,
      qualityVal: parseInt(inputQuality.value, 10) / 100,
      bgColor: inputJpegBg.value,
      fitMode: selectFitMode.value,
      cropAlign: selectCropAlign.value
    };
    
    const skippedJobs = [];
    
    for (const job of uniqueJobs) {
      if (job.width > MAX_DIMENSION || job.height > MAX_DIMENSION) {
        skippedJobs.push(`${job.width}×${job.height} exceeds max dimension`);
        continue;
      }
      if (job.width * job.height > MAX_AREA) {
        skippedJobs.push(`${job.width}×${job.height} exceeds size limit`);
        continue;
      }
      
      try {
        await generateImage(job.width, job.height, settings);
      } catch(e) {
        console.error(`Failed to generate ${job.width}x${job.height}: ${e.message}`);
        skippedJobs.push(`${job.width}×${job.height} failed to encode`);
      }
    }
    
    if (generatedFiles.length > 0) {
      resultsHeader.style.display = 'flex';
    }
    
    if (skippedJobs.length > 0) {
      showStatus(`Generated ${generatedFiles.length} images. Skipped ${skippedJobs.length}: ` + skippedJobs.join(', '), 'error');
    } else {
      showStatus(`Generated ${generatedFiles.length} images successfully.`, 'success');
    }
    
    btnGenerate.disabled = false;
    btnGenerate.innerHTML = '<i class="fas fa-cog"></i> Generate Images';
    setControlsDisabled(false);
  });
  
  async function generateImage(targetWidth, targetHeight, settings) {
    let canvas;
    if ('OffscreenCanvas' in window) {
      canvas = new OffscreenCanvas(targetWidth, targetHeight);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    
    const ctx = canvas.getContext('2d');
    const { fitMode, cropAlign, format, qualityVal, bgColor } = settings;
    
    const srcW = currentImageBitmap.width;
    const srcH = currentImageBitmap.height;
    
    if (format === 'image/jpeg') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
    
    if (fitMode === 'contain') {
      const ratio = Math.min(targetWidth / srcW, targetHeight / srcH);
      const drawW = srcW * ratio;
      const drawH = srcH * ratio;
      const offsetX = (targetWidth - drawW) / 2;
      const offsetY = (targetHeight - drawH) / 2;
      ctx.drawImage(currentImageBitmap, offsetX, offsetY, drawW, drawH);
    } else if (fitMode === 'cover') {
      const ratio = Math.max(targetWidth / srcW, targetHeight / srcH);
      const drawW = srcW * ratio;
      const drawH = srcH * ratio;
      
      let offsetX = 0;
      let offsetY = 0;
      
      if (cropAlign === 'center') {
        offsetX = (targetWidth - drawW) / 2;
        offsetY = (targetHeight - drawH) / 2;
      } else if (cropAlign === 'top') {
        offsetX = (targetWidth - drawW) / 2;
        offsetY = 0;
      } else if (cropAlign === 'bottom') {
        offsetX = (targetWidth - drawW) / 2;
        offsetY = targetHeight - drawH;
      } else if (cropAlign === 'left') {
        offsetX = 0;
        offsetY = (targetHeight - drawH) / 2;
      } else if (cropAlign === 'right') {
        offsetX = targetWidth - drawW;
        offsetY = (targetHeight - drawH) / 2;
      }
      
      ctx.drawImage(currentImageBitmap, offsetX, offsetY, drawW, drawH);
    } else {
      // stretch
      ctx.drawImage(currentImageBitmap, 0, 0, targetWidth, targetHeight);
    }
    
    let blob;
    if ('OffscreenCanvas' in window) {
      try {
        blob = await canvas.convertToBlob({ type: format, quality: qualityVal });
      } catch (e) {
        blob = null;
      }
    } else {
      blob = await new Promise(resolve => canvas.toBlob(resolve, format, qualityVal));
    }
    
    if (!blob) {
      throw new Error("Canvas encoding failed to produce a valid Blob.");
    }
    
    if (blob.type !== format) {
      throw new Error(`Browser failed to encode as ${format}.`);
    }
    
    const url = URL.createObjectURL(blob);
    generatedUrls.push(url);
    
    const rawName = currentFile.name;
    const nameWithoutExt = rawName.substring(0, rawName.lastIndexOf('.')) || rawName;
    const safeName = nameWithoutExt.replace(/[^a-z0-9_-]/gi, '_');
    
    const ext = format.split('/')[1];
    const qStr = (format === 'image/jpeg' || format === 'image/webp') ? `-q${settings.qualityPercentage}` : '';
    const outFilename = `${safeName}-${targetWidth}x${targetHeight}${qStr}.${ext}`;
    
    generatedFiles.push({ blob, filename: outFilename });
    renderResult(url, targetWidth, targetHeight, blob.size, outFilename, currentFile.size, format);
  }
  
  function renderResult(url, width, height, sizeBytes, filename, originalBytes, format) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const img = document.createElement('img');
    img.className = 'result-preview';
    img.alt = 'Generated Preview';
    img.src = url;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'result-info';
    
    const dimsDiv = document.createElement('div');
    dimsDiv.style.fontSize = '1.1rem';
    dimsDiv.style.fontWeight = 'bold';
    dimsDiv.style.marginBottom = '0.5rem';
    dimsDiv.textContent = `${width} × ${height}`;
    
    const fileDiv = document.createElement('div');
    fileDiv.style.color = 'var(--muted)';
    fileDiv.innerHTML = '<i class="fas fa-file-image"></i> ';
    const filenameNode = document.createTextNode(filename);
    fileDiv.appendChild(filenameNode);
    
    const sizeDiv = document.createElement('div');
    sizeDiv.style.color = 'var(--muted)';
    
    const diffBytes = sizeBytes - originalBytes;
    let diffStr = '';
    
    if (diffBytes > 0) {
      const pct = ((diffBytes / originalBytes) * 100).toFixed(1);
      diffStr = `<span style="color: #ff6b6b;"><i class="fas fa-arrow-up"></i> ${pct}% larger</span>`;
    } else if (diffBytes < 0) {
      const pct = (Math.abs(diffBytes) / originalBytes * 100).toFixed(1);
      diffStr = `<span style="color: #00dc78;"><i class="fas fa-arrow-down"></i> ${pct}% smaller</span>`;
    } else {
      diffStr = `<span style="color: var(--muted);">= Same size</span>`;
    }
    
    const extLabel = format.split('/')[1].toUpperCase();
    
    sizeDiv.innerHTML = `<i class="fas fa-weight-hanging"></i> ${formatBytes(sizeBytes)} &nbsp;&nbsp; ${diffStr} &nbsp;&nbsp; <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${extLabel}</span>`;
    
    infoDiv.appendChild(dimsDiv);
    infoDiv.appendChild(fileDiv);
    infoDiv.appendChild(sizeDiv);
    
    const actionDiv = document.createElement('div');
    const downloadBtn = document.createElement('a');
    downloadBtn.className = 'btn';
    downloadBtn.href = url;
    downloadBtn.download = filename;
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    actionDiv.appendChild(downloadBtn);
    
    card.appendChild(img);
    card.appendChild(infoDiv);
    card.appendChild(actionDiv);
    
    resultsContainer.appendChild(card);
  }
  
  btnDownloadAll.addEventListener('click', async () => {
    if (!window.JSZip) {
      alert("ZIP library failed to load or is unavailable.");
      return;
    }
    if (generatedFiles.length === 0) return;
    
    const originalBtnHTML = btnDownloadAll.innerHTML;
    btnDownloadAll.disabled = true;
    btnDownloadAll.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zipping...';
    
    try {
      const zip = new JSZip();
      for (const file of generatedFiles) {
        zip.file(file.filename, file.blob);
      }
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipContent);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `resized-images.zip`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error("ZIP Generation failed:", e);
      alert("Failed to generate ZIP archive.");
    }
    
    btnDownloadAll.innerHTML = originalBtnHTML;
    btnDownloadAll.disabled = false;
  });

  // Init
  initPresets();
})();
