/* ============================================================
   АДМИНКА — вход, товары, фото, настройки
   Требует заполненных SUPABASE_URL и SUPABASE_ANON_KEY в config.js
============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
const emojiFor = c => ({ cakes: "🎂", tarts: "🥧", desserts: "🧁", sets: "🎁" }[c] || "🍰");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  $("#authView").innerHTML = `<h2>Supabase не подключён</h2>
    <p style="color:var(--muted)">Заполни SUPABASE_URL и SUPABASE_ANON_KEY в js/config.js.</p>`;
}

let TOKEN = sessionStorage.getItem("vb_token") || "";

/* ---------- запросы к Supabase (чистый fetch, без библиотек) ---------- */
async function auth(email, password) {
  const r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || "Неверный email или пароль");
  TOKEN = data.access_token;
  sessionStorage.setItem("vb_token", TOKEN);
}

async function api(method, path, body) {
  const opt = {
    method,
    headers: { 
      apikey: SUPABASE_ANON_KEY, 
      Authorization: "Bearer " + TOKEN, 
      "Content-Type": "application/json", 
      Prefer: "return=representation" 
    }
  };
  if (body !== undefined) opt.body = JSON.stringify(body);
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, opt);
  if (!r.ok) throw new Error(method + " " + path + " → " + r.status);
  return r.json();
}

async function uploadPhoto(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/products/${path}`, {
    method: "POST",
    headers: { 
      apikey: SUPABASE_ANON_KEY, 
      Authorization: "Bearer " + TOKEN, 
      "Content-Type": file.type, 
      "x-upsert": "true" 
    },
    body: file
  });
  if (!r.ok) throw new Error("Ошибка загрузки фото: " + r.status);
  return `${SUPABASE_URL}/storage/v1/object/public/products/${path}`;
}

/* ---------- вход / выход ---------- */
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#loginErr").textContent = "";
  try {
    await auth($("#lEmail").value.trim(), $("#lPass").value);
    showPanel();
  } catch (err) { 
    $("#loginErr").textContent = err.message; 
  }
});

$("#logoutBtn").onclick = () => { 
  TOKEN = ""; 
  sessionStorage.removeItem("vb_token"); 
  location.reload(); 
};

function showPanel() {
  $("#authView").hidden = true;
  $("#panelView").hidden = false;
  initTabs();
  fillCategorySelect();
  loadProducts();
  loadSettings();
}

/* ---------- табы панели ---------- */
function initTabs() {
  $$(".tab-a").forEach(b => b.onclick = () => {
    $$(".tab-a").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    const t = b.dataset.tab;
    $("#tab-products").hidden = t !== "products";
    $("#tab-settings").hidden = t !== "settings";
  });
}

function fillCategorySelect() {
  $("#pCat").innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
}

/* ---------- товары: список ---------- */
async function loadProducts() {
  try {
    const rows = await api("GET", "products?order=sort.asc,created_at.desc");
    $("#productsTable").innerHTML = rows.map(p => `
      <tr>
        <td>${p.image ? `<img src="${p.image}" alt="">` : `<div class="ph">${emojiFor(p.category)}</div>`}</td>
        <td><b>${escapeHtml(p.title)}</b><br><small style="color:var(--muted)">${escapeHtml((p.description||"").slice(0,60))}</small></td>
        <td>${CATEGORIES[p.category] || p.category}</td>
        <td>${money(p.price)} / ${p.unit}</td>
        <td>${p.is_active ? "✅" : "—"}</td>
        <td><div class="row-btns">
          <button class="mini" data-edit="${p.id}">Ред.</button>
          <button class="mini del" data-del="${p.id}">Удал.</button>
        </div></td>
      </tr>`).join("") || `<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:24px">Товаров пока нет — добавь первый выше.</td></tr>`;
    
    $$("[data-edit]").forEach(b => b.onclick = () => editProduct(rows.find(p => p.id === b.dataset.edit)));
    $$("[data-del]").forEach(b => b.onclick = () => delProduct(b.dataset.del));
  } catch (e) { 
    alert("Ошибка загрузки: " + e.message); 
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ---------- товары: форма ---------- */
let editingId = null;
let currentImage = "";

function resetForm() {
  editingId = null; 
  currentImage = "";
  $("#pId").value = ""; 
  $("#pTitle").value = ""; 
  $("#pDesc").value = "";
  $("#pPrice").value = ""; 
  $("#pUnit").value = "kg"; 
  $("#pCat").value = "cakes";
  $("#pActive").checked = true; 
  $("#pSort").value = 100; 
  $("#pPhotos").value = "";
  $("#photosPreview").innerHTML = ""; 
  $("#productMsg").textContent = "";
}
$("#resetProduct").onclick = resetForm;

function editProduct(p) {
  editingId = p.id; 
  currentImage = p.image || "";
  $("#pTitle").value = p.title; 
  $("#pDesc").value = p.description || "";
  $("#pPrice").value = p.price; 
  $("#pUnit").value = p.unit; 
  $("#pCat").value = p.category;
  $("#pActive").checked = p.is_active; 
  $("#pSort").value = p.sort;
  $("#photosPreview").innerHTML = currentImage ? `<img src="${currentImage}" alt="">` : "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#pPhotos").addEventListener("change", () => {
  const files = $("#pPhotos").files;
  $("#photosPreview").innerHTML = [...files].map(f => `<img src="${URL.createObjectURL(f)}" alt="">`).join("");
});

$("#productForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#productMsg").textContent = "Сохраняю…";
  try {
    let image = currentImage;
    if ($("#pPhotos").files.length) {
      image = await uploadPhoto($("#pPhotos").files[0]);
    }
    const payload = {
      title: $("#pTitle").value.trim(),
      category: $("#pCat").value,
      description: $("#pDesc").value.trim(),
      price: parseInt($("#pPrice").value) || 0,
      unit: $("#pUnit").value,
      image,
      is_active: $("#pActive").checked,
      sort: parseInt($("#pSort").value) || 100
    };
    if (editingId) await api("PATCH", "products?id=eq." + editingId, payload);
    else           await api("POST", "products", payload);
    
    $("#productMsg").textContent = "✅ Сохранено";
    resetForm();
    loadProducts();
  } catch (err) { 
    $("#productMsg").textContent = "❌ " + err.message; 
  }
});

