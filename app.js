// =====================================================================
//  TÅGTAVLAN – klientlogik
// =====================================================================
const CFG = window.TT_CONFIG;
const FN = (name) => `${CFG.SUPABASE_URL}/functions/v1/${name}`;

// Anropar en Edge Function. anon-nyckeln krävs av Supabase-gatewayen.
async function call(fn, payload) {
  const res = await fetch(FN(fn), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CFG.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Enkel state, mestadels i minnet. deviceId + val sparas lokalt.
const State = {
  from: null,   // {signature, name}
  to: null,
  deviceId: localStorage.getItem("tt_device") || null,
  pendingWatch: null,
  reminderMin: 10,
  board: [],
  watches: [],
};

const App = {
  // ---- TABS ----
  tab(name) {
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".page").forEach((p) =>
      p.classList.toggle("active", p.id === `page-${name}`));
    if (name === "watches") this.loadWatches();
    if (name === "settings") this.refreshPushUI();
  },

  // ---- THEME ----
  setTheme(cls) {
    document.body.className = cls;
    localStorage.setItem("tt_theme", cls);
    document.querySelectorAll(".theme-opt").forEach((o) =>
      o.classList.toggle("sel", o.dataset.theme === cls));
    const meta = document.querySelector('meta[name="theme-color"]');
    const map = { "": "#0f0f1a", "theme-dim": "#1e2130", "theme-light": "#eef0f5" };
    if (meta) meta.content = map[cls] ?? "#0f0f1a";
  },

  // ---- STATION SEARCH ----
  setupSearch(inputId, sugId, which) {
    const input = document.getElementById(inputId);
    const sugBox = document.getElementById(sugId);
    let timer, results = [], kbd = -1;

    const render = () => {
      if (!results.length) { sugBox.innerHTML = ""; return; }
      sugBox.innerHTML = `<div class="suggestions">${results.map((r, i) =>
        `<div class="suggestion ${i === kbd ? "kbd" : ""}" data-i="${i}">
          ${r.name} <span class="sig mono">${r.signature}</span></div>`).join("")}</div>`;
      sugBox.querySelectorAll(".suggestion").forEach((el) =>
        el.onclick = () => pick(results[+el.dataset.i]));
    };
    const pick = (r) => {
      State[which] = r; input.value = r.name; results = []; render();
    };

    input.addEventListener("input", () => {
      State[which] = null;
      clearTimeout(timer);
      const term = input.value.trim();
      if (term.length < 2) { results = []; render(); return; }
      timer = setTimeout(async () => {
        try {
          const { stations } = await call("proxy", { action: "searchStations", term });
          results = stations; kbd = -1; render();
        } catch (e) { /* tyst */ }
      }, 250);
    });
    input.addEventListener("keydown", (e) => {
      if (!results.length) return;
      if (e.key === "ArrowDown") { kbd = Math.min(kbd + 1, results.length - 1); render(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { kbd = Math.max(kbd - 1, 0); render(); e.preventDefault(); }
      else if (e.key === "Enter" && kbd >= 0) { pick(results[kbd]); e.preventDefault(); }
    });
    input.addEventListener("blur", () => setTimeout(() => { results = []; render(); }, 200));
  },

  // ---- DEPARTURE BOARD ----
  async loadBoard() {
    if (!State.from) { toast("Välj en avgångsstation först", true); return; }
    const box = document.getElementById("boardResult");
    box.innerHTML = '<div class="spinner"></div>';
    try {
      const { departures } = await call("proxy", {
        action: "departures",
        from: State.from.signature,
        to: State.to ? State.to.signature : undefined,
      });
      State.board = departures;
      this.renderBoard();
    } catch (e) {
      box.innerHTML = `<div class="empty">Kunde inte hämta avgångar.<br><span class="hint">${e.message}</span></div>`;
    }
  },

  renderBoard() {
    const box = document.getElementById("boardResult");
    if (!State.board.length) {
      box.innerHTML = '<div class="empty"><div class="big">🚉</div>Inga avgångar hittades för den valda stationen just nu.</div>';
      return;
    }
    const watchedIds = new Set(State.watches.map((w) => w.activity_id));
    box.innerHTML = State.board.map((d) => {
      const dest = d.to[d.to.length - 1] || "—";
      const via = d.to.length > 1 ? `via ${d.to.slice(0, -1).join(", ")}` : "";
      let timeHtml, badge = "";
      if (d.canceled) {
        timeHtml = `<div class="t strike">${hhmm(d.advertisedTime)}</div>`;
        badge = '<span class="badge cancel">Inställt</span>';
      } else if (d.delayed) {
        timeHtml = `<div class="t strike">${hhmm(d.advertisedTime)}</div><div class="new mono">${hhmm(d.effectiveTime)}</div>`;
        badge = '<span class="badge delay">Försenat</span>';
      } else {
        timeHtml = `<div class="t mono">${hhmm(d.effectiveTime)}</div>`;
      }
      const on = watchedIds.has(d.activityId);
      return `<div class="dep">
        <div class="dep-time">${timeHtml}</div>
        <div class="dep-mid">
          <div class="dep-dest">${dest}</div>
          <div class="dep-sub">Tåg ${d.train}${via ? " · " + via : ""}</div>
          ${badge}
        </div>
        <div class="dep-track mono">${d.track || "–"}</div>
        <button class="watch-btn ${on ? "on" : ""}" onclick='App.openWatch(${JSON.stringify(JSON.stringify(d))})'>${on ? "✓" : "🔔"}</button>
      </div>`;
    }).join("");
  },

  // ---- WATCH MODAL ----
  openWatch(depJson) {
    const d = JSON.parse(depJson);
    State.pendingWatch = d;
    State.reminderMin = 10;
    document.getElementById("wmSub").textContent =
      `Tåg ${d.train} mot ${d.to[d.to.length - 1]} – ${hhmm(d.effectiveTime)} från ${State.from.name}`;
    document.getElementById("wmDev").checked = true;
    document.getElementById("wmRem").checked = true;
    document.getElementById("wmMin").textContent = "10";
    document.getElementById("watchModal").classList.add("show");
  },
  closeModal() { document.getElementById("watchModal").classList.remove("show"); },
  bumpReminder(delta) {
    State.reminderMin = Math.max(2, Math.min(60, State.reminderMin + delta));
    document.getElementById("wmMin").textContent = State.reminderMin;
  },

  async confirmWatch() {
    if (!State.deviceId) {
      const ok = await this.enablePush();
      if (!ok || !State.deviceId) { toast("Tillåt notiser för att bevaka", true); return; }
    }
    const d = State.pendingWatch;
    try {
      await call("subscribe", {
        action: "addWatch",
        deviceId: State.deviceId,
        watch: {
          activityId: d.activityId,
          train: d.train,
          fromSignature: State.from.signature,
          fromName: State.from.name,
          toSignature: State.to ? State.to.signature : null,
          toName: d.to[d.to.length - 1] || null,
          advertisedTime: d.advertisedTime,
          notifyDeviations: document.getElementById("wmDev").checked,
          notifyReminder: document.getElementById("wmRem").checked,
          reminderMinutes: State.reminderMin,
        },
      });
      this.closeModal();
      toast("Avgången bevakas nu");
      await this.loadWatches();
      this.renderBoard();
    } catch (e) { toast("Kunde inte spara: " + e.message, true); }
  },

  // ---- WATCH LIST ----
  async loadWatches() {
    const box = document.getElementById("watchList");
    if (!State.deviceId) {
      box.innerHTML = '<div class="empty"><div class="big">🔔</div>Aktivera notiser och bevaka en avgång från Avgångar-fliken.</div>';
      return;
    }
    box.innerHTML = '<div class="spinner"></div>';
    try {
      const { watches } = await call("subscribe", { action: "getState", deviceId: State.deviceId });
      State.watches = watches;
      if (!watches.length) {
        box.innerHTML = '<div class="empty"><div class="big">🚆</div>Inga bevakade avgångar. Tryck på klockan vid en avgång för att bevaka.</div>';
        return;
      }
      box.innerHTML = watches.map((w) => `
        <div class="watch-card">
          <div class="watch-head">
            <div>
              <div class="watch-train">Tåg ${w.advertised_train}${w.to_name ? " mot " + w.to_name : ""}</div>
              <div class="watch-meta mono">${hhmm(w.advertised_time)} · ${w.from_name}</div>
            </div>
          </div>
          <div class="watch-meta">
            ${w.notify_deviations ? "⚠️ Avvikelser" : ""}
            ${w.notify_reminder ? `· ⏰ ${w.reminder_minutes} min före` : ""}
          </div>
          <button class="del-link" onclick="App.removeWatch('${w.id}')">Ta bort bevakning</button>
        </div>`).join("");
    } catch (e) {
      box.innerHTML = `<div class="empty">Kunde inte ladda bevakningar.<br><span class="hint">${e.message}</span></div>`;
    }
  },
  async removeWatch(id) {
    try {
      await call("subscribe", { action: "removeWatch", id });
      toast("Bevakning borttagen");
      await this.loadWatches();
      this.renderBoard();
    } catch (e) { toast(e.message, true); }
  },

  // ---- PUSH ----
  async enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast("Den här webbläsaren stödjer inte notiser", true); return false;
      }
      const reg = await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast("Notiser nekades", true); return false; }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8(CFG.VAPID_PUBLIC_KEY),
        });
      }
      const { deviceId } = await call("subscribe", {
        action: "registerDevice",
        subscription: sub.toJSON(),
        label: navigator.platform || "Enhet",
      });
      State.deviceId = deviceId;
      localStorage.setItem("tt_device", deviceId);
      toast("Notiser aktiverade");
      this.refreshPushUI();
      return true;
    } catch (e) {
      toast("Kunde inte aktivera notiser: " + e.message, true);
      return false;
    }
  },
  refreshPushUI() {
    const btn = document.getElementById("pushStatusBtn");
    const hint = document.getElementById("pushHint");
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (State.deviceId) {
      btn.textContent = "✓ Notiser aktiverade på den här enheten";
      btn.classList.remove("secondary");
      hint.textContent = "";
    } else {
      btn.textContent = "Aktivera push-notiser";
      hint.innerHTML = standalone
        ? "Tryck för att tillåta notiser."
        : "På iPhone: lägg först till appen på hemskärmen (Dela → Lägg till på hemskärmen), öppna den därifrån och aktivera sedan notiser.";
    }
  },

  init() {
    this.setTheme(localStorage.getItem("tt_theme") || "");
    this.setupSearch("fromInput", "fromSug", "from");
    this.setupSearch("toInput", "toSug", "to");
    // Förladda bevakningar så att klock-ikoner stämmer
    if (State.deviceId) {
      call("subscribe", { action: "getState", deviceId: State.deviceId })
        .then(({ watches }) => { State.watches = watches; })
        .catch(() => {});
    }
    this.refreshPushUI();
  },
};

// ---- helpers ----
function hhmm(iso) {
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm",
  });
}
function toast(msg, error) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (error ? " error" : "");
  setTimeout(() => t.classList.remove("show"), 2800);
}
function urlB64ToUint8(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

App.init();
