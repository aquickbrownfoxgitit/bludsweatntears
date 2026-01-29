const STORE_KEY = "hf-ledger-clean";

const store = {
  checking: 0,
  locked: 0,
  history: []
};

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function load() {
  const data = JSON.parse(localStorage.getItem(STORE_KEY));
  if (data) Object.assign(store, data);
}

function fmt(n) {
  return `$${Number(n).toFixed(2)}`;
}

function refresh() {
  document.getElementById("checkingDisplay").textContent = fmt(store.checking);
  document.getElementById("ldDisplay").textContent = fmt(store.locked);
  renderHistory();
  save();
}

function addEntry(type, amount, note) {
  const entry = {
    id: crypto.randomUUID(),
    type,
    amount,
    note,
    ts: new Date().toISOString()
  };

  // Apply financial effect
  if (type === "bill") {
    store.checking -= amount;
  }
  if (type === "transfer") {
    store.checking -= amount;
    store.locked += amount;
  }

  store.history.unshift(entry);
  refresh();
}

function deleteEntry(id) {
  const idx = store.history.findIndex(e => e.id === id);
  if (idx === -1) return;

  const entry = store.history[idx];

  // Reverse financial effect
  if (entry.type === "bill") {
    store.checking += entry.amount;
  }
  if (entry.type === "transfer") {
    store.checking += entry.amount;
    store.locked -= entry.amount;
  }

  store.history.splice(idx, 1);
  refresh();
}

function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  store.history.forEach(e => {
    const row = document.createElement("div");
    row.className = "history-item";

    const label =
      e.type === "bill" ? "Bill / Spending" :
      e.type === "transfer" ? "Transfer → Locked Down" : "Entry";

    const text = document.createElement("div");
    text.className = "history-text";
    text.innerHTML = `<strong>${label}</strong> — ${fmt(e.amount)}<br><span style="color:#6b7c7c">${e.note || ""}</span>`;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.onclick = () => deleteEntry(e.id);

    row.appendChild(text);
    row.appendChild(del);
    list.appendChild(row);
  });
}

document.getElementById("addDebit").onclick = () => {
  const amt = Number(document.getElementById("debitAmount").value);
  const type = document.getElementById("debitType").value;
  const note = document.getElementById("debitNote").value;

  if (!amt || amt <= 0) return;

  addEntry(type, amt, note);

  document.getElementById("debitAmount").value = "";
  document.getElementById("debitNote").value = "";
};

load();
refresh();