async function delProduct(id) {
  if (!confirm("Удалить эту карточку?")) return;
  try { 
    await api("DELETE", "products?id=eq." + id); 
    loadProducts(); 
  } catch (e) { 
    alert("Ошибка: " + e.message); 
  }
}

/* ---------- настройки ---------- */
async function loadSettings() {
  try {
    const rows = await api("GET", "settings");
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    $("#sPickup").value = map.pickup_address || "";
    $("#sLead").value = map.lead_days || 4;
    $("#sTg").value = map.telegram || "";
  } catch (e) { 
    console.warn(e); 
  }
}

$("#settingsForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#settingsMsg").textContent = "Сохраняю…";
  try {
    const vals = {
      pickup_address: $("#sPickup").value.trim(),
      lead_days: String($("#sLead").value),
      telegram: $("#sTg").value.trim()
    };
    for (const [k, v] of Object.entries(vals)) {
      const r = await fetch(SUPABASE_URL + "/rest/v1/settings", {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + TOKEN,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({ key: k, value: v })
      });
      if (!r.ok) throw new Error("POST settings → " + r.status);
    }
    $("#settingsMsg").textContent = "✅ Настройки сохранены";
  } catch (err) {
    $("#settingsMsg").textContent = "❌ " + err.message;
  }
});

/* ---------- авто-вход если токен жив ---------- */
(async function autoLogin() {
  if (!TOKEN || !SUPABASE_URL) return;
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/settings?limit=1", {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + TOKEN }
    });
    if (r.ok) showPanel();
    else sessionStorage.removeItem("vb_token");
  } catch {
    sessionStorage.removeItem("vb_token");
  }
})();
