/* ════════════════════════════════════════════════════════
   Roman Agency Admin — JavaScript
   Handles auth, navigation, media CRUD, FAQ, settings
   ════════════════════════════════════════════════════════ */

const API = window.location.origin;

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

const ADMIN_ASSET_PREVIEW_FILES = new Set([
  'Container.png',
  'image-removebg-preview.png',
  'meta-logo.png',
  'service-rental.png',
  'service-sales.png',
  'service-managed.png',
  'SD1.png',
  'SD2.png',
  'SD3.png',
  'SD5.png',
  'SD6.png',
  'SD7.png',
  'SD-extra.jpg',
  'BM-1.jpg',
  'BM-2.jpg',
  'BM-3.jpg',
  'gallery-large-1.jpg',
  'gallery-large-2.jpg',
  'gallery-large-3.jpg',
  'gallery-large-4.jpg',
  'gallery-large-5.jpg',
  'gallery-large-7.jpg',
  'gallery-large-8.jpg',
  'hero-bg.png',
]);

const ADMIN_ASSET_PREVIEW_2X_MAP = {
  'gallery-large-1.jpg': 'gallery-large-1.png',
  'gallery-large-2.jpg': 'gallery-large-2.png',
  'gallery-large-3.jpg': 'gallery-large-3.png',
  'gallery-large-4.jpg': 'gallery-large-4.png',
  'gallery-large-5.jpg': 'gallery-large-5.png',
  'gallery-large-6.jpg': 'gallery-large-6.png',
  'gallery-large-7.jpg': 'gallery-large-7.png',
  'gallery-large-8.jpg': 'gallery-large-8.png',
  'hero-bg.png': 'hero-bg.png',
};

const FAQ_LANG_META = {
  en: {
    label: '🇬🇧 English',
    questionLabel: 'Question *',
    answerLabel: 'Answer *',
    questionPlaceholder: 'Enter question in English…',
    answerPlaceholder: 'Enter answer in English…',
  },
  zh: {
    label: '🇨🇳 中文',
    questionLabel: 'Question',
    answerLabel: 'Answer',
    questionPlaceholder: '输入中文问题…',
    answerPlaceholder: '输入中文答案…',
  },
  ru: {
    label: '🇷🇺 Русский',
    questionLabel: 'Question',
    answerLabel: 'Answer',
    questionPlaceholder: 'Введите вопрос…',
    answerPlaceholder: 'Введите ответ…',
  },
};

