// ============================================================
// НАСТРОЙКИ САЙТА — единственный файл, который правишь руками
// ============================================================

// --- SUPABASE (данные, фото, вход админа) ---
// Значения возьмёшь по инструкции из части 3.
// Пока строки пустые — сайт работает в ДЕМО-режиме:
// витрина показывает DEMO_PRODUCTS, админка недоступна.
const SUPABASE_URL = "https://vvhhplxqiqdhfknqnqff.supabase.co";      // пример: "https://abcd1234.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable__If9CmRwaQjhd__7Z96Ujg_n3mzLWhJ"; // Project Settings → API → anon public

// --- КАТЕГОРИИ (ключи совпадают с базой) ---
const CATEGORIES = {
  cakes:    "Торты",
  tarts:    "Тарты",
  desserts: "Пирожные и десерты",
  sets:     "Наборы",
};

// --- ЦЕНЫ КАЛЬКУЛЯТОРА (ЗАГЛУШКИ — замени на реальные!) ---
// base = цена за единицу, min/step = мин. количество и шаг.
const CALC_RATES = {
  cakes:    { base: 2500, unit: "кг",   min: 1, step: 0.5 },
  tarts:    { base: 2200, unit: "кг",   min: 1, step: 0.5 },
  desserts: { base: 350,  unit: "шт",   min: 2, step: 1 },
  sets:     { base: 1900, unit: "набор",min: 1, step: 1 },
};

// --- ДОПЛАТЫ В КАЛЬКУЛЯТОРЕ (тоже заглушки) ---
const CALC_OPTIONS = [
  { id: "berries", label: "Свежие ягоды", price: 300 },
  { id: "nuts",    label: "Орехи",        price: 250 },
  { id: "text",    label: "Надпись",      price: 200 },
];

// --- ДЕМО-ТОВАРЫ (видны ТОЛЬКО пока не подключён Supabase) ---
const DEMO_PRODUCTS = [
  { id: "d1", title: "Торт «Красный бархат»", category: "cakes", price: 2500, unit: "кг",
    description: "Бархатные шоколадные коржи, нежный крем-чиз, вишнёвое конфи.", image: "" },
  { id: "d2", title: "Торт «Медовик»", category: "cakes", price: 2300, unit: "кг",
    description: "Тонкие медовые коржи и сметанный крем — классика в авторском виде.", image: "" },
  { id: "d3", title: "Торт «Шоколадный drip»", category: "cakes", price: 2600, unit: "кг",
    description: "Шоколадный бисквит, сливочный мусс, подтёки тёмного шоколада.", image: "" },
  { id: "d4", title: "Тарт «Тирамису»", category: "tarts", price: 2200, unit: "кг",
    description: "Песочная основа, крем маскарпоне, какао-пыль.", image: "" },
  { id: "d5", title: "Эклер заварной", category: "desserts", price: 350, unit: "шт",
    description: "Заварное тесто, воздушный крем, тонкая глазурь.", image: "" },
  { id: "d6", title: "Набор «Ассорти»", category: "sets", price: 1900, unit: "набор",
    description: "12 мини-десертов для праздничного стола.", image: "" },
];