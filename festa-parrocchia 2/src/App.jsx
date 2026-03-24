import { useState, useEffect } from "react";

// ─── PALETTE & STYLE ───────────────────────────────────────────────────────
const C = {
  bg: "#1a1207",
  surface: "#2a1f0e",
  card: "#332710",
  border: "#5a3e1b",
  accent: "#f59e0b",
  accentDark: "#b45309",
  accentLight: "#fcd34d",
  text: "#fef3c7",
  textMuted: "#a78040",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#60a5fa",
  purple: "#a78bfa",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@300;400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'Source Sans 3', sans-serif; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.surface}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  .title-font { font-family: 'Playfair Display', serif; }
  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    body { background: white; color: black; }
    .print-ticket { background: white; color: black; padding: 20px; font-family: monospace; }
  }
`;

// ─── DEFAULT DATA ──────────────────────────────────────────────────────────
const DEFAULT_MENU = [
  { id: 1, name: "Panino Hamburger", category: "Panini", price: 4.0, emoji: "🍔" },
  { id: 2, name: "Panino Würstel", category: "Panini", price: 3.5, emoji: "🌭" },
  { id: 3, name: "Patatine", category: "Contorni", price: 2.5, emoji: "🍟" },
  { id: 4, name: "Crepes alla Nutella", category: "Dolci", price: 2.0, emoji: "🥞" },
  { id: 5, name: "Ciambella", category: "Dolci", price: 1.5, emoji: "🍩" },
  { id: 6, name: "Fetta di Torta", category: "Dolci", price: 2.5, emoji: "🎂" },
  { id: 7, name: "Caffè", category: "Bevande", price: 1.0, emoji: "☕" },
  { id: 8, name: "Birra", category: "Bevande", price: 3.0, emoji: "🍺" },
  { id: 9, name: "Coca-Cola", category: "Bevande", price: 2.0, emoji: "🥤" },
  { id: 10, name: "Aranciata", category: "Bevande", price: 2.0, emoji: "🍊" },
];

const DEFAULT_STAFF = ["Mario Rossi", "Lucia Bianchi", "Giuseppe Verdi"];

const DEFAULT_USERS = [
  { id: 1, username: "admin", password: "admin123", role: "admin", name: "Amministratore" },
  { id: 2, username: "cameriere1", password: "cam1", role: "cameriere", name: "Mario" },
  { id: 3, username: "banco", password: "banco1", role: "banco", name: "Banco Principale" },
  { id: 4, username: "cassa", password: "cassa1", role: "cassa", name: "Cassa Principale" },
];

const CATEGORIES = ["Panini", "Contorni", "Dolci", "Bevande", "Altro"];
const EMOJIS = ["🍔","🌭","🍟","🥞","🍩","🎂","☕","🍺","🥤","🍊","🍕","🥗","🧃","🍫","🧁","🍦"];

// ─── STORAGE HELPERS ───────────────────────────────────────────────────────
const KEYS = { menu: "festa_menu", orders: "festa_orders", stock: "festa_stock", users: "festa_users", events: "festa_events", staff: "festa_staff" };

// ─── FIREBASE SETUP ───────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off } from 'firebase/database';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD6tJkl0sj0jz4RlC1erSQbz74WOVpZSuI",
  authDomain: "festa-parrocchia.firebaseapp.com",
  databaseURL: "https://festa-parrocchia-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "festa-parrocchia",
  storageBucket: "festa-parrocchia.firebasestorage.app",
  messagingSenderId: "450011045337",
  appId: "1:450011045337:web:8cec3ed66ea37bfc4d8dc8"
};

const _app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const _db = getDatabase(_app);

async function loadData(key, fallback) {
  // localStorage first for instant load
  let local = fallback;
  try {
    const raw = localStorage.getItem("festa_" + key);
    if (raw) local = JSON.parse(raw);
  } catch(e) {}
  // Then Firebase for latest
  try {
    const snapshot = await get(ref(_db, key));
    if (snapshot.exists()) {
      const val = snapshot.val();
      try { localStorage.setItem("festa_" + key, JSON.stringify(val)); } catch(e) {}
      return Array.isArray(val) ? val : (typeof val === 'object' && val !== null && !Array.isArray(fallback) ? val : val);
    }
  } catch(e) {
    console.warn("Firebase loadData failed, using local:", key, e);
  }
  return local;
}

async function saveData(key, value) {
  try { localStorage.setItem("festa_" + key, JSON.stringify(value)); } catch(e) {}
  try {
    await set(ref(_db, key), value);
  } catch(e) {
    console.error("Firebase saveData error:", key, e);
  }
}

function subscribeToKey(key, callback) {
  const r = ref(_db, key);
  onValue(r, (snapshot) => {
    if (snapshot.exists()) callback(snapshot.val());
  });
  return () => off(r);
}

// Export all data as a JSON backup file
function exportBackup(data) {
  const backup = { ...data, _exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `festa_backup_${new Date().toLocaleDateString("it-IT").replace(/[/]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import data from a JSON backup file
function importBackup(file, onDone) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      for (const [k, v] of Object.entries(KEYS)) {
        if (backup[v] !== undefined) await saveData(v, backup[v]);
      }
      onDone(true);
    } catch(err) { onDone(false); }
  };
  reader.readAsText(file);
}
// Dedicated counter for order numbers — stored as plain string to avoid parse issues
function formatOrderNumber(n) {
  return String(n).padStart(4, "0");
}

// ─── COMPONENTS ────────────────────────────────────────────────────────────
const Btn = ({ onClick, children, color = C.accent, small, disabled, danger, secondary }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: danger ? C.red : secondary ? "transparent" : color,
    color: secondary ? C.accent : C.bg,
    border: secondary ? `1px solid ${C.accent}` : "none",
    borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    padding: small ? "6px 12px" : "10px 20px",
    fontSize: small ? 13 : 15, fontWeight: 600,
    opacity: disabled ? 0.5 : 1, transition: "all 0.15s",
    fontFamily: "'Source Sans 3', sans-serif",
  }}>{children}</button>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
      padding: "10px 14px", fontSize: 15, width: "100%", fontFamily: "'Source Sans 3', sans-serif", ...style }} />
);

const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
      padding: "10px 14px", fontSize: 15, width: "100%", fontFamily: "'Source Sans 3', sans-serif" }}>
    {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
  </select>
);