let activeFaqLang = 'en';
const faqDraft = {
  en: { question: '', answer: '' },
  zh: { question: '', answer: '' },
  ru: { question: '', answer: '' },
};

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
  testimonials: 'Testimonials',
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
    else if (tab === 'testimonials') loadTestimonials();
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
      const previewSrc = getAdminMediaPreviewUrl(item);
      const previewMeta = getAdminMediaPreviewMeta(item, previewSrc);
      const card = document.createElement('div');
      card.className = 'media-card';
      card.innerHTML = `
        ${isVideo
          ? `<div class="media-card__thumb media-card__thumb--video">🎬 Video</div>`
          : `<img class="media-card__thumb" src="${previewSrc}" alt="${item.alt_text || item.file_name}" loading="lazy" />`
        }
        <div class="media-card__body">
          <div class="media-card__section-row">
            <div class="media-card__section">${escHtml(item.section)}</div>
            <span class="media-card__visibility ${item.is_visible ? 'is-visible' : 'is-hidden'}">${item.is_visible ? 'Visible' : 'Hidden'}</span>
          </div>
          <div class="media-card__name">${escHtml(item.file_name)}</div>
          <div class="media-card__meta">Slot: ${escHtml(item.slot || 'auto')} · ${formatBytes(item.file_size)}</div>
          <div class="media-card__meta">Preview: ${escHtml(previewMeta)}</div>
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

function getAdminMediaPreviewUrl(item) {
  if (item.mime_type?.startsWith('video/')) return item.r2_url;

  const retinaFile = ADMIN_ASSET_PREVIEW_2X_MAP[item.file_name];
  if (retinaFile) {
    return `./public/asset-preview-2x/${encodeURIComponent(retinaFile)}`;
  }

  if (ADMIN_ASSET_PREVIEW_FILES.has(item.file_name)) {
    return `./public/asset-preview/${encodeURIComponent(item.file_name)}`;
  }

  return item.r2_url;
}

function getAdminMediaPreviewMeta(item, previewSrc) {
  if (previewSrc === item.r2_url) {
    return item.r2_url ? 'R2 / published file' : 'No preview source';
  }

  const retinaFile = ADMIN_ASSET_PREVIEW_2X_MAP[item.file_name];
  if (retinaFile) {
    return `frontend asset 2x: ${retinaFile}`;
  }

  return `frontend asset: ${item.file_name}`;
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
  const list = document.getElementById('faq-list');
  list.innerHTML = '<div class="loading">Loading FAQs…</div>';

  const [enData, zhData, ruData] = await Promise.all([
    apiFetch('/api/admin/faqs?lang=en'),
    apiFetch('/api/admin/faqs?lang=zh'),
    apiFetch('/api/admin/faqs?lang=ru'),
  ]);

  const enFaqs = enData.data || [];
  const zhFaqs = zhData.data || [];
  const ruFaqs = ruData.data || [];
  const zhByOrder = new Map(zhFaqs.map(faq => [faq.sort_order, faq]));
  const ruByOrder = new Map(ruFaqs.map(faq => [faq.sort_order, faq]));

  document.getElementById('faq-count').textContent = `${enFaqs.length} FAQs`;

  list.innerHTML = '';

  if (!enFaqs.length) {
    list.innerHTML = '<div class="empty-state"><p>No FAQs yet. Add your first one!</p></div>';
    return;
  }

  enFaqs.forEach((faq) => {
    const zh = zhByOrder.get(faq.sort_order) || {};
    const ru = ruByOrder.get(faq.sort_order) || {};
    const translationCount = [zh.question ? 1 : 0, ru.question ? 1 : 0].reduce((sum, count) => sum + count, 0);

    const card = document.createElement('div');
    card.className = 'faq-card';
    card.innerHTML = `
      <div class="faq-card__body">
        <div class="faq-card__q">${escHtml(faq.question)}</div>
        <div class="faq-card__a">${escHtml(faq.answer)}</div>
        <div class="faq-card__meta">${translationCount ? `${translationCount} optional translation(s)` : 'Original content'}</div>
      </div>
      <div class="faq-card__actions">
        <button class="btn btn--ghost btn--sm" onclick="openFaqEdit(${faq.id}, ${zh.id || 'null'}, ${ru.id || 'null'}, ${faq.sort_order || 'null'})">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteFaqGroup(${faq.id}, ${zh.id || 'null'}, ${ru.id || 'null'})">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

const faqLangTabs = document.querySelectorAll('.faq-lang-switcher__tab');
const faqActiveLangLabel = document.getElementById('faq-active-lang-label');
const faqActiveQuestionLabel = document.getElementById('faq-active-question-label');
const faqActiveAnswerLabel = document.getElementById('faq-active-answer-label');
const faqQuestionInput = document.getElementById('faq-edit-question');
const faqAnswerInput = document.getElementById('faq-edit-answer');

function resetFaqDraft() {
  Object.keys(faqDraft).forEach((lang) => {
    faqDraft[lang].question = '';
    faqDraft[lang].answer = '';
  });
}

function syncActiveFaqDraft() {
  faqDraft[activeFaqLang].question = faqQuestionInput.value;
  faqDraft[activeFaqLang].answer = faqAnswerInput.value;
}

