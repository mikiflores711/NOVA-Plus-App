const API_BASE = "https://nova-tv-api.mikimc-business.workers.dev";

const state = {
  token: sessionStorage.getItem("novaTvAdminToken") || "",
  categories: [],
  channels: [],
  reports: []
};

const $ = (id) => document.getElementById(id);

function escapeHtml(v="") {
  return String(v).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function toast(message, error=false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", error);
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

async function api(path, options={}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  if (path.startsWith("/api/admin/")) {
    if (!state.token) throw new Error("Primero configura tu ADMIN_TOKEN.");
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  const res = await fetch(API_BASE + path, {...options, headers});
  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    if (res.status === 401) throw new Error("Token administrativo incorrecto o no configurado.");
    throw new Error(data?.error || `Error HTTP ${res.status}`);
  }
  return data;
}

async function checkApi() {
  try {
    await api("/api/health");
    $("apiStatus").textContent = "● API conectada";
    $("apiStatus").className = "status online";
  } catch {
    $("apiStatus").textContent = "● API sin conexión";
    $("apiStatus").className = "status offline";
  }
}

function renderCategoryOptions() {
  const filter = $("categoryFilter");
  const formSelect = $("categoryId");

  filter.innerHTML = `<option value="">Todas las categorías</option>` +
    state.categories.map(c => `<option value="${c.slug}">${escapeHtml(c.name)}</option>`).join("");

  formSelect.innerHTML = state.categories.map(c =>
    `<option value="${c.id}">${escapeHtml(c.name)}</option>`
  ).join("");
}

async function loadCategories() {
  try {
    state.categories = await api("/api/categories");
    renderCategoryOptions();
    $("categoriesList").innerHTML = state.categories.length
      ? state.categories.map(c => `
          <div class="category-item">
            <strong>${escapeHtml(c.name)}</strong>
            <small>${escapeHtml(c.slug)} · orden ${c.sort_order}</small>
          </div>`).join("")
      : `<div class="empty">No hay categorías.</div>`;
  } catch (e) {
    toast(e.message, true);
  }
}

function filteredChannels() {
  const q = $("channelSearch").value.trim().toLowerCase();
  const cat = $("categoryFilter").value;
  return state.channels.filter(c => {
    const matchesText = !q || [c.name,c.number,c.tvg_id,c.provider,c.category_name]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    const matchesCat = !cat || c.category_slug === cat;
    return matchesText && matchesCat;
  });
}

function renderChannels() {
  const rows = filteredChannels();
  const box = $("channelsList");

  if (!rows.length) {
    box.innerHTML = `<div class="empty">No se encontraron canales.</div>`;
    return;
  }

  box.innerHTML = rows.map(c => `
    <article class="channel-card">
      ${c.logo_url
        ? `<img class="channel-logo" src="${escapeHtml(c.logo_url)}" alt="" onerror="this.outerHTML='<div class=&quot;logo-fallback&quot;>LOGO</div>'">`
        : `<div class="logo-fallback">LOGO</div>`}
      <div class="channel-main">
        <div class="channel-title">
          <span>${escapeHtml(c.number || "")}</span>
          <span>${escapeHtml(c.name)}</span>
        </div>
        <div class="channel-sub">${escapeHtml(c.stream_url)}</div>
        <div class="pills">
          <span class="pill">${escapeHtml(c.category_name)}</span>
          <span class="pill ${c.active ? "active":"off"}">${c.active ? "Activo":"Oculto"}</span>
          ${c.featured ? `<span class="pill featured">Destacado</span>` : ""}
          ${c.backup_url ? `<span class="pill">Respaldo</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button class="icon-action" data-action="play" data-id="${c.id}" title="Probar enlace">▶</button>
        <button class="icon-action" data-action="edit" data-id="${c.id}" title="Editar">✎</button>
        <button class="icon-action danger" data-action="delete" data-id="${c.id}" title="Eliminar">🗑</button>
      </div>
    </article>
  `).join("");
}

async function loadChannels() {
  try {
    state.channels = await api("/api/admin/channels");
    renderChannels();
  } catch (e) {
    $("channelsList").innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
    toast(e.message, true);
    if (!state.token) $("tokenDialog").showModal();
  }
}

function openAddChannel() {
  $("channelForm").reset();
  $("channelId").value = "";
  $("channelDialogTitle").textContent = "Agregar canal";
  $("active").checked = true;
  $("sortOrder").value = state.channels.length + 1;
  updatePreview();
  $("channelDialog").showModal();
}

function openEditChannel(c) {
  $("channelDialogTitle").textContent = "Editar canal";
  $("channelId").value = c.id;
  $("name").value = c.name || "";
  $("number").value = c.number || "";
  $("logoUrl").value = c.logo_url || "";
  $("streamUrl").value = c.stream_url || "";
  $("backupUrl").value = c.backup_url || "";
  $("categoryId").value = c.category_id || "";
  $("sortOrder").value = c.sort_order ?? 0;
  $("tvgId").value = c.tvg_id || "";
  $("channelExternalId").value = c.channel_id || "";
  $("provider").value = c.provider || "";
  $("epgId").value = c.epg_id || "";
  $("active").checked = !!c.active;
  $("featured").checked = !!c.featured;
  updatePreview();
  $("channelDialog").showModal();
}

function formPayload() {
  return {
    name: $("name").value.trim(),
    number: $("number").value.trim() || null,
    logo_url: $("logoUrl").value.trim() || null,
    stream_url: $("streamUrl").value.trim(),
    backup_url: $("backupUrl").value.trim() || null,
    category_id: Number($("categoryId").value),
    sort_order: Number($("sortOrder").value || 0),
    tvg_id: $("tvgId").value.trim() || null,
    channel_id: $("channelExternalId").value.trim() || null,
    tvg_name: $("name").value.trim(),
    provider: $("provider").value.trim() || null,
    epg_id: $("epgId").value.trim() || null,
    active: $("active").checked,
    featured: $("featured").checked
  };
}

async function saveChannel(ev) {
  ev.preventDefault();
  const id = $("channelId").value;
  const payload = formPayload();

  if (!payload.name || !payload.stream_url || !payload.category_id) {
    toast("Completa nombre, URL y categoría.", true);
    return;
  }

  try {
    if (id) {
      await api(`/api/admin/channels/${id}`, {method:"PUT", body:JSON.stringify(payload)});
      toast("Canal actualizado.");
    } else {
      await api("/api/admin/channels", {method:"POST", body:JSON.stringify(payload)});
      toast("Canal agregado.");
    }
    $("channelDialog").close();
    await loadChannels();
  } catch (e) {
    toast(e.message, true);
  }
}

async function deleteChannel(c) {
  if (!confirm(`¿Eliminar definitivamente "${c.name}"?\n\nTambién se eliminarán sus reportes asociados.`)) return;
  try {
    await api(`/api/admin/channels/${c.id}`, {method:"DELETE"});
    toast("Canal eliminado.");
    await Promise.all([loadChannels(), loadReports()]);
  } catch (e) {
    toast(e.message, true);
  }
}

function testStream(url) {
  if (!url) return toast("Este canal no tiene URL.", true);
  window.open(url, "_blank", "noopener,noreferrer");
}

async function loadReports() {
  try {
    state.reports = await api("/api/admin/reports");
    const open = state.reports.filter(r => r.status === "open");
    $("reportBadge").textContent = open.length;
    $("reportBadge").classList.toggle("hidden", open.length === 0);

    const box = $("reportsList");
    if (!state.reports.length) {
      box.innerHTML = `<div class="empty">Todavía no hay reportes.</div>`;
      return;
    }

    box.innerHTML = state.reports.map(r => `
      <article class="report-card">
        <div class="report-count">${Number(r.same_status_count || 1)}</div>
        <div class="channel-main">
          <div class="channel-title">${escapeHtml(r.channel_name)}</div>
          <div class="channel-sub">${escapeHtml(r.reason)} · ${escapeHtml(r.created_at)}</div>
          <div class="pills">
            <span class="pill ${r.status === "open" ? "off":"active"}">
              ${r.status === "open" ? "Pendiente":"Resuelto"}
            </span>
          </div>
        </div>
        <div class="card-actions">
          ${r.status === "open"
            ? `<button class="icon-action" data-report-action="resolve" data-id="${r.id}">✓ Resolver</button>`
            : `<button class="icon-action" data-report-action="reopen" data-id="${r.id}">↩ Reabrir</button>`
          }
        </div>
      </article>
    `).join("");
  } catch (e) {
    $("reportsList").innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function setReportStatus(id, status) {
  try {
    await api(`/api/admin/reports/${id}`, {
      method:"PUT",
      body:JSON.stringify({status})
    });
    toast(status === "resolved" ? "Reporte resuelto." : "Reporte reabierto.");
    await loadReports();
  } catch (e) {
    toast(e.message, true);
  }
}

function updatePreview() {
  const name = $("name").value.trim() || "Vista previa";
  const url = $("streamUrl").value.trim() || "URL del stream";
  const logo = $("logoUrl").value.trim();
  $("previewName").textContent = name;
  $("previewUrl").textContent = url;
  const lp = $("logoPreview");
  if (logo) {
    lp.textContent = "";
    lp.style.backgroundImage = `url("${logo.replace(/"/g,"%22")}")`;
  } else {
    lp.textContent = "LOGO";
    lp.style.backgroundImage = "";
  }
}

document.querySelectorAll(".nav").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    $(`view-${btn.dataset.view}`).classList.add("active");
    if (btn.dataset.view === "reports") loadReports();
  });
});

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => $(btn.dataset.close).close());
});