const Badge = ({ children, color = C.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20,
    padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{children}</span>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, ...style }}>
    {children}
  </div>
);

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function LoginScreen({ users, onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const handle = () => {
    const usr = users.find(x => x.username === u && x.password === p);
    if (usr) onLogin(usr); else setErr("Credenziali non valide");
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at center, ${C.surface} 0%, ${C.bg} 70%)` }}>
      <Card style={{ width: 360, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎪</div>
        <h1 className="title-font" style={{ fontSize: 28, color: C.accentLight, marginBottom: 4 }}>Festa in Parrocchia</h1>
        <p style={{ color: C.textMuted, marginBottom: 24, fontSize: 14 }}>Gestione Gastronomia</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input value={u} onChange={setU} placeholder="Username" />
          <Input value={p} onChange={setP} placeholder="Password" type="password" />
          {err && <p style={{ color: C.red, fontSize: 13 }}>{err}</p>}
          <Btn onClick={handle}>Accedi</Btn>
        </div>
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 16 }}>
          admin/admin123 · cameriere1/cam1 · banco/banco1 · cassa/cassa1
        </p>
      </Card>
    </div>
  );
}

// ─── PRINT TICKET ──────────────────────────────────────────────────────────
function printTicket(order, menu) {
  const w = window.open("", "_blank");
  const items = order.items.map(i => {
    const m = menu.find(x => x.id === i.menuId);
    return `<tr><td>${m?.name ?? "?"}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">€${((m?.price ?? 0) * i.qty).toFixed(2)}</td></tr>`;
  }).join("");
  w.document.write(`<html><body style="font-family:monospace;padding:20px;max-width:300px">
    <h2 style="text-align:center">🎪 FESTA PARROCCHIA</h2>
    <hr/><p style="text-align:center;font-size:24px;font-weight:bold">N° ${String(order.number).padStart(4,"0")}</p>
    <p style="text-align:center;font-size:12px">${new Date(order.createdAt).toLocaleString("it-IT")}</p><hr/>
    <table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Prodotto</th><th>Qtà</th><th style="text-align:right">€</th></tr></thead>
    <tbody>${items}</tbody></table><hr/>
    <p style="text-align:right;font-size:18px;font-weight:bold">TOT: €${order.total.toFixed(2)}</p><hr/>
    <p style="text-align:center;font-size:11px">Grazie e buona festa! 🎉</p>
    </body></html>`);
  w.document.close(); w.print();
}