function renderActiveFaqLang() {
  const meta = FAQ_LANG_META[activeFaqLang];
  const draft = faqDraft[activeFaqLang];

  faqActiveLangLabel.textContent = meta.label;
  faqActiveQuestionLabel.textContent = meta.questionLabel;
  faqActiveAnswerLabel.textContent = meta.answerLabel;
  faqQuestionInput.placeholder = meta.questionPlaceholder;
  faqAnswerInput.placeholder = meta.answerPlaceholder;
  faqQuestionInput.value = draft.question;
  faqAnswerInput.value = draft.answer;

  faqLangTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.lang === activeFaqLang);
  });
}

function setActiveFaqLang(lang) {
  syncActiveFaqDraft();
  activeFaqLang = lang;
  renderActiveFaqLang();
}

faqLangTabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveFaqLang(tab.dataset.lang));
});

faqQuestionInput.addEventListener('input', syncActiveFaqDraft);
faqAnswerInput.addEventListener('input', syncActiveFaqDraft);

// Add FAQ btn
document.getElementById('add-faq-btn').addEventListener('click', () => {
  document.getElementById('faq-modal-title').textContent = 'Add FAQ';
  document.getElementById('faq-edit-id').value = '';
  document.getElementById('faq-edit-id-zh').value = '';
  document.getElementById('faq-edit-id-ru').value = '';
  document.getElementById('faq-edit-sort-order').value = '';
  document.getElementById('faq-error').hidden = true;
  resetFaqDraft();
  activeFaqLang = 'en';
  renderActiveFaqLang();
  document.getElementById('faq-modal').hidden = false;
});

document.getElementById('faq-modal-close').addEventListener('click', () => {
  document.getElementById('faq-modal').hidden = true;
});

document.getElementById('faq-cancel').addEventListener('click', () => {
  document.getElementById('faq-modal').hidden = true;
});

async function openFaqEdit(enId, zhId, ruId, sortOrder) {
  document.getElementById('faq-modal-title').textContent = 'Edit FAQ';
  document.getElementById('faq-edit-id').value = enId || '';
  document.getElementById('faq-edit-id-zh').value = zhId || '';
  document.getElementById('faq-edit-id-ru').value = ruId || '';
  document.getElementById('faq-edit-sort-order').value = sortOrder || '';

  resetFaqDraft();

  const [enData, zhData, ruData] = await Promise.all([
    enId ? apiFetch(`/api/admin/faqs/${enId}`) : Promise.resolve(null),
    zhId ? apiFetch(`/api/admin/faqs/${zhId}`) : Promise.resolve(null),
    ruId ? apiFetch(`/api/admin/faqs/${ruId}`) : Promise.resolve(null),
  ]);

  faqDraft.en.question = enData?.data?.question || '';
  faqDraft.en.answer = enData?.data?.answer || '';
  faqDraft.zh.question = zhData?.data?.question || '';
  faqDraft.zh.answer = zhData?.data?.answer || '';
  faqDraft.ru.question = ruData?.data?.question || '';
  faqDraft.ru.answer = ruData?.data?.answer || '';

  if (!sortOrder && enData?.data?.sort_order) {
    document.getElementById('faq-edit-sort-order').value = enData.data.sort_order;
  }

  document.getElementById('faq-error').hidden = true;
  activeFaqLang = 'en';
  renderActiveFaqLang();
  document.getElementById('faq-modal').hidden = false;
}

