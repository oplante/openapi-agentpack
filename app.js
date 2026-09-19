/* SpecPack static demo UI — client-side generate + ZIP download */
(function () {
  'use strict';

  if (typeof SpecPack === 'undefined') {
    console.error('SpecPack bundle missing');
    return;
  }

  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const paste = document.getElementById('paste');
  const generateBtn = document.getElementById('generate');
  const chosen = document.getElementById('chosen');
  const errorEl = document.getElementById('error');
  const successEl = document.getElementById('success');

  let pending = { content: '', filename: '' };
  let lastObjectUrl = null;

  function hideMsgs() {
    errorEl.classList.remove('show');
    successEl.classList.remove('show');
    errorEl.innerHTML = '';
    successEl.innerHTML = '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showError(title, detail) {
    hideMsgs();
    errorEl.innerHTML =
      '<h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(detail || '') + '</p>';
    errorEl.classList.add('show');
  }

  function packFileList(files) {
    return Object.keys(files)
      .sort()
      .map(function (f) {
        return '<li><code>' + escapeHtml(f) + '</code></li>';
      })
      .join('');
  }

  function showSuccess(meta, files, zipBytes, filename, objectUrl) {
    hideMsgs();
    successEl.innerHTML =
      '<h3>Pack ready — ' +
      escapeHtml(meta.title || 'API') +
      ' v' +
      escapeHtml(meta.version || '') +
      '</h3>' +
      '<p>' +
      (meta.operations || 0) +
      ' operations · ' +
      zipBytes +
      ' byte ZIP · OpenAPI ' +
      escapeHtml(String(meta.openapi || '')) +
      '</p>' +
      '<p><strong>What’s in the pack</strong></p><ul>' +
      packFileList(files) +
      '</ul>' +
      '<div class="row"><a class="btn ok" id="dl" download="' +
      escapeHtml(filename) +
      '" href="' +
      escapeHtml(objectUrl) +
      '">Download ' +
      escapeHtml(filename) +
      '</a></div>' +
      (meta.warnings && meta.warnings.length
        ? '<p style="margin-top:12px">Warnings: ' +
          escapeHtml(meta.warnings.join('; ')) +
          '</p>'
        : '');
    successEl.classList.add('show');
  }

  function setPending(content, filename) {
    pending = { content: content || '', filename: filename || 'spec.json' };
    const ready = !!(pending.content && pending.content.trim());
    generateBtn.disabled = !ready;
    chosen.textContent = ready
      ? 'Ready: ' + pending.filename + ' (' + pending.content.length + ' chars)'
      : '';
    hideMsgs();
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function () {
        reject(reader.error || new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }

  async function onFile(file) {
    if (!file) return;
    try {
      const text = await readFile(file);
      setPending(text, file.name || 'spec.json');
    } catch (e) {
      showError('Could not read file', e.message || String(e));
    }
  }

  drop.addEventListener('click', function () {
    fileInput.click();
  });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.remove('dragover');
    });
  });
  drop.addEventListener('drop', function (e) {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFile(f);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) onFile(fileInput.files[0]);
  });
  paste.addEventListener('input', function () {
    const t = paste.value;
    if (t.trim()) {
      document.getElementById('pasteDetails').open = true;
      setPending(t, t.trim().startsWith('{') ? 'pasted.json' : 'pasted.yaml');
    } else if (!fileInput.files || !fileInput.files.length) {
      setPending('', '');
    }
  });

  generateBtn.addEventListener('click', async function () {
    if (!pending.content.trim()) return;
    hideMsgs();
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating…';
    try {
      const result = await SpecPack.generateSpecPackBuffer(pending.content, {
        filename: pending.filename,
      });
      const zipName = SpecPack.suggestZipFilename(pending.filename);
      if (lastObjectUrl) {
        try {
          URL.revokeObjectURL(lastObjectUrl);
        } catch (_) {}
      }
      const blob = new Blob([result.buffer], { type: 'application/zip' });
      lastObjectUrl = URL.createObjectURL(blob);
      showSuccess(
        result.meta,
        result.files,
        result.buffer.length,
        zipName,
        lastObjectUrl
      );
    } catch (e) {
      const code = e && e.code ? '[' + e.code + '] ' : '';
      showError('Could not generate pack', code + (e.message || String(e)));
    } finally {
      generateBtn.textContent = 'Generate pack';
      generateBtn.disabled = !(pending.content && pending.content.trim());
    }
  });
})();
