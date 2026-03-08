const $ = (id) => document.getElementById(id);
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const num = (v) => Number(v) || 0;

const STORE_KEY = "hf-ledger-v3";

const store = {
  bank: 0,
  wgo: 0,
  ld: 0,
  entries: []
};

let historyCleared = false;

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function load() {
  const data = JSON.parse(localStorage.getItem(STORE_KEY));
  if (data) Object.assign(store, data);
}

function addEntry(entry) {
  store.entries.push({
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    cleared: false,
    ...entry
  });
}

function pendingTotal() {
  return store.entries
    .filter(e => e.type === "bill" && !e.cleared)
    .reduce((s, e) => s + e.amount, 0);
}

function ldCommittedTotal() {
  return store.entries
    .filter(e => e.type === "lockdown_pending" && !e.cleared)
    .reduce((s, e) => s + e.amount, 0);
}

function ldAvailable() {
  return store.ld - ldCommittedTotal();
}

function refreshHome() {

  $("bankInput").value = store.bank.toFixed(2);
  $("wgoDisplay").textContent = fmt(store.wgo);
  $("ldDisplay").textContent = fmt(store.ld);

  $("pendingTotal").textContent = fmt(pendingTotal());
  $("ldCommitted").textContent = fmt(ldCommittedTotal());
  $("ldAvailable").textContent = fmt(ldAvailable());

  const bad =
    store.bank < 0 ||
    store.wgo < 0 ||
    store.ld < 0 ||
    ldAvailable() < 0;

  $("status").textContent = bad ? "Over-allocated" : "Ready";

  save();
}

function renderHistory() {

  const list = $("historyList");
  list.innerHTML = "";

  if (historyCleared) return;

  store.entries.slice().reverse().forEach(e => {

    const row = document.createElement("div");

    row.className =
      "history-item" +
      (e.cleared ? " cleared" : "") +
      (e.type === "lockdown_pending" && !e.cleared ? " pending-ld" : "");

    const label =
      e.type === "deposit" ? "Deposit" :
      e.type === "bill" ? "Bill (checking)" :
      e.type === "wgo" ? "WGO spend" :
      e.type === "wgo_topup" ? "WGO top-up" :
      e.type === "transfer" ? "Fund Lockdown" :
      e.type === "lockdown_cleared" ? "Lockdown (cleared)" :
      e.type === "lockdown_pending" ? "Lockdown (pending)" :
      "Entry";

    row.innerHTML = `
      <div>
        <strong>${label}</strong> — ${fmt(e.amount)}
        ${e.note ? `<div class="tiny">${e.note}</div>` : ""}
      </div>
      <div>
        ${
          e.type === "bill" || e.type === "lockdown_pending"
            ? `<button class="ghost btnClear">${e.cleared ? "Unclear" : "Mark cleared"}</button>`
            : ""
        }
        <button class="ghost btnDelete">Delete</button>
      </div>
    `;

    const btnClear = row.querySelector(".btnClear");

    if (btnClear) {

      btnClear.onclick = () => {

        if (e.type === "bill") {
          e.cleared = !e.cleared;
        }

        else if (e.type === "lockdown_pending") {

          if (!e.cleared) {
            store.ld -= e.amount;
            e.cleared = true;
          }
          else {
            store.ld += e.amount;
            e.cleared = false;
          }

        }

        refreshHome();
        renderHistory();
      };

    }

    const btnDelete = row.querySelector(".btnDelete");

    btnDelete.onclick = () => {

      if (e.type === "bill") store.bank += e.amount;
      else if (e.type === "wgo") store.wgo += e.amount;
      else if (e.type === "transfer") { store.bank += e.amount; store.ld -= e.amount; }
      else if (e.type === "wgo_topup") { store.bank += e.amount; store.wgo -= e.amount; }
      else if (e.type === "lockdown_cleared") store.ld += e.amount;
      else if (e.type === "lockdown_pending" && e.cleared) store.ld += e.amount;
      else if (e.type === "deposit") store.bank -= e.amount;

      store.entries = store.entries.filter(x => x.id !== e.id);

      refreshHome();
      renderHistory();

    };

    list.appendChild(row);

  });

}

$("saveBank").onclick = () => {
  store.bank = num($("bankInput").value);
  refreshHome();
};

$("addDeposit").onclick = () => {

  const amt = num($("depositAmt").value);
  if (!amt) return;

  store.bank += amt;

  addEntry({
    type: "deposit",
    amount: amt,
    note: $("depositNote").value
  });

  refreshHome();
  renderHistory();

};

$("addWgo").onclick = () => {

  const amt = num($("wgoTopup").value);
  if (!amt) return;

  store.bank -= amt;
  store.wgo += amt;

  addEntry({ type: "wgo_topup", amount: amt });

  refreshHome();
  renderHistory();

};

$("addLd").onclick = () => {

  const amt = num($("ldInput").value);
  if (!amt) return;

  store.bank -= amt;
  store.ld += amt;

  addEntry({ type: "transfer", amount: amt });

  refreshHome();
  renderHistory();

};

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

  else if (source === "lockdown_cleared") {
    store.ld -= amt;
    addEntry({ type: "lockdown_cleared", amount: amt, note, cleared: true });
  }

  else if (source === "lockdown_pending") {
    addEntry({ type: "lockdown_pending", amount: amt, note, cleared: false });
  }

  refreshHome();
  renderHistory();

};

load();
refreshHome();
renderHistory();