document.getElementById('faq-save').addEventListener('click', async () => {
  syncActiveFaqDraft();

  const enId = document.getElementById('faq-edit-id').value;
  const zhId = document.getElementById('faq-edit-id-zh').value;
  const ruId = document.getElementById('faq-edit-id-ru').value;
  const sortOrder = document.getElementById('faq-edit-sort-order').value;

  const enQ = faqDraft.en.question.trim();
  const enA = faqDraft.en.answer.trim();
  const zhQ = faqDraft.zh.question.trim();
  const zhA = faqDraft.zh.answer.trim();
  const ruQ = faqDraft.ru.question.trim();
  const ruA = faqDraft.ru.answer.trim();

  const errEl = document.getElementById('faq-error');

  if (!enQ || !enA) {
    errEl.textContent = 'English question and answer are required';
    errEl.hidden = false;
    if (activeFaqLang !== 'en') {
      activeFaqLang = 'en';
      renderActiveFaqLang();
    }
    return;
  }

  try {
    let finalSortOrder = sortOrder;

    if (enId) {
      await apiFetch(`/api/admin/faqs/${enId}`, { method: 'PATCH', body: JSON.stringify({ question: enQ, answer: enA }) });
    } else {
      const created = await apiFetch('/api/admin/faqs', { method: 'POST', body: JSON.stringify({ question: enQ, answer: enA, lang: 'en' }) });
      finalSortOrder = created.data?.sort_order || '';
    }

    const translationPayload = (question, answer) => {
      const payload = { question, answer };
      if (finalSortOrder) payload.sort_order = Number(finalSortOrder);
      return payload;
    };

    if (zhQ && zhA) {
      if (zhId) {
        await apiFetch(`/api/admin/faqs/${zhId}`, { method: 'PATCH', body: JSON.stringify({ question: zhQ, answer: zhA }) });
      } else {
        await apiFetch('/api/admin/faqs', { method: 'POST', body: JSON.stringify({ ...translationPayload(zhQ, zhA), lang: 'zh' }) });
      }
    }

    if (ruQ && ruA) {
      if (ruId) {
        await apiFetch(`/api/admin/faqs/${ruId}`, { method: 'PATCH', body: JSON.stringify({ question: ruQ, answer: ruA }) });
      } else {
        await apiFetch('/api/admin/faqs', { method: 'POST', body: JSON.stringify({ ...translationPayload(ruQ, ruA), lang: 'ru' }) });
      }
    }

    toast('FAQ saved');
    document.getElementById('faq-modal').hidden = true;
    loadFaqs();
  } catch {
    errEl.textContent = 'Failed to save FAQ';
    errEl.hidden = false;
  }
});

renderActiveFaqLang();

async function deleteFaqGroup(enId, zhId, ruId) {
  if (!confirm('Delete this FAQ in all languages?')) return;
  if (enId) await apiFetch(`/api/admin/faqs/${enId}`, { method: 'DELETE' });
  if (zhId) await apiFetch(`/api/admin/faqs/${zhId}`, { method: 'DELETE' });
  if (ruId) await apiFetch(`/api/admin/faqs/${ruId}`, { method: 'DELETE' });
  toast('FAQ deleted');
  loadFaqs();
}

