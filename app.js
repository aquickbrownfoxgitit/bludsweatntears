/* =========================
   H&F Ledger — app.js
   Clean Rebuild
   ========================= */

const $ = (id) => document.getElementById(id);
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const num = (v) => Number(v) || 0;

/* ---------- Storage ---------- */

const STORE_KEY = "hf-ledger-v2";

const store = {
  bank: 0,
  wgo: 0,
  ld: 0,
  entries: []
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

/* ---------- Derived ---------- */

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
      e.type === "transfer" ? "Fund Lockdown (Bills)" :
      e.type === "lockdown" ? "Lockdown (bill cleared)" :
      "Entry";

    row.innerHTML = `
      <div>
        <strong>${label}</strong> — ${fmt(e.amount)}
        ${e.note ? `<div class="tiny">${e.note}</div>` : ""}
      </div>
      <div>
        ${e.type === "bill" ? `<button class="ghost btnClear">${e.cleared ? "Unclear" : "Mark cleared"}</button>` : ""}
        <button class="ghost btnDelete">Delete</button>
      </div>
    `;

    /* Clear button (checking bills only) */
    const btnClear = row.querySelector(".btnClear");
    if (btnClear) {
      btnClear.onclick = () => {
        e.cleared = !e.cleared;
        refreshHome();
        renderHistory();
      };
    }

    /* Delete logic (fully symmetrical) */
    const btnDelete = row.querySelector(".btnDelete");
    btnDelete.onclick = () => {

      if (e.type === "bill") {
        store.bank += e.amount;
      }

      else if (e.type === "wgo") {
        store.wgo += e.amount;
      }

      else if (e.type === "transfer") {
        store.bank += e.amount;
        store.ld -= e.amount;
      }

      else if (e.type === "wgo_topup") {
        store.bank += e.amount;
        store.wgo -= e.amount;
      }

      else if (e.type === "lockdown") {
        store.ld += e.amount;
      }

      else if (e.type === "deposit") {
        store.bank -= e.amount;
      }

      store.entries = store.entries.filter(x => x.id !== e.id);

      refreshHome();
      renderHistory();
    };

    list.appendChild(row);
  });
}

/* ---------- Actions ---------- */

/* Save checking balance */
$("saveBank").onclick = () => {
  store.bank = num($("bankInput").value);
  refreshHome();
};

/* Deposit */
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

/* WGO top-up */
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

/* Fund Lockdown */
$("addLd").onclick = () => {
  const amt = num($("ldInput").value);
  if (!amt) return;

  store.bank -= amt;
  store.ld += amt;

  addEntry({ type: "transfer", amount: amt });

  $("ldInput").value = "";

  refreshHome();
  renderHistory();
};

$("clearLd").onclick = () => {
  store.ld = 0;
  refreshHome();
};

/* Log Debit */
$("addDebit").onclick = () => {
  const source = $("debitSource").value;
  const amt = num($("debitAmt").value);
  if (!amt) return;

  const note = $("debitNote").value;

  if (source === "checking") {
    store.bank -= amt;
    addEntry({ type: "bill", amount: amt, note });
  }

  else if (source === "wgo") {
    store.wgo -= amt;
    addEntry({ type: "wgo", amount: amt, note });
  }

  else if (source === "transfer") {
    store.bank -= amt;
    store.ld += amt;
    addEntry({ type: "transfer", amount: amt, note });
  }

  else if (source === "lockdown") {
    store.ld -= amt;
    addEntry({ type: "lockdown", amount: amt, note });
  }

  $("debitAmt").value = "";
  $("debitNote").value = "";

  refreshHome();
  renderHistory();
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
