/* =========================
   H&F Ledger — app.js
   Clean rebuild v1.0
   ========================= */

const $ = (id) => document.getElementById(id);
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const num = (v) => Number(v) || 0;

/* ---------- Storage ---------- */

const STORE_KEY = "hf-ledger-v1";

const store = {
  bank: 0,        // H&F checking truth
  wgo: 0,         // Weekly Goings-On prepaid
  ld: 0,          // Locked Down (informational)
  entries: []     // ledger entries
};

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function load() {
  const data = JSON.parse(localStorage.getItem(STORE_KEY));
  if (data) Object.assign(store, data);
}

/* ---------- Ledger helpers ---------- */

function addEntry(entry) {
  store.entries.push({
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    cleared: false,
    ...entry
  });
}

/* ---------- Derived values ---------- */

function pendingTotal() {
  return store.entries
    .filter(e => e.type === "bill" && !e.cleared)
    .reduce((s, e) => s + e.amount, 0);
}

/* ---------- Render ---------- */

function refreshHome() {
  $("bankInput").value = store.bank.toFixed(2);
  $("wgoDisplay").textContent = fmt(store.wgo);
  $("ldDisplay").textContent = fmt(store.ld);
  $("pendingTotal").textContent = fmt(pendingTotal());
  $("status").textContent = store.bank < 0 ? "Over-allocated" : "Ready";
  save();
}

function renderHistory() {
  const list = $("historyList");
  list.innerHTML = "";

  store.entries.slice().reverse().forEach(e => {
    const row = document.createElement("div");
    row.className = "history-item" + (e.cleared ? " cleared" : "");

    const label =
      e.type === "deposit" ? "Deposit" :
      e.type === "bill" ? "Bill (checking)" :
      e.type === "wgo" ? "WGO spend" :
      e.type === "wgo_topup" ? "WGO top-up" :
      e.type === "ld" ? "Locked Down" : "Entry";

    row.innerHTML = `
      <strong>${label}</strong> — ${fmt(e.amount)}
      ${e.note ? `<div class="tiny">${e.note}</div>` : ""}
      ${e.type === "bill" ? `<button class="ghost btnClear">${e.cleared ? "Unclear" : "Mark cleared"}</button>` : ""}
    `;

    const btn = row.querySelector(".btnClear");
    if (btn) {
      btn.onclick = () => {
        e.cleared = !e.cleared;
        refreshHome();
        renderHistory();
      };
    }

    list.appendChild(row);
  });
}

/* ---------- Actions ---------- */

/* Save checking balance (manual truth set) */
$("saveBank").onclick = () => {
  store.bank = num($("bankInput").value);
  refreshHome();
};

/* Deposit (paycheck / other) */
$("addDeposit")?.addEventListener("click", () => {
  const amt = num($("depositAmt").value);
  if (!amt) return;
  store.bank += amt;
  addEntry({ type: "deposit", amount: amt, note: $("depositNote").value });
  $("depositAmt").value = "";
  $("depositNote").value = "";
  refreshHome();
  renderHistory();
});

/* WGO top-up (from checking) */
$("addWgo").onclick = () => {
  const amt = num($("wgoTopup").value);
  if (!amt) return;
  store.bank -= amt;
  store.wgo += amt;
  addEntry({ type: "wgo_topup", amount: amt });
  $("wgoTopup").value = "";
  refreshHome();
  renderHistory();
};

$("clearWgo").onclick = () => {
  store.wgo = 0;
  refreshHome();
};

/* WGO spend (does NOT touch checking) */
$("addWgoSpend")?.addEventListener("click", () => {
  const amt = num($("wgoSpendAmt").value);
  if (!amt) return;
  store.wgo -= amt;
  addEntry({ type: "wgo", amount: amt, note: $("wgoSpendNote").value });
  $("wgoSpendAmt").value = "";
  $("wgoSpendNote").value = "";
  refreshHome();
  renderHistory();
});

/* Bill payment (checking) */
$("addBill").onclick = () => {
  const amt = num($("billAmount").value);
  if (!amt) return;
  store.bank -= amt;
  addEntry({ type: "bill", amount: amt, note: $("billNote").value });
  $("billAmount").value = "";
  $("billNote").value = "";
  refreshHome();
  renderHistory();
};

/* Locked Down (informational, reduces checking) */
$("addLd").onclick = () => {
  const amt = num($("ldInput").value);
  if (!amt) return;
  store.bank -= amt;
  store.ld += amt;
  addEntry({ type: "ld", amount: amt });
  $("ldInput").value = "";
  refreshHome();
  renderHistory();
};

$("clearLd").onclick = () => {
  store.ld = 0;
  refreshHome();
};

/* ---------- Tabs ---------- */

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

/* ---------- Boot ---------- */

load();
refreshHome();
renderHistory();
