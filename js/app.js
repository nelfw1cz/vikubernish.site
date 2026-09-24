/* ============================================================
   ВИТРИНА — логика
   Работает в двух режимах:
   • Supabase подключён (ключи в config.js) → товары и настройки из базы;
   • ключи пустые → демо-товары из config.js, настройки по умолчанию.
   Корзина хранится в localStorage браузера.
============================================================ */

const SB = (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY);
const LS_CART = "vb_cart_v1";

/* ---------- мелкие утилиты ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
const emojiFor = c => ({ cakes: "🎂", tarts: "🥧", desserts: "🧁", sets: "🎁" }[c] || "🍰");
const unitWord = u => ({ kg: "кг", pc: "шт", set: "набор" }[u] || u);

async function sbGet(path) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    headers: { apikey: SUPABASE_ANON_KEY, Accept: "application/json" }
  });
  if (!r.ok) throw new Error(path + " → " + r.status);
  return r.json();
}

/* ---------- данные: товары и настройки ---------- */
let PRODUCTS = [];
let SETTINGS = { pickup_address: "Адрес уточняется.", lead_days: "4", telegram: "https://t.me/feeIscared" };

async function loadData() {
  if (SB) {
    try {
      PRODUCTS = await sbGet("products?is_active=eq.true&order=sort.asc,created_at.desc");
      const rows = await sbGet("settings");
      rows.forEach(r => SETTINGS[r.key] = r.value);
    } catch (e) {
      console.warn("Supabase недоступен, используем демо:", e);
      PRODUCTS = DEMO_PRODUCTS;
    }
  } else {
    PRODUCTS = DEMO_PRODUCTS;
  }
}

/* ---------- каталог ---------- */
let activeCat = "all";

function renderTabs() {
  const tabs = $("#tabs");
  const items = [["all", "Все"], ...Object.entries(CATEGORIES)];
  tabs.innerHTML = items.map(([k, v]) =>
    `<button class="tab ${k === activeCat ? "active" : ""}" data-cat="${k}">${v}</button>`).join("");
  $$(".tab", tabs).forEach(b => b.onclick = () => { activeCat = b.dataset.cat; renderTabs(); renderCatalog(); });
}

