import { useState, useMemo } from "react";

// --- Data ---
const UTILITIES = {
  cooling: { label: "Cooling", unit: "ton-hrs", color: "#5b8c6f", light: "#e8f0eb", icon: "❄", rate: 0.18, rateFmt: "$/ton-hr" },
  heating: { label: "Heating", unit: "kBTU", color: "#c0564b", light: "#fae8e6", icon: "🔥", rate: 0.025, rateFmt: "$/kBTU" },
  water:   { label: "Water",   unit: "kGal",  color: "#4a7f96", light: "#e4eff4", icon: "💧", rate: 8.50, rateFmt: "$/kGal" },
};
const UTIL_KEYS = Object.keys(UTILITIES);
const MONTHS = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"];

const TENANTS = [
  { id: "t1", name: "Apex Legal Group", floor: "12", meters: [
    { id: "m1a", name: "AHU-12A", types: ["cooling", "heating"] },
    { id: "m1b", name: "AHU-12B", types: ["cooling", "heating"] },
    { id: "m1c", name: "DHW-12", types: ["water"] },
  ]},
  { id: "t2", name: "Meridian Health", floor: "11", meters: [
    { id: "m2a", name: "AHU-11A", types: ["cooling", "heating"] },
    { id: "m2b", name: "FCU-11-Lab", types: ["cooling"] },
    { id: "m2c", name: "DHW-11", types: ["water"] },
    { id: "m2d", name: "AHU-11B", types: ["cooling", "heating"] },
  ]},
  { id: "t3", name: "Northbridge Capital", floor: "10", meters: [
    { id: "m3a", name: "AHU-10A", types: ["cooling", "heating"] },
    { id: "m3b", name: "DHW-10", types: ["water"] },
  ]},
  { id: "t4", name: "Prism Design Studio", floor: "9", meters: [
    { id: "m4a", name: "AHU-9A", types: ["cooling", "heating"] },
    { id: "m4b", name: "AHU-9B", types: ["cooling", "heating"] },
    { id: "m4c", name: "FCU-9-Server", types: ["cooling"] },
    { id: "m4d", name: "DHW-9", types: ["water"] },
    { id: "m4e", name: "AHU-9C", types: ["heating"] },
  ]},
];

const seed = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
let seedIdx = 1;
const rng = () => seed(seedIdx++);

const METER_DATA = {};
const PLANT_DATA = {};
MONTHS.forEach((mo, mi) => {
  METER_DATA[mo] = {};
  TENANTS.forEach((t) => t.meters.forEach((m) => {
    METER_DATA[mo][m.id] = {};
    m.types.forEach((u) => {
      const base = u === "cooling" ? 420 : u === "heating" ? 1800 : 12;
      const seasonal = u === "cooling" ? 1 + mi * 0.15 : u === "heating" ? 1.4 - mi * 0.1 : 1;
      METER_DATA[mo][m.id][u] = +(base * seasonal * (0.7 + rng() * 0.6)).toFixed(1);
    });
  }));
  PLANT_DATA[mo] = {};
  UTIL_KEYS.forEach((u) => {
    let sum = 0;
    TENANTS.forEach((t) => t.meters.forEach((m) => { sum += METER_DATA[mo][m.id]?.[u] || 0; }));
    PLANT_DATA[mo][u] = +(sum * (1.05 + rng() * 0.07)).toFixed(1);
  });
});

// --- Theme ---
const THEME = {
  headerBg: "#3d4f7c",
  headerText: "#fff",
  tabActive: "#fff",
  tabActiveBg: "rgba(255,255,255,0.18)",
  tabInactive: "rgba(255,255,255,0.55)",
  bodyBg: "#f2f2ee",
  cardBg: "#ffffff",
  cardRadius: 6,
  cardShadow: "0 1px 3px rgba(0,0,0,0.06)",
  textPrimary: "#1a1a1a",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  accentGreen: "#5b8c6f",
  accentRed: "#c0564b",
  accentYellow: "#d4a843",
  accentBlue: "#4a7f96",
};

