/* ════════════════════════════════════════════════════════
   Roman Agency Admin — JavaScript
   Handles auth, navigation, media CRUD, FAQ, settings
   ════════════════════════════════════════════════════════ */

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : window.location.origin;

// ── Auth guard ───────────────────────────────────────────
const token = localStorage.getItem('ra_token');
if (!token) {
  window.location.href = './login.html';
}

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

// ── Sidebar user ─────────────────────────────────────────
document.getElementById('sidebar-user').textContent =
  localStorage.getItem('ra_username') || 'admin';

const publishVersionBadge = document.getElementById('publish-version-badge');

// ── Logout ───────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('ra_token');
  localStorage.removeItem('ra_username');
  window.location.href = './login.html';
});

// ── Tab Navigation ───────────────────────────────────────
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.tab-panel');
const pageTitle = document.getElementById('page-title');

const TAB_TITLES = {
  media: 'Media Manager',
  faq: 'FAQ Manager',
  settings: 'Site Settings',
  subscribers: 'Subscribers',
};

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    navItems.forEach(n => n.classList.remove('is-active'));
    panels.forEach(p => p.classList.remove('is-active'));
    item.classList.add('is-active');
    document.querySelector(`[data-panel="${tab}"]`)?.classList.add('is-active');
    pageTitle.textContent = TAB_TITLES[tab] || tab;

    if (tab === 'faq') loadFaqs();
    else if (tab === 'settings') loadSettings();
    else if (tab === 'subscribers') loadSubscribers();
  });
});

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ── API error handler ─────────────────────────────────────
async function apiFetch(url, opts = {}) {
  try {
    const res = await fetch(`${API}${url}`, {
      ...opts,
      headers: opts.body instanceof FormData
        ? { 'Authorization': `Bearer ${token}` }
        : headers(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'API error');
    return data;
  } catch (err) {
    toast(err.message, 'error');
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════
   MEDIA TAB
   ═══════════════════════════════════════════════════════ */
async function loadMedia(section = '') {
  const grid = document.getElementById('media-grid');
  const empty = document.getElementById('media-empty');
  grid.innerHTML = '<div class="loading">Loading media…</div>';

  const url = section ? `/api/admin/media?section=${encodeURIComponent(section)}` : '/api/admin/media';
  const data = await apiFetch(url);
  const items = data.data;

  grid.innerHTML = '';

  if (!items.length) {
    grid.appendChild(empty);
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.section)) groups.set(item.section, []);
    groups.get(item.section).push(item);
  });

  groups.forEach((sectionItems, sectionName) => {
    const group = document.createElement('section');
    group.className = 'media-group';

    const visibleCount = sectionItems.filter((item) => item.is_visible).length;
    const groupHeader = document.createElement('div');
    groupHeader.className = 'media-group__header';
    groupHeader.innerHTML = `
      <div>
        <div class="media-group__title">${escHtml(sectionName)}</div>
        <div class="media-group__meta">${sectionItems.length} item(s) · ${visibleCount} visible</div>
      </div>
    `;

    const cards = document.createElement('div');
    cards.className = 'media-group__grid';

    sectionItems.forEach(item => {
      const isVideo = item.mime_type?.startsWith('video/');
      const card = document.createElement('div');
      card.className = 'media-card';
      card.innerHTML = `
        ${isVideo
          ? `<div class="media-card__thumb media-card__thumb--video">🎬 Video</div>`
          : `<img class="media-card__thumb" src="${item.r2_url}" alt="${item.alt_text || item.file_name}" loading="lazy" />`
        }
        <div class="media-card__body">
          <div class="media-card__section-row">
            <div class="media-card__section">${escHtml(item.section)}</div>
            <span class="media-card__visibility ${item.is_visible ? 'is-visible' : 'is-hidden'}">${item.is_visible ? 'Visible' : 'Hidden'}</span>
          </div>
          <div class="media-card__name">${escHtml(item.file_name)}</div>
          <div class="media-card__meta">Slot: ${escHtml(item.slot || 'auto')} · ${formatBytes(item.file_size)}</div>
          ${item.alt_text ? `<div class="media-card__meta">Alt: ${escHtml(item.alt_text)}</div>` : ''}
          ${item.caption ? `<div class="media-card__meta">Caption: ${escHtml(item.caption)}</div>` : ''}
        </div>
        <div class="media-card__actions">
          <button class="btn btn--ghost btn--sm" onclick="toggleVisible('${item.id}', ${item.is_visible})">
            ${item.is_visible ? 'Hide' : 'Show'}
          </button>
          <button class="btn btn--ghost btn--sm" onclick="replaceMedia('${item.id}', '${item.file_name.replace(/'/g, "\\'")}')">Replace</button>
          <button class="btn btn--danger btn--sm" onclick="deleteMedia('${item.id}', '${item.file_name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      `;
      cards.appendChild(card);
    });

    group.appendChild(groupHeader);
    group.appendChild(cards);
    grid.appendChild(group);
  });
}

// Initial load
loadMedia();
loadPublishHistory();

// Section filter
document.getElementById('media-section-filter').addEventListener('change', (e) => {
  loadMedia(e.target.value);
});

async function toggleVisible(id, currentVisible) {
  await apiFetch(`/api/admin/media/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_visible: currentVisible ? 0 : 1 }),
  });
  toast(currentVisible ? 'Hidden from site' : 'Now visible on site');
  loadMedia(document.getElementById('media-section-filter').value);
}

async function deleteMedia(id, name) {
  if (!confirm(`Delete "${name}"? This will remove it from R2 as well.`)) return;
  await apiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
  toast('Media deleted');
  loadMedia(document.getElementById('media-section-filter').value);
}

async function replaceMedia(id, name) {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/*,video/mp4,video/webm';
  picker.onchange = async () => {
    const file = picker.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${API}/api/admin/media/${id}/replace`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();
    if (!data.success) {
      toast(data.error?.message || 'Replace failed', 'error');
      return;
    }

    toast(`Replaced ${name}`);
    loadMedia(document.getElementById('media-section-filter').value);
  };
  picker.click();
}

// ── Upload Modal ──────────────────────────────────────────
const uploadModal = document.getElementById('upload-modal');
document.getElementById('upload-btn').addEventListener('click', () => { uploadModal.hidden = false; });
document.getElementById('upload-modal-close').addEventListener('click', () => { uploadModal.hidden = true; });
document.getElementById('upload-cancel').addEventListener('click', () => { uploadModal.hidden = true; });

// Drag & drop
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('upload-file');
let selectedFile = null;

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('is-drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

dropZone.addEventListener('click', (e) => {
  if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
  selectedFile = file;
  const preview = document.getElementById('drop-preview');
  preview.hidden = false;
  preview.textContent = `📎 ${file.name} (${formatBytes(file.size)})`;
}

document.getElementById('upload-submit').addEventListener('click', async () => {
  if (!selectedFile) return toast('Please select a file', 'error');

  const section = document.getElementById('upload-section').value;
  const slot = document.getElementById('upload-slot').value.trim();
  const alt = document.getElementById('upload-alt').value.trim();
  const caption = document.getElementById('upload-caption').value.trim();
  const captionSub = document.getElementById('upload-caption-sub').value.trim();

  const form = new FormData();
  form.append('file', selectedFile);
  form.append('section', section);
  if (slot) form.append('slot', slot);
  if (alt) form.append('alt_text', alt);
  if (caption) form.append('caption', caption);
  if (captionSub) form.append('caption_sub', captionSub);

  const btn = document.getElementById('upload-submit');
  const btnText = document.getElementById('upload-submit-text');
  const spinner = document.getElementById('upload-spinner');

  btn.disabled = true;
  btnText.textContent = 'Uploading…';
  spinner.hidden = false;

  try {
    await fetch(`${API}/api/admin/media/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    }).then(r => r.json()).then(d => {
      if (!d.success) throw new Error(d.error?.message || 'Upload failed');
    });

    toast('Media uploaded successfully');
    uploadModal.hidden = true;
    selectedFile = null;
    document.getElementById('drop-preview').hidden = true;
    loadMedia();
  } catch (err) {
    document.getElementById('upload-error').textContent = err.message;
    document.getElementById('upload-error').hidden = false;
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Upload';
    spinner.hidden = true;
  }
});

/* ═══════════════════════════════════════════════════════
   FAQ TAB
   ═══════════════════════════════════════════════════════ */
async function loadFaqs() {
  const lang = document.getElementById('faq-lang-filter').value;
  const list = document.getElementById('faq-list');
  list.innerHTML = '<div class="loading">Loading FAQs…</div>';

  const data = await apiFetch(`/api/admin/faqs?lang=${lang}`);
  const faqs = data.data;

  list.innerHTML = '';

  if (!faqs.length) {
    list.innerHTML = '<div class="empty-state"><p>No FAQs yet. Add your first one!</p></div>';
    return;
  }

  faqs.forEach(faq => {
    const card = document.createElement('div');
    card.className = 'faq-card';
    card.innerHTML = `
      <div class="faq-card__body">
        <div class="faq-card__q">${escHtml(faq.question)}</div>
        <div class="faq-card__a">${escHtml(faq.answer)}</div>
      </div>
      <div class="faq-card__actions">
        <button class="btn btn--ghost btn--sm" onclick="openFaqEdit(${faq.id}, '${escHtml(faq.question).replace(/'/g, "\\'")}', '${escHtml(faq.answer).replace(/'/g, "\\'")}', '${faq.lang}')">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteFaq(${faq.id})">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

document.getElementById('faq-lang-filter').addEventListener('change', loadFaqs);

// Add FAQ btn
document.getElementById('add-faq-btn').addEventListener('click', () => {
  document.getElementById('faq-modal-title').textContent = 'Add FAQ';
  document.getElementById('faq-edit-id').value = '';
  document.getElementById('faq-edit-q').value = '';
  document.getElementById('faq-edit-a').value = '';
  document.getElementById('faq-edit-lang').value = document.getElementById('faq-lang-filter').value;
  document.getElementById('faq-error').hidden = true;
  document.getElementById('faq-modal').hidden = false;
});

document.getElementById('faq-modal-close').addEventListener('click', () => {
  document.getElementById('faq-modal').hidden = true;
});

document.getElementById('faq-cancel').addEventListener('click', () => {
  document.getElementById('faq-modal').hidden = true;
});

function openFaqEdit(id, question, answer, lang) {
  document.getElementById('faq-modal-title').textContent = 'Edit FAQ';
  document.getElementById('faq-edit-id').value = id;
  document.getElementById('faq-edit-q').value = question;
  document.getElementById('faq-edit-a').value = answer;
  document.getElementById('faq-edit-lang').value = lang;
  document.getElementById('faq-error').hidden = true;
  document.getElementById('faq-modal').hidden = false;
}

document.getElementById('faq-save').addEventListener('click', async () => {
  const id = document.getElementById('faq-edit-id').value;
  const question = document.getElementById('faq-edit-q').value.trim();
  const answer = document.getElementById('faq-edit-a').value.trim();
  const lang = document.getElementById('faq-edit-lang').value;
  const errEl = document.getElementById('faq-error');

  if (!question || !answer) {
    errEl.textContent = 'Question and answer are required';
    errEl.hidden = false;
    return;
  }

  try {
    if (id) {
      await apiFetch(`/api/admin/faqs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ question, answer }),
      });
      toast('FAQ updated');
    } else {
      await apiFetch('/api/admin/faqs', {
        method: 'POST',
        body: JSON.stringify({ question, answer, lang }),
      });
      toast('FAQ added');
    }
    document.getElementById('faq-modal').hidden = true;
    loadFaqs();
  } catch {
    errEl.textContent = 'Failed to save FAQ';
    errEl.hidden = false;
  }
});

async function deleteFaq(id) {
  if (!confirm('Delete this FAQ?')) return;
  await apiFetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
  toast('FAQ deleted');
  loadFaqs();
}

/* ═══════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════ */
async function loadSettings() {
  const form = document.getElementById('settings-form');
  form.innerHTML = '<div class="loading">Loading settings…</div>';

  const data = await apiFetch('/api/admin/settings?lang=en');
  const settings = {};
  data.data.forEach(s => { settings[s.key] = s.value; });

  form.innerHTML = `
    <div class="settings-group">
      <div class="settings-group__title">Stats</div>
      <div class="form-group">
        <label>Ad Spend Managed</label>
        <input type="text" class="input" id="s-stat_spend" value="${settings.stat_spend || '$20M+'}" />
      </div>
      <div class="form-group">
        <label>Active Accounts</label>
        <input type="text" class="input" id="s-stat_accounts" value="${settings.stat_accounts || '50K+'}" />
      </div>
      <div class="form-group">
        <label>Support</label>
        <input type="text" class="input" id="s-stat_support" value="${settings.stat_support || '24/7'}" />
      </div>
      <div class="form-group">
        <label>Refund Guarantee</label>
        <input type="text" class="input" id="s-stat_refund" value="${settings.stat_refund || '100%'}" />
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group__title">Contact</div>
      <div class="form-group">
        <label>Email</label>
        <input type="text" class="input" id="s-contact_email" value="${settings.contact_email || ''}" />
      </div>
      <div class="form-group">
        <label>Telegram (personal)</label>
        <input type="text" class="input" id="s-contact_telegram" value="${settings.contact_telegram || ''}" />
      </div>
      <div class="form-group">
        <label>Telegram Channel</label>
        <input type="text" class="input" id="s-contact_channel" value="${settings.contact_channel || ''}" />
      </div>
      <div class="form-group">
        <label>Website</label>
        <input type="text" class="input" id="s-contact_website" value="${settings.contact_website || ''}" />
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group__title">Pricing</div>
      <div class="form-group">
        <label>Service Fee</label>
        <input type="text" class="input" id="s-pricing_fee" value="${settings.pricing_fee || '8%'}" />
      </div>
      <div class="form-group">
        <label>Minimum Deposit</label>
        <input type="text" class="input" id="s-pricing_deposit" value="${settings.pricing_deposit || '$100'}" />
      </div>
    </div>
    <div class="settings-actions">
      <button class="btn btn--primary" id="save-settings-btn">Save All Settings</button>
    </div>
  `;

  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
}

async function saveSettings() {
  const keys = ['stat_spend', 'stat_accounts', 'stat_support', 'stat_refund',
    'contact_email', 'contact_telegram', 'contact_channel', 'contact_website',
    'pricing_fee', 'pricing_deposit'];

  const settings = {};
  keys.forEach(key => {
    const el = document.getElementById(`s-${key}`);
    if (el) settings[key] = el.value.trim();
  });

  await apiFetch('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ lang: 'en', settings }),
  });

  toast('Settings saved successfully!');
}

/* ═══════════════════════════════════════════════════════
   SUBSCRIBERS TAB
   ═══════════════════════════════════════════════════════ */
async function loadSubscribers(page = 1) {
  const tbody = document.getElementById('subscribers-body');
  tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';

  const data = await apiFetch(`/api/admin/subscribers?page=${page}&limit=50`);
  const { data: subs, meta } = data;

  document.getElementById('sub-count').textContent = `${meta.total} subscribers`;

  tbody.innerHTML = '';

  if (!subs.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:24px">No subscribers yet</td></tr>';
    return;
  }

  subs.forEach(sub => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(sub.email)}</td>
      <td>${new Date(sub.created_at).toLocaleDateString()}</td>
      <td style="color:var(--text-dim)">${sub.origin || '—'}</td>
      <td><button class="btn btn--danger btn--sm" onclick="deleteSubscriber(${sub.id}, '${escHtml(sub.email)}')">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteSubscriber(id, email) {
  if (!confirm(`Remove ${email} from subscribers?`)) return;
  await apiFetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
  toast('Subscriber removed');
  loadSubscribers();
}

// Export CSV
document.getElementById('export-csv-btn').addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    const res = await fetch(`${API}/api/admin/subscribers/export`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || 'Export failed');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('CSV exported');
  } catch (err) {
    toast(err.message || 'Export failed', 'error');
  }
});

/* ═══════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════ */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

async function loadPublishPreview() {
  const box = document.getElementById('publish-preview-box');
  box.textContent = 'Loading preview…';

  const data = await apiFetch('/api/admin/publish/preview');
  const preview = data.data;

  box.innerHTML = `
    <div><strong>Next version:</strong> v${preview.summary.nextVersion}</div>
    <div><strong>Sections:</strong> ${preview.summary.sections}</div>
    <div><strong>Items:</strong> ${preview.summary.items}</div>
    <div><strong>Hash:</strong> <code>${preview.summary.hash.slice(0, 16)}…</code></div>
    <div><strong>Has changes:</strong> ${preview.diff.hasChanges ? 'Yes' : 'No'}</div>
  `;
}

async function loadPublishHistory() {
  const box = document.getElementById('publish-history-box');
  box.textContent = 'Loading history…';

  const data = await apiFetch('/api/admin/publish/history');
  const releases = data.data || [];
  const currentVersion = data.meta?.currentVersion;

  publishVersionBadge.textContent = currentVersion ? `Live: v${currentVersion}` : 'Live: not published';

  if (!releases.length) {
    box.textContent = 'No publish history yet.';
    return;
  }

  box.innerHTML = releases.map((release) => `
    <div class="publish-history-item">
      <div class="publish-history-item__top">
        <div><strong>v${release.version}</strong>${release.version === currentVersion ? ' · live' : ''}</div>
        ${release.version === currentVersion ? '' : `<button class="btn btn--ghost btn--sm" onclick="rollbackRelease(${release.id}, ${release.version})">Rollback</button>`}
      </div>
      <div class="publish-history-item__meta">${new Date(release.created_at).toLocaleString()}</div>
      <div class="publish-history-item__meta">${release.notes || 'No notes'}</div>
    </div>
  `).join('');
}

async function rollbackRelease(id, version) {
  if (!confirm(`Rollback live site to v${version}?`)) return;
  await apiFetch(`/api/admin/publish/${id}/rollback`, { method: 'POST' });
  toast(`Rolled back to v${version}`);
  await loadPublishPreview();
  await loadPublishHistory();
}

document.getElementById('publish-preview-btn').addEventListener('click', async () => {
  await loadPublishPreview();
  toast('Publish preview updated');
});

document.getElementById('publish-btn').addEventListener('click', async () => {
  const notes = prompt('Publish notes (optional):', '') || '';
  const data = await apiFetch('/api/admin/publish', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });

  toast(`Published v${data.data.version}`);
  await loadPublishPreview();
  await loadPublishHistory();
});

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