function renderCatalog() {
  const list = PRODUCTS.filter(p => activeCat === "all" || p.category === activeCat);
  const grid = $("#catalog");
  if (!list.length) { grid.innerHTML = `<p class="cart-empty">В этой категории пока пусто.</p>`; return; }
  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="card__img">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}">` : emojiFor(p.category)}</div>
      <div class="card__body">
        <span class="card__cat">${CATEGORIES[p.category] || p.category}</span>
        <h3 class="card__title">${esc(p.title)}</h3>
        <p class="card__desc">${esc(p.description || "")}</p>
        <div class="card__foot">
          <span class="card__price">от ${money(p.price)} <small>/ ${unitWord(p.unit)}</small></span>
          <button class="card__add" data-id="${p.id}">В заказ</button>
        </div>
      </div>
    </article>`).join("");
  $$(".card__add", grid).forEach(b => b.onclick = () => addToCart(PRODUCTS.find(p => p.id === b.dataset.id)));
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- корзина ---------- */
let cart = JSON.parse(localStorage.getItem(LS_CART) || "[]");

function saveCart() { localStorage.setItem(LS_CART, JSON.stringify(cart)); renderCart(); }

function addToCart(item) {
  // уникальность: для товаров из каталога — по id; для калькулятора — отдельный флаг
  const existing = item._calc ? null : cart.find(c => !c._calc && c.id === item.id);
  if (existing) { existing.qty += 1; }
  else { cart.push({ ...item, qty: 1 }); }
  saveCart();
  openCart();
}

function removeFromCart(i) { cart.splice(i, 1); saveCart(); }

function renderCart() {
  $("#cartCount").textContent = cart.reduce((s, c) => s + c.qty, 0);
  const box = $("#cartItems");
  if (!cart.length) { box.innerHTML = `<p class="cart-empty">Корзина пуста. Добавьте десерт из каталога или соберите в калькуляторе.</p>`; return; }
  box.innerHTML = cart.map((c, i) => `
    <div class="cart-item">
      <div class="cart-item__top">
        <span class="cart-item__title">${esc(c.title)}</span>
        <button class="cart-item__remove" data-i="${i}" aria-label="Удалить">✕</button>
      </div>
      <div class="cart-item__meta">${c.qty} ${unitWord(c.unit)}${c.meta ? " · " + esc(c.meta) : ""}</div>
      <div class="cart-item__price">${money(c.price * c.qty)}</div>
    </div>`).join("");
  $$(".cart-item__remove", box).forEach(b => b.onclick = () => removeFromCart(+b.dataset.i));
}

function openCart()  { $("#cart").setAttribute("aria-hidden", "false"); }
function closeCart() { $("#cart").setAttribute("aria-hidden", "true"); }

/* ---------- калькулятор ---------- */
function initCalc() {
  const sel = $("#calcCategory");
  sel.innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  const opts = $("#calcOptions");
  opts.innerHTML = `<legend>Дополнительно</legend>` +
    CALC_OPTIONS.map(o => `<label><span>${o.label} (+${money(o.price)})</span><input type="checkbox" value="${o.id}"></label>`).join("");

  const recalc = () => {
    const cat = sel.value, rate = CALC_RATES[cat];
    $("#calcQtyLabel").textContent = `Количество (${rate.unit})`;
    const q = Math.max(rate.min, parseFloat($("#calcQty").value) || rate.min);
    let sum = rate.base * q;
    $$("#calcOptions input:checked").forEach(cb => {
      const o = CALC_OPTIONS.find(x => x.id === cb.value); if (o) sum += o.price;
    });
    $("#calcPrice").textContent = "от " + money(sum);
  };
  sel.onchange = recalc;
  $("#calcQty").oninput = recalc;
  $$("#calcOptions input").forEach(cb => cb.onchange = recalc);
  recalc();

  $("#calcAdd").onclick = () => {
    const cat = sel.value, rate = CALC_RATES[cat];
    const q = Math.max(rate.min, parseFloat($("#calcQty").value) || rate.min);
    const chosen = $$("#calcOptions input:checked").map(cb => CALC_OPTIONS.find(x => x.id === cb.value).label);
    let sum = rate.base * q;
    chosen.forEach(() => {}); // price already in loop below
    $$("#calcOptions input:checked").forEach(cb => { const o = CALC_OPTIONS.find(x => x.id === cb.value); if (o) sum += o.price; });
    addToCart({
      _calc: true, id: "calc_" + Date.now(),
      title: CATEGORIES[cat] + " (по калькулятору)",
      price: sum, unit: rate.unit, qty: 1,
      meta: `${q} ${rate.unit}${chosen.length ? " · " + chosen.join(", ") : ""}`
    });
  };
}

/* ---------- форма заказа: генерация текста ---------- */
function initOrder() {
  // минимальная дата = сегодня + lead_days
  const lead = parseInt(SETTINGS.lead_days) || 4;
  const min = new Date(); min.setDate(min.getDate() + lead);
  const dateInput = $("#oDate");
  dateInput.min = min.toISOString().slice(0, 10);
  dateInput.value = dateInput.min;

  // доставка / самовывоз
  const addrField = $("#addrField");
  $$('input[name="delivery"]').forEach(r => r.onchange = () => {
    const isDelivery = $('input[name="delivery"]:checked').value === "delivery";
    addrField.hidden = !isDelivery;
  });

  $("#pickupAddress").textContent = SETTINGS.pickup_address || "Адрес уточняется.";
  $("#footerTg").href = SETTINGS.telegram;
  $("#tgOrder").href = SETTINGS.telegram;

  $("#generateOrder").onclick = () => {
    if (!cart.length) { alert("Корзина пуста — добавьте хотя бы одну позицию."); return; }
    const name = $("#oName").value.trim();
    const contact = $("#oContact").value.trim();
    const date = $("#oDate").value;
    if (!name || !contact || !date) { alert("Заполните имя, контакт и дату."); return; }

    const isDelivery = $('input[name="delivery"]:checked').value === "delivery";
    const addr = $("#oAddress").value.trim();

    let total = 0;
    const lines = cart.map((c, i) => {
      const lineTotal = c.price * c.qty;
      total += lineTotal;
      return `${i + 1}. ${c.title}, ${c.qty} ${unitWord(c.unit)}${c.meta ? " (" + c.meta + ")" : ""} — ${money(lineTotal)}`;
    }).join("\n");

    const ruDate = date.split("-").reverse().join(".");
    const deliveryLine = isDelivery
      ? `Доставка: Екатеринбург, ${addr || "(адрес уточню отдельно)"}`
      : `Самовывоз: ${SETTINGS.pickup_address}`;

    const text =
`Здравствуйте! Хочу оформить заказ:
${lines}
Итого: ~${money(total)}
Желаемая дата: ${ruDate} или позже
${deliveryLine}
Имя и контакт: ${name}, ${contact}`;

    $("#orderText").value = text;
    $("#orderResult").hidden = false;
  };

  $("#copyOrder").onclick = async () => {
    try {
      await navigator.clipboard.writeText($("#orderText").value);
      $("#copyOrder").textContent = "✅ Скопировано";
      setTimeout(() => $("#copyOrder").textContent = "📋 Скопировать", 1800);
    } catch { alert("Выделите текст вручную и скопируйте."); }
  };
}

/* ---------- старт ---------- */
(async function init() {
  $("#year").textContent = new Date().getFullYear();
  $("#openCart").onclick = openCart;
  $("#closeCart").onclick = closeCart;
  $("#cartOverlay").onclick = closeCart;

  await loadData();
  renderTabs();
  renderCatalog();
  renderCart();
  initCalc();
  initOrder();
/* ---------- SCROLL REVEAL: плавное появление секций ---------- */
(function setupReveal(){
  const targets = document.querySelectorAll(".section, .custom-banner, .hero, .footer");
  targets.forEach(el => el.classList.add("reveal"));
  // карточки и инфо-блоки тоже помечаем
  setTimeout(() => {
    document.querySelectorAll(".grid .card, .cards3 .info-card").forEach(el => el.classList.add("reveal"));
    observeAll();
  }, 50);

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  function observeAll(){ document.querySelectorAll(".reveal:not(.in-view)").forEach(el => io.observe(el)); }
  observeAll();

  // переснимаем при рендере каталога (новые карточки)
  const origRenderCatalog = window.renderCatalog;
  if (origRenderCatalog) {
    window.renderCatalog = function(){ origRenderCatalog(); setTimeout(observeAll, 30); };
  }
})();
})();
