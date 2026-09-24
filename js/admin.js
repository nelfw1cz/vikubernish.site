$("#settingsForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#settingsMsg").textContent = "Сохраняю…";
  try {
    const vals = {
      pickup_address: $("#sPickup").value.trim(),
      lead_days: String($("#sLead").value),
      telegram: $("#sTg").value.trim()
    };
    // upsert: если ключ есть — обновить, если нет — создать
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