// ─── NEW ORDER ─────────────────────────────────────────────────────────────
function NewOrder({ menu, stock, onSubmit, user }) {
  const [cart, setCart] = useState({});
  const [note, setNote] = useState("");
  const [showCart, setShowCart] = useState(false);

  const addItem = (id) => {
    const inStock = stock[id] ?? null;
    const current = cart[id]?.qty ?? 0;
    if (inStock !== null && current >= inStock) return;
    setCart(c => ({ ...c, [id]: { qty: (c[id]?.qty ?? 0) + 1 } }));
  };
  const removeItem = (id) => {
    setCart(c => { const n = { ...c }; if (n[id]?.qty > 1) n[id] = { qty: n[id].qty - 1 }; else delete n[id]; return n; });
  };

  const total = Object.entries(cart).reduce((s, [id, { qty }]) => {
    const m = menu.find(x => x.id === parseInt(id)); return s + (m?.price ?? 0) * qty;
  }, 0);
  const cartCount = Object.values(cart).reduce((s, { qty }) => s + qty, 0);
  const grouped = CATEGORIES.filter(c => menu.some(m => m.category === c));

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Product list */}
      {grouped.map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <h3 style={{ color: C.accentLight, marginBottom: 10, fontSize: 13,
            textTransform: "uppercase", letterSpacing: 2 }}>{cat}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {menu.filter(m => m.category === cat).map(m => {
              const inCart = cart[m.id]?.qty ?? 0;
              const inStock = stock[m.id] ?? null;
              const outOfStock = inStock !== null && inStock === 0;
              return (
                <div key={m.id} style={{
                  background: inCart > 0 ? C.accentDark + "22" : C.surface,
                  border: `2px solid ${inCart > 0 ? C.accent : C.border}`,
                  borderRadius: 12, padding: "14px 16px",
                  opacity: outOfStock ? 0.4 : 1, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  {/* Emoji + name + price */}
                  <span style={{ fontSize: 32 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{m.name}</div>
                    <div style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>€{m.price.toFixed(2)}</div>
                    {inStock !== null && (
                      <div style={{ fontSize: 12, color: inStock <= 5 ? C.red : C.textMuted }}>
                        Scorta: {inStock}
                      </div>
                    )}
                    {outOfStock && <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Esaurito</div>}
                  </div>
                  {/* Controls */}
                  {inCart === 0 ? (
                    <button onClick={() => !outOfStock && addItem(m.id)} disabled={outOfStock}
                      style={{ background: C.accent, color: C.bg, border: "none", borderRadius: 8,
                        width: 44, height: 44, fontSize: 26, cursor: outOfStock ? "not-allowed" : "pointer",
                        fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0 }}>+</button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => removeItem(m.id)}
                        style={{ background: C.border, color: C.text, border: "none", borderRadius: 8,
                          width: 40, height: 40, fontSize: 22, cursor: "pointer", fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <span style={{ fontSize: 20, fontWeight: 800, color: C.accentLight, minWidth: 28,
                        textAlign: "center" }}>{inCart}</span>
                      <button onClick={() => addItem(m.id)}
                        style={{ background: C.accent, color: C.bg, border: "none", borderRadius: 8,
                          width: 40, height: 40, fontSize: 22, cursor: outOfStock ? "not-allowed" : "pointer",
                          fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                          opacity: outOfStock ? 0.4 : 1 }}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sticky bottom bar */}
      {cartCount > 0 && !showCart && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, width: "min(680px, calc(100vw - 40px))" }}>
          <button onClick={() => setShowCart(true)} style={{
            width: "100%", background: C.accent, color: C.bg, border: "none", borderRadius: 14,
            padding: "16px 24px", fontSize: 17, fontWeight: 700, cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)", fontFamily: "'Source Sans 3', sans-serif",
          }}>
            <span>🛒 {cartCount} {cartCount === 1 ? "prodotto" : "prodotti"}</span>
            <span>Vedi ordine →</span>
            <span style={{ fontWeight: 800 }}>€{total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300,
          display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowCart(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.card, borderRadius: "20px 20px 0 0", padding: 24,
            width: "min(700px, 100vw)", maxHeight: "80vh", overflowY: "auto",
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="title-font" style={{ color: C.accentLight, fontSize: 22 }}>🛒 Riepilogo ordine</h3>
              <button onClick={() => setShowCart(false)}
                style={{ background: C.border, border: "none", color: C.text, borderRadius: 8,
                  width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {Object.entries(cart).map(([id, { qty }]) => {
              const m = menu.find(x => x.id === parseInt(id));
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 22 }}>{m?.emoji}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{m?.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => removeItem(parseInt(id))}
                      style={{ background: C.border, color: C.text, border: "none", borderRadius: 6,
                        width: 32, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                    <span style={{ fontWeight: 800, fontSize: 16, minWidth: 24, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => addItem(parseInt(id))}
                      style={{ background: C.accent, color: C.bg, border: "none", borderRadius: 6,
                        width: 32, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                  </div>
                  <span style={{ color: C.accent, fontWeight: 700, minWidth: 56, textAlign: "right" }}>
                    €{((m?.price ?? 0) * qty).toFixed(2)}
                  </span>
                </div>
              );
            })}

            <div style={{ marginTop: 16 }}>
              <Input value={note} onChange={setNote} placeholder="📝 Note (opzionale)" />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              margin: "16px 0", padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Totale</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>€{total.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn secondary onClick={() => { setCart({}); setShowCart(false); }}>🗑️ Svuota</Btn>
              <div style={{ flex: 1 }}>
                <Btn onClick={() => { onSubmit(cart, note, total); setCart({}); setNote(""); setShowCart(false); }}>
                  ✅ Conferma e Stampa
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ORDERS LIST ───────────────────────────────────────────────────────────
function OrdersList({ orders, menu, onUpdateStatus, role }) {
  const [filter, setFilter] = useState("all");
  const filtered = orders.filter(o => filter === "all" || o.status === filter)
    .sort((a, b) => b.number - a.number);

  const statusColor = { pending: C.accent, ready: C.green };
  const statusLabel = { pending: "In attesa", ready: "Pronto ✅" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all","pending","ready"].map(s => (
          <Btn key={s} small secondary={filter !== s} onClick={() => setFilter(s)}>
            {s === "all" ? "Tutti" : statusLabel[s]}
            {s !== "all" && <span style={{ marginLeft: 6, background: statusColor[s] + "33", color: statusColor[s],
              borderRadius: 10, padding: "0 6px", fontSize: 11 }}>
              {orders.filter(o => o.status === s).length}
            </span>}
          </Btn>
        ))}
      </div>
      {filtered.length === 0
        ? <p style={{ color: C.textMuted }}>Nessun ordine</p>
        : <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(o => (
            <Card key={o.id} style={{ borderLeft: `4px solid ${statusColor[o.status]}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span className="title-font" style={{ fontSize: 22, color: C.accentLight }}>N° {formatOrderNumber(o.number)}</span>
                  <span style={{ marginLeft: 12 }}><Badge color={statusColor[o.status]}>{statusLabel[o.status]}</Badge></span>
                  {o.isService && <span style={{ marginLeft: 8 }}><Badge color={C.purple}>🛠️ Servizio</Badge></span>}
                  {o.isService && o.staffName && <span style={{ marginLeft: 6, color: C.purple, fontSize: 13, fontWeight: 600 }}>👤 {o.staffName}</span>}
                  {!o.isService && o.note && <span style={{ marginLeft: 8, color: C.textMuted, fontSize: 13 }}>📝 {o.note}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 16 }}>€{o.total.toFixed(2)}</span>
                  {o.status === "pending" && (role === "banco" || role === "admin") && (
                    <Btn small onClick={() => onUpdateStatus(o.id, "ready")}>✅ Pronto</Btn>
                  )}
                  <Btn small secondary onClick={() => printTicket(o, menu)}>🖨️ Stampa</Btn>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {o.items.map(i => {
                  const m = menu.find(x => x.id === i.menuId);
                  return <span key={i.menuId} style={{ background: C.surface, borderRadius: 6,
                    padding: "4px 10px", fontSize: 13 }}>{m?.emoji} {m?.name} ×{i.qty}</span>;
                })}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: C.textMuted }}>
                {new Date(o.createdAt).toLocaleString("it-IT")} · {o.createdBy}
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

// ─── STOCK MANAGEMENT ──────────────────────────────────────────────────────
function StockManager({ menu, stock, onUpdate }) {
  const [edits, setEdits] = useState({});
  const save = (id) => {
    const val = edits[id];
    if (val === undefined || val === "") return;
    onUpdate(id, parseInt(val));
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  };
  return (
    <div>
      <p style={{ color: C.textMuted, marginBottom: 16, fontSize: 14 }}>
        Imposta le scorte disponibili. Lascia vuoto per illimitato.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {menu.map(m => {
          const current = stock[m.id] ?? "";
          const edited = edits[m.id];
          const display = edited !== undefined ? edited : (current === null || current === undefined ? "" : current);
          const low = current !== null && current !== undefined && current <= 5 && current !== "";
          return (
            <Card key={m.id} style={{ borderLeft: `3px solid ${low ? C.red : C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                {low && <Badge color={C.red}>⚠️ Basso</Badge>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={display} onChange={e => setEdits(ed => ({ ...ed, [m.id]: e.target.value }))}
                  placeholder="∞ illimitato" type="number" min="0"
                  style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.text, padding: "8px 12px", fontSize: 14, fontFamily: "'Source Sans 3', sans-serif" }} />
                <Btn small onClick={() => save(m.id)}>💾</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── MENU MANAGER ──────────────────────────────────────────────────────────
function MenuManager({ menu, onAdd, onRemove, onToggle }) {
  const [form, setForm] = useState({ name: "", category: "Panini", price: "", emoji: "🍔" });
  const [showEmoji, setShowEmoji] = useState(false);

  const submit = () => {
    if (!form.name || !form.price) return;
    onAdd({ ...form, price: parseFloat(form.price) });
    setForm({ name: "", category: "Panini", price: "", emoji: "🍔" });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
      <div>
        <h3 style={{ color: C.accentLight, marginBottom: 12 }}>Prodotti nel menu</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {menu.map(m => (
            <Card key={m.id} style={{ display: "flex", alignItems: "center", gap: 12,
              opacity: m.active === false ? 0.5 : 1 }}>
              <span style={{ fontSize: 28 }}>{m.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{m.category} · €{m.price.toFixed(2)}</div>
              </div>
              <Btn small secondary onClick={() => onToggle(m.id)}>
                {m.active === false ? "▶ Attiva" : "⏸ Disattiva"}
              </Btn>
              <Btn small danger onClick={() => onRemove(m.id)}>🗑️</Btn>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <h3 style={{ color: C.accentLight, marginBottom: 16 }}>➕ Nuovo prodotto</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, display: "block" }}>Emoji</label>
            <button onClick={() => setShowEmoji(!showEmoji)} style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 16px", fontSize: 24, cursor: "pointer", width: "100%" }}>
              {form.emoji}
            </button>
            {showEmoji && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, background: C.surface,
                padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setForm(f => ({ ...f, emoji: e })); setShowEmoji(false); }}
                    style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: 4 }}>{e}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, display: "block" }}>Nome</label>
            <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Es. Panino con salsiccia" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, display: "block" }}>Categoria</label>
            <Select value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))}
              options={CATEGORIES} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, display: "block" }}>Prezzo (€)</label>
            <Input value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} placeholder="0.00" type="number" />
          </div>
          <Btn onClick={submit} disabled={!form.name || !form.price}>➕ Aggiungi</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── HISTORY ───────────────────────────────────────────────────────────────
function History({ orders, menu, events }) {
  const [selEvent, setSelEvent] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState("generale"); // "generale" | "utente"
  const [selUser, setSelUser] = useState("all");

  const filteredOrders = orders.filter(o => {
    if (selEvent !== "all" && o.eventId !== selEvent) return false;
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0,0,0,0);
      if (new Date(o.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23,59,59,999);
      if (new Date(o.createdAt) > to) return false;
    }
    return true;
  });

  // All unique users who created orders
  const userNames = [...new Set(orders.map(o => o.createdBy))].sort();

  // Per-user report data
  const userReport = userNames.map(name => {
    const userOrders = filteredOrders.filter(o => o.createdBy === name && !o.isService);
    const userService = filteredOrders.filter(o => o.createdBy === name && o.isService);
    const incasso = userOrders.reduce((s, o) => s + o.total, 0);
    const byItem = {};
    userOrders.forEach(o => o.items.forEach(i => {
      const m = menu.find(x => x.id === i.menuId);
      if (m) byItem[m.id] = { name: m.name, emoji: m.emoji, qty: (byItem[m.id]?.qty ?? 0) + i.qty };
    }));
    return { name, orderCount: userOrders.length, serviceCount: userService.length, incasso, byItem };
  }).filter(u => u.orderCount > 0 || u.serviceCount > 0);

  const displayedUsers = selUser === "all" ? userReport : userReport.filter(u => u.name === selUser);

  const total = filteredOrders.filter(o => !o.isService).reduce((s, o) => s + o.total, 0);
  const serviceCount = filteredOrders.filter(o => o.isService).length;
  const byItem = {};
  filteredOrders.filter(o => !o.isService).forEach(o => o.items.forEach(i => {
    const m = menu.find(x => x.id === i.menuId);
    if (m) byItem[m.id] = { name: m.name, emoji: m.emoji, qty: (byItem[m.id]?.qty ?? 0) + i.qty };
  }));

  const hasDateFilter = dateFrom || dateTo;
  const dateLabel = hasDateFilter
    ? `${dateFrom ? new Date(dateFrom).toLocaleDateString("it-IT") : "..."} → ${dateTo ? new Date(dateTo).toLocaleDateString("it-IT") : "..."}`
    : "Tutte le date";

  const filterBar = (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ minWidth: 200 }}>
        <Select value={selEvent} onChange={setSelEvent}
          options={[{ value: "all", label: "Tutte le serate" },
            ...events.map(e => ({ value: e.id, label: e.name }))]} />
      </div>
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowDatePicker(!showDatePicker)} style={{
          background: hasDateFilter ? C.accentDark : C.surface,
          border: `1px solid ${hasDateFilter ? C.accent : C.border}`,
          borderRadius: 8, color: C.text, padding: "10px 14px", fontSize: 14,
          cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif",
          display: "flex", alignItems: "center", gap: 8,
        }}>📅 {dateLabel}</button>
        {showDatePicker && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 16, minWidth: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 4 }}>Dal</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.text, padding: "8px 10px", fontSize: 14, width: "100%",
                    fontFamily: "'Source Sans 3', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 4 }}>Al</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.text, padding: "8px 10px", fontSize: 14, width: "100%",
                    fontFamily: "'Source Sans 3', sans-serif" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small secondary onClick={() => { setDateFrom(""); setDateTo(""); }}>🗑️ Reset</Btn>
              <Btn small onClick={() => setShowDatePicker(false)}>✓ Applica</Btn>
            </div>
          </div>
        )}
      </div>
      {hasDateFilter && <Btn small secondary onClick={() => { setDateFrom(""); setDateTo(""); }}>✕ Rimuovi date</Btn>}
    </div>
  );

  return (
    <div>
      {/* View mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["generale", "utente"].map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} style={{
            background: viewMode === mode ? C.accent : C.surface,
            color: viewMode === mode ? C.bg : C.textMuted,
            border: `1px solid ${viewMode === mode ? C.accent : C.border}`,
            borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif",
          }}>
            {mode === "generale" ? "📊 Generale" : "👤 Per Utente"}
          </button>
        ))}
      </div>

      {/* ── VISTA GENERALE ── */}
      {viewMode === "generale" && (
        <div>
          {filterBar}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
            <Card style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>📋</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>{filteredOrders.filter(o => !o.isService).length}</div>
              <div style={{ color: C.textMuted, fontSize: 13 }}>Ordini totali</div>
            </Card>
            <Card style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>💶</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>€{total.toFixed(2)}</div>
              <div style={{ color: C.textMuted, fontSize: 13 }}>Incasso totale</div>
            </Card>
            <Card style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🛠️</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.purple }}>{serviceCount}</div>
              <div style={{ color: C.textMuted, fontSize: 13 }}>Ordini servizio</div>
            </Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Card>
              <h3 style={{ color: C.accentLight, marginBottom: 12 }}>🏆 Prodotti più venduti</h3>
              {Object.values(byItem).length === 0
                ? <p style={{ color: C.textMuted, fontSize: 13 }}>Nessun dato</p>
                : Object.values(byItem).sort((a, b) => b.qty - a.qty).slice(0, 8).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                    <span>{item.emoji} {item.name}</span>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{item.qty} pz</span>
                  </div>
                ))
              }
            </Card>
            <Card>
              <h3 style={{ color: C.accentLight, marginBottom: 12 }}>📅 Ultimi ordini</h3>
              {filteredOrders.length === 0
                ? <p style={{ color: C.textMuted, fontSize: 13 }}>Nessun ordine nel periodo</p>
                : filteredOrders.slice(-10).reverse().map(o => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                    <span>
                      N°{formatOrderNumber(o.number)} · {new Date(o.createdAt).toLocaleDateString("it-IT")}
                      {o.isService && <span style={{ marginLeft: 6, color: C.purple, fontSize: 11, fontWeight: 700 }}>🛠️ {o.staffName}</span>}
                    </span>
                    <span style={{ color: o.isService ? C.purple : C.accent }}>
                      {o.isService ? "Servizio" : `€${o.total.toFixed(2)}`}
                    </span>
                  </div>
                ))
              }
            </Card>
          </div>
        </div>
      )}

      {/* ── VISTA PER UTENTE ── */}
      {viewMode === "utente" && (
        <div>
          {filterBar}

          {/* User selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[{ name: "all", label: "Tutti gli utenti" }, ...userReport.map(u => ({ name: u.name, label: u.name }))].map(u => (
              <button key={u.name} onClick={() => setSelUser(u.name)} style={{
                background: selUser === u.name ? C.accentDark : C.surface,
                color: selUser === u.name ? C.accentLight : C.textMuted,
                border: `1px solid ${selUser === u.name ? C.accent : C.border}`,
                borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif",
              }}>
                {u.name === "all" ? "👥 " : "👤 "}{u.label}
              </button>
            ))}
          </div>

          {displayedUsers.length === 0
            ? <Card style={{ textAlign: "center", padding: 32 }}>
                <p style={{ color: C.textMuted }}>Nessun dato nel periodo selezionato</p>
              </Card>
            : displayedUsers.map(u => (
              <Card key={u.name} style={{ marginBottom: 16, borderLeft: `4px solid ${C.accent}` }}>
                {/* User header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 32 }}>💰</span>
                    <div>
                      <div className="title-font" style={{ fontSize: 20, color: C.accentLight }}>{u.name}</div>
                      <div style={{ fontSize: 13, color: C.textMuted }}>
                        {u.orderCount} ordini · {u.serviceCount > 0 ? `${u.serviceCount} servizio` : "nessun servizio"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: C.textMuted }}>Incasso in cassa</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>€{u.incasso.toFixed(2)}</div>
                  </div>
                </div>

                {/* Products breakdown */}
                <div>
                  <div style={{ fontSize: 12, color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: 1, marginBottom: 8 }}>Prodotti venduti</div>
                  {Object.values(u.byItem).length === 0
                    ? <p style={{ color: C.textMuted, fontSize: 13 }}>Nessun ordine a pagamento</p>
                    : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                        {Object.values(u.byItem).sort((a, b) => b.qty - a.qty).map((item, i) => (
                          <div key={i} style={{ background: C.surface, borderRadius: 8,
                            padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 14 }}>{item.emoji} {item.name}</span>
                            <span style={{ color: C.accent, fontWeight: 700, fontSize: 14, marginLeft: 8 }}>{item.qty} pz</span>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </Card>
            ))
          }

          {/* Totale riepilogo se si vedono tutti */}
          {selUser === "all" && displayedUsers.length > 1 && (
            <Card style={{ borderLeft: `4px solid ${C.green}`, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>💶 Totale complessivo</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: C.green }}>
                  €{displayedUsers.reduce((s, u) => s + u.incasso, 0).toFixed(2)}
                </span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── USERS MANAGER ─────────────────────────────────────────────────────────
// ─── SERVICE ORDER ─────────────────────────────────────────────────────────
function ServiceOrder({ menu, stock, staff, onSubmit }) {
  const [cart, setCart] = useState({});
  const [selectedStaff, setSelectedStaff] = useState("");
  const [showCart, setShowCart] = useState(false);

  const addItem = (id) => {
    const inStock = stock[id] ?? null;
    const current = cart[id]?.qty ?? 0;
    if (inStock !== null && current >= inStock) return;
    setCart(c => ({ ...c, [id]: { qty: (c[id]?.qty ?? 0) + 1 } }));
  };
  const removeItem = (id) => {
    setCart(c => { const n = { ...c }; if (n[id]?.qty > 1) n[id] = { qty: n[id].qty - 1 }; else delete n[id]; return n; });
  };

  const cartCount = Object.values(cart).reduce((s, { qty }) => s + qty, 0);
  const grouped = CATEGORIES.filter(c => menu.some(m => m.category === c));

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Staff selector banner */}
      <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.purple}`, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 28 }}>👤</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Dipendente / Volontario</div>
          <Select
            value={selectedStaff}
            onChange={setSelectedStaff}
            options={[{ value: "", label: "— Seleziona dipendente —" }, ...staff.map(s => ({ value: s, label: s }))]}
          />
        </div>
        <Badge color={C.purple}>Servizio</Badge>
      </Card>

      {staff.length === 0 && (
        <Card style={{ textAlign: "center", padding: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <p style={{ color: C.textMuted }}>Nessun dipendente in lista. Aggiungili dalla sezione <strong style={{ color: C.accentLight }}>Utenti</strong>.</p>
        </Card>
      )}

      {/* Product list */}
      {grouped.map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <h3 style={{ color: C.accentLight, marginBottom: 10, fontSize: 13, textTransform: "uppercase", letterSpacing: 2 }}>{cat}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {menu.filter(m => m.category === cat).map(m => {
              const inCart = cart[m.id]?.qty ?? 0;
              const inStock = stock[m.id] ?? null;
              const outOfStock = inStock !== null && inStock === 0;
              return (
                <div key={m.id} style={{
                  background: inCart > 0 ? C.purple + "22" : C.surface,
                  border: `2px solid ${inCart > 0 ? C.purple : C.border}`,
                  borderRadius: 12, padding: "14px 16px",
                  opacity: outOfStock ? 0.4 : 1, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <span style={{ fontSize: 32 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{m.name}</div>
                    <div style={{ color: C.purple, fontWeight: 700, fontSize: 14 }}>GRATUITO</div>
                    {inStock !== null && (
                      <div style={{ fontSize: 12, color: inStock <= 5 ? C.red : C.textMuted }}>Scorta: {inStock}</div>
                    )}
                    {outOfStock && <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Esaurito</div>}
                  </div>
                  {inCart === 0 ? (
                    <button onClick={() => !outOfStock && addItem(m.id)} disabled={outOfStock}
                      style={{ background: C.purple, color: "white", border: "none", borderRadius: 8,
                        width: 44, height: 44, fontSize: 26, cursor: outOfStock ? "not-allowed" : "pointer",
                        fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => removeItem(m.id)}
                        style={{ background: C.border, color: C.text, border: "none", borderRadius: 8,
                          width: 40, height: 40, fontSize: 22, cursor: "pointer", fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <span style={{ fontSize: 20, fontWeight: 800, color: C.purple, minWidth: 28, textAlign: "center" }}>{inCart}</span>
                      <button onClick={() => addItem(m.id)}
                        style={{ background: C.purple, color: "white", border: "none", borderRadius: 8,
                          width: 40, height: 40, fontSize: 22, cursor: "pointer", fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sticky bottom bar */}
      {cartCount > 0 && !showCart && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, width: "min(680px, calc(100vw - 40px))" }}>
          <button onClick={() => setShowCart(true)} style={{
            width: "100%", background: C.purple, color: "white", border: "none", borderRadius: 14,
            padding: "16px 24px", fontSize: 17, fontWeight: 700, cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)", fontFamily: "'Source Sans 3', sans-serif",
          }}>
            <span>🛒 {cartCount} {cartCount === 1 ? "prodotto" : "prodotti"}</span>
            <span>Vedi ordine servizio →</span>
            <Badge color="white">€0.00</Badge>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300,
          display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowCart(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.card, borderRadius: "20px 20px 0 0", padding: 24,
            width: "min(700px, 100vw)", maxHeight: "80vh", overflowY: "auto",
            border: `1px solid ${C.purple}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 className="title-font" style={{ color: C.purple, fontSize: 22 }}>🛠️ Ordine di Servizio</h3>
              <button onClick={() => setShowCart(false)}
                style={{ background: C.border, border: "none", color: C.text, borderRadius: 8,
                  width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Staff name recap */}
            <div style={{ background: C.purple + "22", border: `1px solid ${C.purple}44`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
              👤 <strong>{selectedStaff || "⚠️ Nessun dipendente selezionato"}</strong>
            </div>

            {Object.entries(cart).map(([id, { qty }]) => {
              const m = menu.find(x => x.id === parseInt(id));
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 22 }}>{m?.emoji}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{m?.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => removeItem(parseInt(id))}
                      style={{ background: C.border, color: C.text, border: "none", borderRadius: 6,
                        width: 32, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                    <span style={{ fontWeight: 800, fontSize: 16, minWidth: 24, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => addItem(parseInt(id))}
                      style={{ background: C.purple, color: "white", border: "none", borderRadius: 6,
                        width: 32, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                  </div>
                  <span style={{ color: C.purple, fontWeight: 700, minWidth: 56, textAlign: "right" }}>€0.00</span>
                </div>
              );
            })}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              margin: "16px 0", padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Totale</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.purple }}>€ 0.00 — Servizio</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn secondary onClick={() => { setCart({}); setShowCart(false); }}>🗑️ Svuota</Btn>
              <div style={{ flex: 1 }}>
                <Btn disabled={!selectedStaff || Object.keys(cart).length === 0}
                  onClick={() => { onSubmit(cart, selectedStaff); setCart({}); setSelectedStaff(""); setShowCart(false); }}>
                  ✅ Conferma Ordine Servizio
                </Btn>
              </div>
            </div>
            {!selectedStaff && (
              <p style={{ color: C.red, fontSize: 13, marginTop: 8, textAlign: "center" }}>
                ⚠️ Seleziona un dipendente prima di confermare
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersManager({ users, onAdd, onRemove, staff, onAddStaff, onRemoveStaff }) {
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "cameriere" });
  const [newStaff, setNewStaff] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const roleColor = { admin: C.red, cameriere: C.blue, banco: C.green, cassa: C.accent };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Users section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ color: C.accentLight }}>Utenti registrati</h3>
            <Btn small secondary onClick={() => setShowPasswords(p => !p)}>
              {showPasswords ? "🙈 Nascondi password" : "👁️ Mostra password"}
            </Btn>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {users.map(u => (
              <Card key={u.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>
                  {u.role === "admin" ? "👑" : u.role === "banco" ? "🍽️" : u.role === "cassa" ? "💰" : "🧑"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.name} <span style={{ color: C.textMuted, fontSize: 13 }}>(@{u.username})</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <Badge color={roleColor[u.role]}>{u.role}</Badge>
                    {showPasswords && (
                      <span style={{ fontSize: 12, color: C.textMuted, background: C.surface,
                        border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px",
                        fontFamily: "monospace" }}>
                        🔑 {u.password}
                      </span>
                    )}
                  </div>
                </div>
                {u.role !== "admin" && (
                  <Btn small danger onClick={() => onRemove(u.id)}>🗑️</Btn>
                )}
              </Card>
            ))}
          </div>
        </div>
        <Card>
          <h3 style={{ color: C.accentLight, marginBottom: 16 }}>➕ Nuovo utente</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Nome completo" />
            <Input value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} placeholder="Username" />
            <Input value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Password" />
            <Select value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))}
              options={[{ value: "cameriere", label: "Cameriere" }, { value: "banco", label: "Banco" }, { value: "cassa", label: "Cassa" }]} />
            <Btn onClick={() => {
              if (!form.name || !form.username || !form.password) return;
              onAdd(form); setForm({ username: "", password: "", name: "", role: "cameriere" });
            }}>➕ Aggiungi</Btn>
          </div>
        </Card>
      </div>

      {/* Staff list section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div>
          <h3 style={{ color: C.accentLight, marginBottom: 12 }}>👷 Dipendenti / Volontari</h3>
          <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
            Lista usata negli ordini di servizio gratuiti.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {staff.length === 0
              ? <p style={{ color: C.textMuted, fontSize: 14 }}>Nessun dipendente aggiunto</p>
              : staff.map((s, i) => (
                <Card key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                  <span style={{ fontSize: 22 }}>👤</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{s}</span>
                  <Btn small danger onClick={() => onRemoveStaff(i)}>🗑️</Btn>
                </Card>
              ))
            }
          </div>
        </div>
        <Card>
          <h3 style={{ color: C.accentLight, marginBottom: 16 }}>➕ Nuovo dipendente</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input value={newStaff} onChange={setNewStaff} placeholder="Nome e Cognome" />
            <Btn onClick={() => {
              if (!newStaff.trim()) return;
              onAddStaff(newStaff.trim());
              setNewStaff("");
            }}>➕ Aggiungi</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── EVENT MANAGER ─────────────────────────────────────────────────────────
function EventManager({ events, currentEvent, onNew, onSwitch }) {
  const [name, setName] = useState("");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
      <div>
        <h3 style={{ color: C.accentLight, marginBottom: 12 }}>Serate registrate</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {events.map(e => (
            <Card key={e.id} style={{ display: "flex", alignItems: "center", gap: 12,
              borderLeft: `4px solid ${currentEvent?.id === e.id ? C.accent : C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{e.name}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{new Date(e.createdAt).toLocaleDateString("it-IT")}</div>
              </div>
              {currentEvent?.id !== e.id && <Btn small onClick={() => onSwitch(e)}>▶ Attiva</Btn>}
              {currentEvent?.id === e.id && <Badge color={C.green}>✓ Attiva</Badge>}
            </Card>
          ))}
        </div>
      </div>
      <Card>
        <h3 style={{ color: C.accentLight, marginBottom: 16 }}>🎪 Nuova serata</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Es. Festa di San Giovanni 2025" />
          <Btn onClick={() => { if (!name) return; onNew(name); setName(""); }}>🎉 Crea serata</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("orders");
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState({});
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = C.green) => {
    setToast({ msg, color }); setTimeout(() => setToast(null), 3000);
  };

  // Load all data
  useEffect(() => {
    (async () => {
      const [m, o, s, u, ev, st] = await Promise.all([
        loadData(KEYS.menu, DEFAULT_MENU),
        loadData(KEYS.orders, []),
        loadData(KEYS.stock, {}),
        loadData(KEYS.users, DEFAULT_USERS),
        loadData(KEYS.events, []),
        loadData(KEYS.staff, DEFAULT_STAFF),
      ]);
      const menuWithActive = m.map(x => ({ active: true, ...x }));
      setMenu(menuWithActive); setOrders(o); setStock(s); setUsers(u); setEvents(ev); setStaff(st);
      if (ev.length > 0) setCurrentEvent(ev[ev.length - 1]);
      setLoading(false);
    })();
  }, []);



  // Real-time sync from Firebase
  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToKey(KEYS.orders, (val) => {
      setOrders(Array.isArray(val) ? val : Object.values(val || {}));
    });
    const unsub2 = subscribeToKey(KEYS.stock, (val) => {
      setStock(val || {});
    });
    const unsub3 = subscribeToKey(KEYS.menu, (val) => {
      const arr = Array.isArray(val) ? val : Object.values(val || {});
      setMenu(arr.map(x => ({ active: true, ...x })));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user]);

  const submitOrder = async (cart, note, total) => {
    const maxNum = orders.reduce((m, o) => Math.max(m, Number(o.number) || 0), 0);
    const orderNum = maxNum + 1;

    const newOrder = {
      id: Date.now().toString(),
      number: orderNum,
      eventId: currentEvent?.id ?? "no-event",
      items: Object.entries(cart).map(([id, { qty }]) => ({ menuId: parseInt(id), qty })),
      note,
      total,
      status: "pending",
      createdAt: Date.now(),
      createdBy: user.name,
    };

    // Update stock
    const newStock = { ...stock };
    newOrder.items.forEach(i => {
      const s = newStock[i.menuId];
      if (s !== null && s !== undefined && s !== "") {
        newStock[i.menuId] = Math.max(0, Number(s) - i.qty);
      }
    });

    // Update state first (immediate UI feedback)
    const updated = [...orders, newOrder];
    setOrders(updated);
    setStock(newStock);

    // Then persist to storage
    await saveData(KEYS.orders, updated);
    await saveData(KEYS.stock, newStock);

    showToast(`✅ Ordine N°${formatOrderNumber(orderNum)} creato!`);
    setTimeout(() => printTicket(newOrder, menu), 300);
  };

  const updateStatus = async (id, status) => {
    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(updated); saveData(KEYS.orders, updated);
    showToast("✅ Ordine pronto!", C.green);
  };

  const updateStock = async (id, val) => {
    const newStock = { ...stock, [id]: val };
    setStock(newStock); saveData(KEYS.stock, newStock);
  };

  const addMenuItem = async (item) => {
    const newItem = { ...item, id: Date.now(), active: true };
    const updated = [...menu, newItem]; setMenu(updated); saveData(KEYS.menu, updated);
    showToast(`➕ ${item.name} aggiunto!`);
  };

  const removeMenuItem = async (id) => {
    const updated = menu.filter(m => m.id !== id); setMenu(updated); saveData(KEYS.menu, updated);
  };

  const toggleMenuItem = async (id) => {
    const updated = menu.map(m => m.id === id ? { ...m, active: !m.active } : m);
    setMenu(updated); saveData(KEYS.menu, updated);
  };

  const addUser = async (form) => {
    const newUser = { ...form, id: Date.now() };
    const updated = [...users, newUser]; setUsers(updated); saveData(KEYS.users, updated);
    showToast(`👤 ${form.name} aggiunto!`);
  };

  const removeUser = async (id) => {
    const updated = users.filter(u => u.id !== id); setUsers(updated); saveData(KEYS.users, updated);
  };

  const addStaff = async (name) => {
    const updated = [...staff, name];
    setStaff(updated);
    await saveData(KEYS.staff, updated);
    showToast(`👤 ${name} aggiunto!`);
  };

  const removeStaff = async (idx) => {
    const updated = staff.filter((_, i) => i !== idx);
    setStaff(updated);
    await saveData(KEYS.staff, updated);
  };

  const submitServiceOrder = async (cart, staffName) => {
    const maxNum = orders.reduce((m, o) => Math.max(m, Number(o.number) || 0), 0);
    const orderNum = maxNum + 1;

    const newOrder = {
      id: Date.now().toString(),
      number: orderNum,
      eventId: currentEvent?.id ?? "no-event",
      items: Object.entries(cart).map(([id, { qty }]) => ({ menuId: parseInt(id), qty })),
      note: "",
      total: 0,
      status: "ready",
      isService: true,
      staffName,
      createdAt: Date.now(),
      createdBy: user.name,
    };

    // Update stock
    const newStock = { ...stock };
    newOrder.items.forEach(i => {
      const s = newStock[i.menuId];
      if (s !== null && s !== undefined && s !== "") {
        newStock[i.menuId] = Math.max(0, Number(s) - i.qty);
      }
    });

    const updated = [...orders, newOrder];
    setOrders(updated);
    setStock(newStock);
    await saveData(KEYS.orders, updated);
    await saveData(KEYS.stock, newStock);
    showToast(`✅ Ordine servizio N°${formatOrderNumber(orderNum)} — ${staffName}`);
  };

  const createEvent = async (name) => {
    const ev = { id: Date.now().toString(), name, createdAt: Date.now() };
    const updated = [...events, ev]; setEvents(updated); setCurrentEvent(ev);
    await saveData(KEYS.events, updated);
    showToast(`🎪 Serata "${name}" creata!`);
  };

  const activeMenu = menu.filter(m => m.active !== false);

  // TAB CONFIG by role
  const tabs = {
    cameriere: [
      { id: "new", label: "➕ Nuovo Ordine" },
      { id: "service", label: "🛠️ Servizio" },
      { id: "orders", label: "📋 Ordini" },
    ],
    banco: [
      { id: "orders", label: "📋 Ordini" },
      { id: "service", label: "🛠️ Servizio" },
    ],
    cassa: [
      { id: "new", label: "➕ Nuovo Ordine" },
      { id: "service", label: "🛠️ Servizio" },
      { id: "orders", label: "📋 Ordini" },
    ],
    admin: [
      { id: "new", label: "➕ Nuovo Ordine" },
      { id: "service", label: "🛠️ Servizio" },
      { id: "orders", label: "📋 Ordini" },
      { id: "stock", label: "📦 Scorte" },
      { id: "menu", label: "🍽️ Menu" },
      { id: "history", label: "📊 Storico" },
      { id: "events", label: "🎪 Serate" },
      { id: "users", label: "👥 Utenti" },
    ],
  }[user?.role ?? "cameriere"];

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎪</div>
        <p style={{ color: C.textMuted }}>Caricamento...</p>
      </div>
    </div>
  );

  if (!user) return <LoginScreen users={users} onLogin={u => { setUser(u); setTab(u.role === "banco" ? "orders" : "new"); }} />;

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{css}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, background: toast.color,
          color: C.bg, padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 15,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", transition: "all 0.3s" }}>{toast.msg}</div>
      )}

      {/* Header */}
      <header className="no-print" style={{ background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 28 }}>🎪</span>
        <span className="title-font" style={{ fontSize: 20, color: C.accentLight }}>Festa Parrocchia</span>
        {currentEvent && <Badge color={C.purple}>📅 {currentEvent.name}</Badge>}
        <div style={{ flex: 1 }} />
        <span style={{ color: C.textMuted, fontSize: 13 }}>
          {user.role === "admin" ? "👑" : user.role === "banco" ? "🍽️" : user.role === "cassa" ? "💰" : "🧑"} {user.name}
        </span>
        {user.role === "admin" && <>
          <Btn small secondary onClick={() => exportBackup({
              [KEYS.orders]: orders,
              [KEYS.menu]: menu,
              [KEYS.stock]: stock,
              [KEYS.users]: users,
              [KEYS.events]: events,
              [KEYS.staff]: staff,
            })}>💾 Backup</Btn>
          <label style={{ cursor: "pointer" }}>
            <span style={{ background: "transparent", color: C.accent, border: `1px solid ${C.accent}`,
              borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600 }}>📂 Ripristina</span>
            <input type="file" accept=".json" style={{ display: "none" }}
              onChange={e => {
                if (!e.target.files[0]) return;
                importBackup(e.target.files[0], (ok) => {
                  if (ok) { showToast("✅ Backup ripristinato! Ricarica la pagina."); }
                  else { showToast("❌ File non valido", C.red); }
                  e.target.value = "";
                });
              }} />
          </label>
        </>}
        <Btn small secondary onClick={() => setUser(null)}>Esci</Btn>
      </header>

      {/* Tabs */}
      <nav className="no-print" style={{ background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: "0 20px", display: "flex", gap: 4, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", color: tab === t.id ? C.accentLight : C.textMuted,
            borderBottom: `3px solid ${tab === t.id ? C.accent : "transparent"}`,
            padding: "14px 16px", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 700 : 400,
            fontFamily: "'Source Sans 3', sans-serif", whiteSpace: "nowrap", transition: "all 0.15s"
          }}>{t.label}</button>
        ))}

        {/* Live indicator */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green,
            animation: "pulse 2s infinite", boxShadow: `0 0 6px ${C.green}` }} />
          <span style={{ fontSize: 12, color: C.textMuted }}>Live</span>
        </div>
      </nav>

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>

      {/* Content */}
      <main className="no-print" style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        {tab === "new" && (
          <NewOrder menu={activeMenu} stock={stock} onSubmit={submitOrder} user={user} />
        )}
        {tab === "service" && (
          <ServiceOrder menu={activeMenu} stock={stock} staff={staff} onSubmit={submitServiceOrder} />
        )}
        {tab === "orders" && (
          <OrdersList orders={orders} menu={menu} onUpdateStatus={updateStatus} role={user.role} />
        )}
        {tab === "stock" && (
          <StockManager menu={menu} stock={stock} onUpdate={updateStock} />
        )}
        {tab === "menu" && (
          <MenuManager menu={menu} onAdd={addMenuItem} onRemove={removeMenuItem} onToggle={toggleMenuItem} />
        )}
        {tab === "history" && (
          <History orders={orders} menu={menu} events={events} />
        )}
        {tab === "events" && (
          <EventManager events={events} currentEvent={currentEvent} onNew={createEvent} onSwitch={setCurrentEvent} />
        )}
        {tab === "users" && (
          <UsersManager users={users} onAdd={addUser} onRemove={removeUser}
            staff={staff} onAddStaff={addStaff} onRemoveStaff={removeStaff} />
        )}
      </main>
    </div>
  );
}