/* ═══════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════ */
async function loadSettings() {
  const form = document.getElementById('settings-form');
  const saveBtn = document.getElementById('save-settings-btn');
  form.innerHTML = '<div class="loading">Loading settings…</div>';
  saveBtn.disabled = true;

  const data = await apiFetch('/api/admin/settings?lang=en');
  const settings = {};
  data.data.forEach(s => { settings[s.key] = s.value; });

  const statSpend = (settings.stat_spend || '20000000').replace(/[^0-9]/g, '');
  const statAccounts = (settings.stat_accounts || '50000').replace(/[^0-9]/g, '');
  const statSupport = (settings.stat_support || '24').replace(/[^0-9]/g, '');
  const statRefund = (settings.stat_refund || '100').replace(/[^0-9]/g, '');
  const pricingFee = (settings.pricing_fee || '8').replace(/[^0-9.]/g, '');
  const pricingDeposit = (settings.pricing_deposit || '100').replace(/[^0-9]/g, '');

  form.innerHTML = `
    <div class="settings-group">
      <div class="settings-group__title">Stats</div>
      <div class="form-group">
        <label>Ad Spend Managed</label>
        <div class="input-inline">
          <input type="number" class="input" id="s-stat_spend" value="${statSpend}" min="0" step="1" placeholder="20000000" />
          <span class="input-suffix">(USD)</span>
        </div>
        <small class="form-hint">Display on site: $${formatStatNumber(statSpend)}+</small>
      </div>
      <div class="form-group">
        <label>Active Accounts</label>
        <div class="input-inline">
          <input type="number" class="input" id="s-stat_accounts" value="${statAccounts}" min="0" step="1" placeholder="50000" />
          <span class="input-suffix">(accounts)</span>
        </div>
        <small class="form-hint">Display on site: ${formatStatNumber(statAccounts)}+</small>
      </div>
      <div class="form-group">
        <label>Support Hours</label>
        <div class="input-inline">
          <input type="number" class="input" id="s-stat_support" value="${statSupport}" min="0" step="1" placeholder="24" />
          <span class="input-suffix">(hours/day)</span>
        </div>
        <small class="form-hint">Display on site: ${statSupport}/7</small>
      </div>
      <div class="form-group">
        <label>Refund Guarantee</label>
        <div class="input-inline">
          <input type="number" class="input" id="s-stat_refund" value="${statRefund}" min="0" max="100" step="1" placeholder="100" />
          <span class="input-suffix">(%)</span>
        </div>
        <small class="form-hint">Display on site: ${statRefund}%</small>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group__title">Contact</div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" class="input" id="s-contact_email" value="${settings.contact_email || ''}" placeholder="romanagency888@gmail.com" />
      </div>
      <div class="form-group">
        <label>Telegram (personal)</label>
        <input type="url" class="input" id="s-contact_telegram" value="${settings.contact_telegram || ''}" placeholder="https://t.me/romanwarior" />
      </div>
      <div class="form-group">
        <label>Telegram Channel</label>
        <input type="url" class="input" id="s-contact_channel" value="${settings.contact_channel || ''}" placeholder="https://t.me/romanagency" />
      </div>
      <div class="form-group">
        <label>Website</label>
        <input type="url" class="input" id="s-contact_website" value="${settings.contact_website || ''}" placeholder="https://romanagency.net/" />
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group__title">Pricing</div>
      <div class="form-group">
        <label>Service Fee</label>
        <div class="input-inline">
          <input type="number" class="input" id="s-pricing_fee" value="${pricingFee}" min="0" max="100" step="0.1" placeholder="8" />
          <span class="input-suffix">(%)</span>
        </div>
        <small class="form-hint">Numbers only.</small>
      </div>
      <div class="form-group">
        <label>Minimum Deposit</label>
        <div class="input-inline">
          <input type="number" class="input" id="s-pricing_deposit" value="${pricingDeposit}" min="0" step="1" placeholder="100" />
          <span class="input-suffix">(USD)</span>
        </div>
        <small class="form-hint">Numbers only.</small>
      </div>
    </div>
  `;

  saveBtn.disabled = false;
  saveBtn.onclick = saveSettings;
}

function formatStatNumber(val) {
  const n = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  if (isNaN(n)) return val;
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return String(n);
}

async function saveSettings() {
  const keys = ['stat_spend', 'stat_accounts', 'stat_support', 'stat_refund',
    'contact_email', 'contact_telegram', 'contact_channel', 'contact_website',
    'pricing_fee', 'pricing_deposit'];

  const settings = {};
  keys.forEach(key => {
    const el = document.getElementById(`s-${key}`);
    if (!el) return;
    let val = el.value.trim();
    // Strip non-numeric for pricing fields
    if (key === 'pricing_fee' || key === 'pricing_deposit') {
      val = val.replace(/[^0-9.]/g, '');
    }
    // Strip non-numeric for stat fields
    if (key.startsWith('stat_')) {
      val = val.replace(/[^0-9]/g, '');
    }
    settings[key] = val;
  });

  await apiFetch('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ lang: 'en', settings }),
  });

  toast('Settings saved successfully!');
  loadSettings(); // Reload to show updated previews
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
   TESTIMONIALS TAB
   ═══════════════════════════════════════════════════════ */