$("btnToken").onclick = () => {
  $("adminToken").value = state.token;
  $("tokenDialog").showModal();
};
$("tokenForm").addEventListener("submit", async ev => {
  ev.preventDefault();
  state.token = $("adminToken").value.trim();
  sessionStorage.setItem("novaTvAdminToken", state.token);
  $("tokenDialog").close();
  toast("Token guardado para esta sesión.");
  await Promise.all([loadChannels(), loadReports()]);
});
$("btnForgetToken").onclick = () => {
  state.token = "";
  sessionStorage.removeItem("novaTvAdminToken");
  $("adminToken").value = "";
  toast("Token eliminado de esta sesión.");
};

$("btnAddChannel").onclick = openAddChannel;
$("channelForm").addEventListener("submit", saveChannel);
$("btnReloadChannels").onclick = loadChannels;
$("btnReloadCategories").onclick = loadCategories;
$("btnReloadReports").onclick = loadReports;
$("channelSearch").addEventListener("input", renderChannels);
$("categoryFilter").addEventListener("change", renderChannels);

["name","streamUrl","logoUrl"].forEach(id => $(id).addEventListener("input", updatePreview));
$("btnTestStream").onclick = () => testStream($("streamUrl").value.trim());

$("channelsList").addEventListener("click", ev => {
  const btn = ev.target.closest("[data-action]");
  if (!btn) return;
  const c = state.channels.find(x => x.id === Number(btn.dataset.id));
  if (!c) return;
  if (btn.dataset.action === "edit") openEditChannel(c);
  if (btn.dataset.action === "delete") deleteChannel(c);
  if (btn.dataset.action === "play") testStream(c.stream_url);
});

$("reportsList").addEventListener("click", ev => {
  const btn = ev.target.closest("[data-report-action]");
  if (!btn) return;
  setReportStatus(Number(btn.dataset.id), btn.dataset.reportAction === "resolve" ? "resolved" : "open");
});

(async function init(){
  await checkApi();
  await loadCategories();

  if (!state.token) {
    $("tokenDialog").showModal();
  } else {
    await Promise.all([loadChannels(), loadReports()]);
  }
})();