// --- Helpers ---
const fmt = (v) => v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtD = (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => v.toFixed(1) + "%";

// --- Shared hooks ---
function useTenantTotals(month) {
  return useMemo(() => {
    return TENANTS.map((t) => {
      const byUtil = {};
      UTIL_KEYS.forEach((u) => {
        const plant = PLANT_DATA[month]?.[u] || 1;
        let usage = 0;
        t.meters.filter((m) => m.types.includes(u)).forEach((m) => {
          usage += METER_DATA[month]?.[m.id]?.[u] || 0;
        });
        byUtil[u] = { usage, pctPlant: plant > 0 ? (usage / plant) * 100 : 0, cost: usage * UTILITIES[u].rate };
      });
      const totalCost = UTIL_KEYS.reduce((s, u) => s + byUtil[u].cost, 0);
      return { ...t, byUtil, totalCost };
    });
  }, [month]);
}

function useAllMeters(month) {
  return useMemo(() => {
    const rows = [];
    TENANTS.forEach((t) => {
      t.meters.forEach((m) => {
        m.types.forEach((u) => {
          const val = METER_DATA[month]?.[m.id]?.[u] || 0;
          const plant = PLANT_DATA[month]?.[u] || 1;
          rows.push({ tenantName: t.name, tenantId: t.id, meterName: m.name, meterId: m.id, utility: u, usage: val, pctPlant: plant > 0 ? (val / plant) * 100 : 0 });
        });
      });
    });
    return rows;
  }, [month]);
}

// --- Card wrapper matching screenshot style ---
function Card({ children, borderColor, style }) {
  return (
    <div style={{
      background: THEME.cardBg, borderRadius: THEME.cardRadius, boxShadow: THEME.cardShadow,
      borderLeft: borderColor ? `4px solid ${borderColor}` : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, right }) {
  return (
    <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

// =========================================================
//  SUMMARY PAGE
// =========================================================

function SummaryPage({ month, onNavigateDetail }) {
  const tenantTotals = useTenantTotals(month);
  const allMeters = useAllMeters(month);
  const [meterSort, setMeterSort] = useState({ col: "pct", asc: false });
  const [meterFilter, setMeterFilter] = useState("cooling");
  const [meterTableOpen, setMeterTableOpen] = useState(true);

  const grandTotal = tenantTotals.reduce((s, t) => s + t.totalCost, 0);

  const sortedMeters = useMemo(() => {
    let filtered = allMeters.filter((r) => r.utility === meterFilter);
    const dir = meterSort.asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (meterSort.col === "tenant") return a.tenantName.localeCompare(b.tenantName) * dir;
      if (meterSort.col === "meter") return a.meterName.localeCompare(b.meterName) * dir;
      if (meterSort.col === "utility") return a.utility.localeCompare(b.utility) * dir;
      if (meterSort.col === "usage") return (a.usage - b.usage) * dir;
      if (meterSort.col === "pct") return (a.pctPlant - b.pctPlant) * dir;
      return 0;
    });
  }, [allMeters, meterSort, meterFilter]);

  const toggleSort = (col) => setMeterSort((p) => p.col === col ? { col, asc: !p.asc } : { col, asc: true });
  const sortArrow = (col) => meterSort.col === col ? (meterSort.asc ? " ↑" : " ↓") : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Billing overview */}
      <Card borderColor={THEME.accentGreen}>
        <CardHeader title="Tenant Billing Overview" subtitle="Monthly usage & allocated cost by utility" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "inherit" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.border}`, borderTop: `1px solid ${THEME.borderLight}` }}>
                <th style={{ ...th, textAlign: "left", paddingLeft: 20 }}>Tenant</th>
                {UTIL_KEYS.map((u) => (
                  <th key={u} colSpan={2} style={{ ...th, textAlign: "center", color: UTILITIES[u].color, borderLeft: `1px solid ${THEME.borderLight}` }}>
                    {UTILITIES[u].icon} {UTILITIES[u].label}
                  </th>
                ))}
                <th style={{ ...th, textAlign: "right", paddingRight: 20, borderLeft: `2px solid ${THEME.border}` }}>Total</th>
              </tr>
              <tr style={{ borderBottom: `1px solid ${THEME.borderLight}` }}>
                <th style={thSub}></th>
                {UTIL_KEYS.map((u) => (
                  <React.Fragment key={u + "sub"}>
                    <th style={{ ...thSub, textAlign: "right" }}>Usage</th>
                    <th style={{ ...thSub, textAlign: "right" }}>Cost</th>
                  </React.Fragment>
                ))}
                <th style={{ ...thSub, borderLeft: `2px solid ${THEME.border}` }}></th>
              </tr>
            </thead>
            <tbody>
              {tenantTotals.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.borderLight}`, background: i % 2 === 0 ? "#fff" : "#fafaf8", cursor: "pointer" }} onClick={() => onNavigateDetail()}>
                  <td style={{ ...tdS, paddingLeft: 20, fontWeight: 700, color: THEME.textPrimary }}>{t.name}</td>
                  {UTIL_KEYS.map((u) => (
                    <React.Fragment key={u}>
                      <td style={{ ...tdS, textAlign: "right", color: UTILITIES[u].color, fontWeight: 600, fontFamily: "monospace", borderLeft: `1px solid ${THEME.borderLight}` }}>
                        {fmt(t.byUtil[u].usage)}
                        <span style={{ fontSize: 9, color: THEME.textMuted, marginLeft: 3 }}>{UTILITIES[u].unit}</span>
                      </td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: THEME.textPrimary }}>{fmtD(t.byUtil[u].cost)}</td>
                    </React.Fragment>
                  ))}
                  <td style={{ ...tdS, textAlign: "right", paddingRight: 20, fontWeight: 700, fontSize: 15, color: THEME.textPrimary, borderLeft: `2px solid ${THEME.border}` }}>
                    {fmtD(t.totalCost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${THEME.border}`, background: "#f6f6f2" }}>
                <td style={{ ...tdS, paddingLeft: 20, fontWeight: 700 }}>Building Total</td>
                {UTIL_KEYS.map((u) => {
                  const uTotal = tenantTotals.reduce((s, t) => s + t.byUtil[u].usage, 0);
                  const cTotal = tenantTotals.reduce((s, t) => s + t.byUtil[u].cost, 0);
                  return (
                    <React.Fragment key={u}>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: UTILITIES[u].color, fontFamily: "monospace", borderLeft: `1px solid ${THEME.borderLight}` }}>{fmt(uTotal)}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: THEME.textPrimary }}>{fmtD(cTotal)}</td>
                    </React.Fragment>
                  );
                })}
                <td style={{ ...tdS, textAlign: "right", paddingRight: 20, fontWeight: 700, fontSize: 16, color: THEME.textPrimary, borderLeft: `2px solid ${THEME.border}` }}>
                  {fmtD(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Meter allocation table */}
      <Card borderColor={THEME.accentBlue}>
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div onClick={() => setMeterTableOpen((p) => !p)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 10, color: THEME.textMuted, transition: "transform 0.2s", transform: meterTableOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▶</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textPrimary }}>Meter Allocation Table</span>
            <span style={{ fontSize: 12, color: THEME.textSecondary, marginLeft: 4 }}>All meters & % of plant</span>
          </div>
          {meterTableOpen && (
            <div style={{ display: "flex", gap: 2, background: "#f0f0ec", borderRadius: 6, padding: 3 }}>
              {UTIL_KEYS.map((k) => (
                <button key={k} onClick={() => setMeterFilter(k)} style={{
                  padding: "5px 14px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: meterFilter === k ? THEME.headerBg : "transparent",
                  color: meterFilter === k ? "#fff" : THEME.textSecondary,
                  fontWeight: 600, fontSize: 11, fontFamily: "inherit",
                }}>{UTILITIES[k].icon + " " + UTILITIES[k].label}</button>
              ))}
            </div>
          )}
        </div>
        {meterTableOpen && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "inherit" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.border}`, borderTop: `1px solid ${THEME.borderLight}` }}>
                  {[
                    { col: "tenant", label: "Tenant", align: "left", pl: 20 },
                    { col: "meter", label: "Meter", align: "left" },
                    { col: "utility", label: "Utility", align: "left" },
                    { col: "usage", label: "Usage", align: "right" },
                    { col: "pct", label: "% of Plant", align: "right", pr: 20 },
                  ].map((h) => (
                    <th key={h.col} onClick={() => toggleSort(h.col)} style={{
                      ...th, textAlign: h.align, paddingLeft: h.pl, paddingRight: h.pr,
                      cursor: "pointer", userSelect: "none",
                    }}>{h.label}{sortArrow(h.col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedMeters.map((r, i) => {
                  const cfg = UTILITIES[r.utility];
                  return (
                    <tr key={r.meterId + r.utility + i} style={{ borderBottom: `1px solid ${THEME.borderLight}`, background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                      <td style={{ ...tdS, paddingLeft: 20, fontWeight: 600, color: THEME.textPrimary }}>{r.tenantName}</td>
                      <td style={{ ...tdS, color: THEME.textSecondary }}>{r.meterName}</td>
                      <td style={tdS}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: cfg.light, color: cfg.color,
                          borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                        }}>{cfg.icon} {cfg.label}</span>
                      </td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: cfg.color, fontFamily: "monospace" }}>
                        {fmt(r.usage)} <span style={{ fontSize: 9, color: THEME.textMuted }}>{cfg.unit}</span>
                      </td>
                      <td style={{ ...tdS, textAlign: "right", paddingRight: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <div style={{ width: 80, height: 5, background: "#ececea", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(r.pctPlant, 100)}%`, height: "100%", background: cfg.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, minWidth: 42, textAlign: "right", fontFamily: "monospace" }}>{pct(r.pctPlant)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// =========================================================
//  DETAILS PAGE
// =========================================================

function PctBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 5, background: "#ececea", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 42, textAlign: "right", fontFamily: "monospace" }}>{pct(value)}</span>
    </div>
  );
}

function UtilityPanel({ utilKey, month }) {
  const cfg = UTILITIES[utilKey];
  const plant = PLANT_DATA[month]?.[utilKey] || 0;
  const [expanded, setExpanded] = useState({});

  const tenantData = useMemo(() => {
    return TENANTS.map((t) => {
      const meters = t.meters.filter((m) => m.types.includes(utilKey));
      const meterDetails = meters.map((m) => {
        const val = METER_DATA[month]?.[m.id]?.[utilKey] || 0;
        return { ...m, value: val, pctPlant: plant > 0 ? (val / plant) * 100 : 0, cost: val * cfg.rate };
      });
      const totalUsage = meterDetails.reduce((s, m) => s + m.value, 0);
      return { ...t, meters: meterDetails, totalUsage, totalPct: plant > 0 ? (totalUsage / plant) * 100 : 0, totalCost: totalUsage * cfg.rate, meterCount: meters.length };
    }).filter((t) => t.meterCount > 0);
  }, [utilKey, month, plant]);

  const sumMeters = tenantData.reduce((s, t) => s + t.totalUsage, 0);
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div>
      {/* Plant strip */}
      <Card borderColor={cfg.color} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex" }}>
          {[
            { label: "Plant Output", value: fmt(plant), sub: cfg.unit, highlight: true },
            { label: "Sum of Meters", value: fmt(sumMeters), sub: cfg.unit },
            { label: "Rate", value: cfg.rate < 1 ? cfg.rate.toFixed(3) : cfg.rate.toFixed(2), sub: cfg.rateFmt },
            { label: "Total Plant Cost", value: fmtD(plant * cfg.rate), sub: "" },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, padding: "16px 20px", borderRight: i < 3 ? `1px solid ${THEME.borderLight}` : "none" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: item.highlight ? cfg.color : THEME.textPrimary }}>
                {item.value}
                {item.sub && <span style={{ fontSize: 11, fontWeight: 500, color: THEME.textMuted, marginLeft: 4 }}>{item.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tenant rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tenantData.map((t) => {
          const isOpen = expanded[t.id];
          return (
            <Card key={t.id}>
              <div onClick={() => toggle(t.id)} style={{
                display: "grid", gridTemplateColumns: "24px 1.4fr 0.8fr 1.2fr 0.8fr 0.6fr",
                alignItems: "center", padding: "12px 20px", cursor: "pointer",
                background: isOpen ? "#f8f8f5" : "#fff", borderBottom: isOpen ? `1px solid ${THEME.border}` : "none",
                borderRadius: isOpen ? `${THEME.cardRadius}px ${THEME.cardRadius}px 0 0` : THEME.cardRadius,
              }}>
                <span style={{ fontSize: 10, color: THEME.textMuted, transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 8 }}>Fl. {t.floor} · {t.meterCount} meter{t.meterCount > 1 ? "s" : ""}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: cfg.color, fontFamily: "monospace" }}>{fmt(t.totalUsage)}</span>
                  <span style={{ fontSize: 10, color: THEME.textMuted, marginLeft: 4 }}>{cfg.unit}</span>
                </div>
                <div style={{ paddingLeft: 16 }}><PctBar value={t.totalPct} color={cfg.color} /></div>
                <div style={{ textAlign: "right", fontSize: 15, fontWeight: 700, color: THEME.textPrimary }}>{fmtD(t.totalCost)}</div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.light, borderRadius: 4, padding: "3px 8px" }}>
                    {pct(t.totalPct)} of plant
                  </span>
                </div>
              </div>
              {isOpen && (
                <div>
                  <div style={{
                    display: "grid", gridTemplateColumns: "24px 1.4fr 0.8fr 1.2fr 0.8fr 0.6fr",
                    padding: "8px 20px", fontSize: 9, fontWeight: 700, color: THEME.textMuted,
                    textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${THEME.borderLight}`,
                  }}>
                    <span></span><span>Meter</span><span style={{ textAlign: "right" }}>Usage</span>
                    <span style={{ paddingLeft: 16 }}>% of Plant</span><span style={{ textAlign: "right" }}>Cost</span><span></span>
                  </div>
                  {t.meters.map((m, i) => (
                    <div key={m.id} style={{
                      display: "grid", gridTemplateColumns: "24px 1.4fr 0.8fr 1.2fr 0.8fr 0.6fr",
                      alignItems: "center", padding: "10px 20px",
                      background: i % 2 === 0 ? "#fff" : "#fafaf8", borderBottom: `1px solid ${THEME.borderLight}`,
                    }}>
                      <span></span>
                      <span style={{ fontSize: 13, color: THEME.textSecondary, fontWeight: 500 }}>{m.name}</span>
                      <span style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: cfg.color, fontFamily: "monospace" }}>{fmt(m.value)}</span>
                      <div style={{ paddingLeft: 16 }}><PctBar value={m.pctPlant} color={cfg.color} /></div>
                      <span style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: THEME.textPrimary }}>{fmtD(m.cost)}</span>
                      <span></span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DetailsPage({ month }) {
  const [activeUtil, setActiveUtil] = useState("cooling");
  const [viewMode, setViewMode] = useState("single");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        {viewMode === "single" ? (
          <div style={{ display: "flex", gap: 0, background: THEME.cardBg, borderRadius: THEME.cardRadius, overflow: "hidden", boxShadow: THEME.cardShadow }}>
            {UTIL_KEYS.map((k) => {
              const cfg = UTILITIES[k];
              const isActive = activeUtil === k;
              return (
                <button key={k} onClick={() => setActiveUtil(k)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "10px 20px",
                  border: "none", cursor: "pointer", background: isActive ? cfg.color : "#fff",
                  color: isActive ? "#fff" : THEME.textMuted, fontWeight: 700, fontSize: 12, fontFamily: "inherit",
                  borderRight: `1px solid ${THEME.borderLight}`,
                }}>
                  <span style={{ fontSize: 14 }}>{cfg.icon}</span>{cfg.label}
                </button>
              );
            })}
          </div>
        ) : <div />}
        <div style={{ display: "flex", gap: 2, background: "#f0f0ec", borderRadius: 6, padding: 3 }}>
          {[{ key: "single", label: "Single Utility" }, { key: "all", label: "All Utilities" }].map((v) => (
            <button key={v.key} onClick={() => setViewMode(v.key)} style={{
              padding: "5px 14px", borderRadius: 4, border: "none", cursor: "pointer",
              background: viewMode === v.key ? THEME.headerBg : "transparent",
              color: viewMode === v.key ? "#fff" : THEME.textSecondary,
              fontWeight: 600, fontSize: 11, fontFamily: "inherit",
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {viewMode === "single" ? (
        <UtilityPanel utilKey={activeUtil} month={month} />
      ) : (
        UTIL_KEYS.map((k) => (
          <div key={k} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: UTILITIES[k].color, marginBottom: 10, paddingLeft: 4 }}>
              <span style={{ fontSize: 17 }}>{UTILITIES[k].icon}</span>{UTILITIES[k].label}
            </div>
            <UtilityPanel utilKey={k} month={month} />
          </div>
        ))
      )}
    </div>
  );
}

// =========================================================
//  STYLES
// =========================================================
const th = { padding: "10px 14px", fontSize: 10, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" };
const thSub = { padding: "4px 14px 8px", fontSize: 9, fontWeight: 600, color: "#c5c5be", textTransform: "uppercase", letterSpacing: "0.05em" };
const tdS = { padding: "11px 14px", fontSize: 13 };

// =========================================================
//  MAIN
// =========================================================
export default function MeterAllocationDashboard() {
  const [page, setPage] = useState("summary");
  const [month, setMonth] = useState(MONTHS[MONTHS.length - 1]);

  const PAGE_TABS = [
    { key: "summary", label: "Summary" },
    { key: "details", label: "Details" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: THEME.bodyBg, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header — matches screenshot navy style */}
      <div style={{ background: THEME.headerBg }}>
        <div style={{ padding: "18px 28px 0" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: THEME.headerText }}>Technical Education Center</div>
        </div>
        <div style={{ padding: "10px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          {/* Page tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {PAGE_TABS.map((p) => {
              const isActive = page === p.key;
              return (
                <button key={p.key} onClick={() => setPage(p.key)} style={{
                  padding: "10px 20px", border: "none", cursor: "pointer",
                  background: isActive ? THEME.tabActiveBg : "transparent",
                  color: isActive ? THEME.tabActive : THEME.tabInactive,
                  fontWeight: 600, fontSize: 13, fontFamily: "inherit",
                  borderRadius: "6px 6px 0 0",
                  borderBottom: isActive ? "2px solid #fff" : "2px solid transparent",
                }}>{p.label}</button>
              );
            })}
          </div>
          {/* Month selector */}
          <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
            {MONTHS.map((m) => {
              const isActive = month === m;
              return (
                <button key={m} onClick={() => setMonth(m)} style={{
                  padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                  fontWeight: 600, fontSize: 11, fontFamily: "inherit",
                }}>{m}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "22px 22px 48px" }}>
        {page === "summary" ? (
          <SummaryPage month={month} onNavigateDetail={() => setPage("details")} />
        ) : (
          <DetailsPage month={month} />
        )}
        <div style={{ textAlign: "center", marginTop: 32, fontSize: 10, color: THEME.textMuted }}>
          Cost = (Tenant Usage ÷ Plant Output) × Rate · SkySpark pUb
        </div>
      </div>
    </div>
  );
}