async function loadTestimonials() {
  const list = document.getElementById('testimonial-list');
  list.innerHTML = '<div class="loading">Loading testimonials…</div>';

  const data = await apiFetch('/api/admin/testimonials?lang=en');
  const items = data.data || [];

  document.getElementById('testimonial-count').textContent = `${items.length} testimonials`;

  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><p>No testimonials yet. Add your first one!</p></div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'faq-card';
    card.innerHTML = `
      <div class="faq-card__body">
        <div class="faq-card__q">${escHtml(item.author_name)}${item.author_role ? ` — <span style="color:var(--text-dim);font-weight:400">${escHtml(item.author_role)}</span>` : ''}</div>
        <div class="faq-card__a">"${escHtml(item.content)}"</div>
      </div>
      <div class="faq-card__actions">
        <button class="btn btn--ghost btn--sm" onclick="openTestimonialEdit(${item.id})">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteTestimonial(${item.id})">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

document.getElementById('add-testimonial-btn').addEventListener('click', () => {
  document.getElementById('testimonial-modal-title').textContent = 'Add Testimonial';
  document.getElementById('testimonial-edit-id').value = '';
  document.getElementById('testimonial-name-en').value = '';
  document.getElementById('testimonial-role-en').value = '';
  document.getElementById('testimonial-content-en').value = '';
  document.getElementById('testimonial-error').hidden = true;
  document.getElementById('testimonial-modal').hidden = false;
});

document.getElementById('testimonial-modal-close').addEventListener('click', () => {
  document.getElementById('testimonial-modal').hidden = true;
});
document.getElementById('testimonial-cancel').addEventListener('click', () => {
  document.getElementById('testimonial-modal').hidden = true;
});

async function openTestimonialEdit(id) {
  document.getElementById('testimonial-modal-title').textContent = 'Edit Testimonial';
  document.getElementById('testimonial-edit-id').value = id || '';

  if (id) {
    const d = await apiFetch(`/api/admin/testimonials/${id}`);
    document.getElementById('testimonial-name-en').value = d.data?.author_name || '';
    document.getElementById('testimonial-role-en').value = d.data?.author_role || '';
    document.getElementById('testimonial-content-en').value = d.data?.content || '';
  } else {
    document.getElementById('testimonial-name-en').value = '';
    document.getElementById('testimonial-role-en').value = '';
    document.getElementById('testimonial-content-en').value = '';
  }

  document.getElementById('testimonial-error').hidden = true;
  document.getElementById('testimonial-modal').hidden = false;
}

document.getElementById('testimonial-save').addEventListener('click', async () => {
  const id = document.getElementById('testimonial-edit-id').value;
  const errEl = document.getElementById('testimonial-error');

  const name = document.getElementById('testimonial-name-en').value.trim();
  const role = document.getElementById('testimonial-role-en').value.trim();
  const content = document.getElementById('testimonial-content-en').value.trim();

  if (!name || !content) {
    errEl.textContent = 'Author name and content are required';
    errEl.hidden = false;
    return;
  }

  try {
    if (id) {
      await apiFetch(`/api/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify({ author_name: name, author_role: role, content }) });
    } else {
      await apiFetch('/api/admin/testimonials', { method: 'POST', body: JSON.stringify({ author_name: name, author_role: role, content, lang: 'en' }) });
    }

    toast('Testimonial saved');
    document.getElementById('testimonial-modal').hidden = true;
    loadTestimonials();
  } catch {
    errEl.textContent = 'Failed to save testimonial';
    errEl.hidden = false;
  }
});

async function deleteTestimonial(id) {
  if (!confirm('Delete this testimonial?')) return;
  await apiFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
  toast('Testimonial deleted');
  loadTestimonials();
}

/* ═══════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════ */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
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
  await loadPublishHistory();
}

document.getElementById('publish-btn').addEventListener('click', async () => {
  const notes = prompt('Publish notes (optional):', '') || '';
  const data = await apiFetch('/api/admin/publish', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });

  toast(`Published v${data.data.version}`);
  await loadPublishHistory();
});

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
