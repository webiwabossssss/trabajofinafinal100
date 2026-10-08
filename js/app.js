const KEY = "auctoritas-entrega-v2";
const ACCENTS = [
  { id: "oxblood", label: "Óxido", value: "#b5453a" },
  { id: "ink", label: "Tinta", value: "#d8d2c6" },
  { id: "olive", label: "Olivo", value: "#7d8a62" },
  { id: "slate", label: "Pizarra", value: "#7e8b9a" },
];

const TRAIT_KEYS = [
  "control", "charisma", "ideology", "tradition", "distrust",
  "loyaltyBias", "ruthlessness", "mass", "tempo", "spectacle",
];

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

const state = load() || {
  screen: "landing",
  name: "",
  accent: ACCENTS[0].value,
  answers: {},
  ranking: ["orden", "justicia", "lealtad", "control", "gloria"],
  q: 0,
  archiveId: "cesar",
};

let DATA = null;
const app = document.getElementById("app");

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function setAccent(v) {
  state.accent = v;
  document.documentElement.style.setProperty("--accent", v);
  save();
}

function go(screen) {
  state.screen = screen;
  save();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function emptyTraits() {
  return Object.fromEntries(TRAIT_KEYS.map((k) => [k, 50]));
}

function apply(t, d) {
  const o = { ...t };
  for (const k of TRAIT_KEYS) if (d[k] != null) o[k] += d[k];
  return o;
}

function score() {
  let t = emptyTraits();
  for (const q of DATA.QUESTIONS) {
    const a = q.answers.find((x) => x.id === state.answers[q.id]);
    if (a) t = apply(t, a.delta);
  }
  state.ranking.forEach((id, i) => {
    const item = DATA.VALUES.find((v) => v.id === id);
    if (item) t = apply(t, item.deltaByRank[i] || {});
  });
  for (const k of TRAIT_KEYS) t[k] = Math.max(4, Math.min(96, t[k]));
  return t;
}

function matches(user) {
  const raw = DATA.DICTATORS.map((d) => {
    let s = 0;
    for (const k of TRAIT_KEYS) {
      const diff = user[k] - d.traits[k];
      s += diff * diff;
    }
    return { d, dist: Math.sqrt(s) };
  });
  const max = Math.max(...raw.map((r) => r.dist));
  const min = Math.min(...raw.map((r) => r.dist));
  return raw
    .map((r) => ({
      dictator: r.d,
      percent: Math.round(((max === min ? 1 : (max - r.dist) / (max - min)) * 100)),
    }))
    .sort((a, b) => b.percent - a.percent);
}

function pic(d) {
  return (d.portrait || "").replace(/^\/+/, "").replace("/images/", "images/");
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;");
}

function imgTag(d, extraClass = "") {
  const local = pic(d);
  const remote = d.remote || "";
  return `<img class="${extraClass}" src="${local}" data-remote="${esc(remote)}" alt="Retrato histórico de ${esc(d.name)}" onerror="if(this.dataset.remote){this.onerror=null;this.src=this.dataset.remote}" />`;
}

function setBg(el, local, remote) {
  if (!el) return;
  const test = new Image();
  test.onload = () => {
    el.style.backgroundImage = `url("${local}")`;
  };
  test.onerror = () => {
    if (remote) el.style.backgroundImage = `url("${remote}")`;
  };
  test.src = local;
}

function updateAuthor() {
  const n = state.name || DATA.PROJECT_AUTHOR;
  document.getElementById("author-chip").textContent = n;
  document.getElementById("author-foot").textContent = n;
  document.querySelectorAll("nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.go === state.screen || (state.screen === "quiz" && b.dataset.go === "landing"));
  });
}

function landing() {
  const cards = DATA.DICTATORS.map(
    (d) => `<button class="portrait" data-arch="${d.id}">
      ${imgTag(d)}
      <div><h3>${esc(d.name)}</h3><p>${esc(d.years)}</p></div>
    </button>`,
  ).join("");
  app.innerHTML = `
    <section class="hero enter">
      <img class="bg" src="images/hero.jpg" alt="Archivo vacío con columnas y expedientes" />
      <div class="veil"></div>
      <div class="wrap">
        <p class="kicker">Inventario de personalidad · ${DATA.QUESTIONS.length} ítems · ${DATA.DICTATORS.length} arquetipos</p>
        <h1>AUCTORITAS</h1>
        <p class="lede">Un test psicológico serio. Mide cómo ejerces el desacuerdo, la lealtad, el control y los medios. Luego compara tu perfil con patrones documentados de quince autócratas históricos.</p>
        <div class="row">
          <button class="btn btn-primary" data-go="setup">Empezar el inventario</button>
          <button class="btn btn-ghost" data-go="method">Cómo se mide</button>
        </div>
        <p style="margin-top:20px;color:var(--faint);font-size:14px">Proyecto de ${esc(state.name || DATA.PROJECT_AUTHOR)}. El match es analogía de estilo, no veredicto moral.</p>
      </div>
    </section>
    <div class="wrap">
      <div class="grid-3">
        <article class="card"><h2>Instrumento, no meme</h2><p>Cinco respuestas por pregunta, ancladas en RWA, SDO, tríada oscura y Big Five.</p></article>
        <article class="card"><h2>Comparación histórica</h2><p>Open Library, OpenAlex y REST Countries aportan libros, papers citados y contexto. No usamos Wikipedia.</p></article>
        <article class="card"><h2>Hecho para usarse</h2><p>Clic, teclado 1–5, arrastrar valores, nombre y color. El progreso queda en este navegador.</p></article>
      </div>
      <h2>Archivo de arquetipos</h2>
      <div class="portraits">${cards}</div>
    </div>`;
}

function setup() {
  app.innerHTML = `
    <main class="page enter">
      <p class="kicker">Personalización</p>
      <h1>Quién responde</h1>
      <p>Tu nombre encabeza el informe. El color tiñe la interfaz. Nada se envía a un servidor.</p>
      <label for="nm">Nombre que quieres ver en la página</label>
      <input id="nm" type="text" maxlength="48" value="${esc(state.name)}" placeholder="${esc(DATA.PROJECT_AUTHOR)}" />
      <p class="err hidden" id="nm-err">Escribe tu nombre (mínimo 2 caracteres).</p>
      <p style="margin-top:24px;color:var(--muted);font-size:14px">Color de acento</p>
      <div class="accents">
        ${ACCENTS.map((a) => `<button type="button" class="accent-btn ${state.accent === a.value ? "on" : ""}" data-accent="${a.value}"><span class="swatch" style="background:${a.value}"></span>${a.label}</button>`).join("")}
      </div>
      <div class="card" style="margin-top:28px">
        <strong>Consentimiento breve</strong>
        <p>Esto no es un diagnóstico clínico. Coincidir con un perfil describe tendencias de estilo de poder, no destino. Los dictadores del archivo concentraron violencia.</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost" data-go="landing">Volver</button>
        <button class="btn btn-primary" id="to-quiz">Continuar</button>
      </div>
    </main>`;
}

function quiz() {
  const q = DATA.QUESTIONS[state.q];
  const chosen = state.answers[q.id];
  const pct = ((state.q + (chosen ? 1 : 0)) / DATA.QUESTIONS.length) * 100;
  app.innerHTML = `
    <main class="page enter">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">
        <span>Pregunta ${state.q + 1} / ${DATA.QUESTIONS.length}</span><span>${esc(q.axis)}</span>
      </div>
      <div class="progress"><span style="width:${Math.max(pct, 8)}%"></span></div>
      <h1>${esc(q.prompt)}</h1>
      <p style="color:var(--muted)">${esc(q.note)}</p>
      <p style="color:var(--faint);font-size:12px">Teclado: 1–5 · flechas · Enter</p>
      ${q.answers
        .map(
          (a, i) => `<button class="option ${chosen === a.id ? "on" : ""}" data-ans="${a.id}">
            <span class="num">${i + 1}</span><span>${esc(a.label)}</span>
          </button>`,
        )
        .join("")}
      <div class="nav-row">
        <button class="btn btn-ghost" id="prev" ${state.q === 0 ? "disabled" : ""}>Anterior</button>
        <button class="btn btn-primary" id="next" ${chosen ? "" : "disabled"}>${state.q === DATA.QUESTIONS.length - 1 ? "Ordenar valores" : "Siguiente"}</button>
      </div>
    </main>`;
}

function ranking() {
  app.innerHTML = `
    <main class="page enter">
      <p class="kicker">Último ítem</p>
      <h1>Jerarquía de valores</h1>
      <p>Arrastra o usa las flechas. El primero es lo que menos negociarías.</p>
      <div id="rank-list">
        ${state.ranking
          .map((id, i) => {
            const v = DATA.VALUES.find((x) => x.id === id);
            return `<div class="rank-item" draggable="true" data-id="${id}">
              <span class="num">${i + 1}</span><span class="grip">⠿</span>
              <div style="flex:1"><strong>${esc(v.label)}</strong><div style="font-size:12px;color:var(--muted)">${esc(v.hint)}</div></div>
              <div class="rank-btns">
                <button type="button" data-move="-1" data-id="${id}" aria-label="Subir">▲</button>
                <button type="button" data-move="1" data-id="${id}" aria-label="Bajar">▼</button>
              </div>
            </div>`;
          })
          .join("")}
      </div>
      <div class="row">
        <button class="btn btn-ghost" id="back-q">Volver</button>
        <button class="btn btn-primary" data-go="results">Ver informe</button>
      </div>
    </main>`;
}

async function results() {
  const user = score();
  const m = matches(user);
  const top = m[0];
  const d = top.dictator;
  app.innerHTML = `
    <main class="page wide enter">
      <div class="result-hero">
        <div class="pic" style="background-image:url('${pic(d)}')" data-remote="${esc(d.remote || "")}"></div>
        <div class="copy">
          <p class="kicker">Informe de ${esc(state.name)}</p>
          <h1>${esc(d.name)}</h1>
          <p style="color:var(--muted)">${esc(d.years)} · ${esc(d.place)} · proximidad ${top.percent}%</p>
          <p>${esc(d.hook)}</p>
          <p style="color:var(--muted)">${esc(d.ifYouMatch)}</p>
          <p id="country" style="font-size:12px;color:var(--faint)"></p>
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <h2>Lectura</h2>
        ${d.psychology.map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="card" style="margin-top:12px;border-color:color-mix(in oklab, var(--accent) 40%, var(--line))">
          <strong>Costo histórico</strong>
          <p>${esc(d.historicalCost)}</p>
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <h2>Vector</h2>
        <div class="bars">
          ${TRAIT_KEYS.map((k) => `<div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><span>${esc(DATA.TRAIT_LABELS[k].name)}</span><span>${Math.round(user[k])} / ${d.traits[k]}</span></div>
            <div class="bar"><span style="width:${user[k]}%"></span></div>
          </div>`).join("")}
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <h2>Fuentes académicas (en vivo)</h2>
        <p id="wiki">Consultando Open Library y OpenAlex…</p>
        <p style="font-size:12px;color:var(--faint)">${esc(d.sources)}</p>
      </div>
      <h2 style="margin-top:28px">Los demás</h2>
      <div class="portraits">
        ${m.slice(1).map((x) => `<button class="portrait" data-arch="${x.dictator.id}">
          ${imgTag(x.dictator)}
          <div><h3>${esc(x.dictator.name)}</h3><p>${x.percent}% proximidad</p></div>
        </button>`).join("")}
      </div>
      <div class="row">
        <button class="btn btn-ghost" id="restart">Repetir</button>
        <button class="btn btn-primary" data-arch="${d.id}">Abrir ficha</button>
      </div>
    </main>`;
  setBg(document.querySelector(".pic"), pic(d), d.remote);
  try {
    const q = encodeURIComponent(d.searchQuery || d.name);
    const [libRes, alexRes] = await Promise.all([
      fetch(`https://openlibrary.org/search.json?q=${q}&limit=3`),
      fetch(`https://api.openalex.org/works?search=${q}&per_page=3&sort=cited_by_count:desc`),
    ]);
    const lib = await libRes.json();
    const alex = await alexRes.json();
    const books = (lib.docs || []).slice(0, 3).map((b) => `<li><a href="https://openlibrary.org${b.key}" target="_blank" rel="noreferrer">${esc(b.title)}</a> — ${esc((b.author_name || ["s.a."])[0])}</li>`).join("");
    const papers = (alex.results || []).slice(0, 3).map((p) => `<li><a href="${p.id}" target="_blank" rel="noreferrer">${esc(p.display_name)}</a> — ${p.publication_year || ""} · ${(p.cited_by_count || 0).toLocaleString("es")} citas</li>`).join("");
    const el = document.getElementById("wiki");
    if (el) el.innerHTML = `<strong>Libros (Open Library)</strong><ul>${books || "<li>Sin resultados</li>"}</ul><strong>Papers (OpenAlex)</strong><ul>${papers || "<li>Sin resultados</li>"}</ul>`;
  } catch {
    const el = document.getElementById("wiki");
    if (el) el.textContent = "No se pudo cargar el catálogo académico. El informe local sigue válido.";
  }
  try {
    const c = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(d.countryQuery)}?fields=name,capital,region,population`);
    const rows = await c.json();
    const el = document.getElementById("country");
    if (el && rows[0]) {
      el.textContent = `REST Countries: ${rows[0].name.common} · capital ${rows[0].capital?.[0]} · ${rows[0].region} · ${rows[0].population.toLocaleString("es")} hab.`;
    }
  } catch { /* optional */ }
}

function archive() {
  const d = DATA.DICTATORS.find((x) => x.id === state.archiveId) || DATA.DICTATORS[0];
  app.innerHTML = `
    <main class="page wide enter">
      <h1>Archivo</h1>
      <p>Quince arquetipos. Retratos locales (súbelos tú). Fuentes: Open Library y OpenAlex.</p>
      <div class="chips" style="margin:16px 0">
        ${DATA.DICTATORS.map((x) => `<button class="chip ${x.id === d.id ? "on" : ""}" data-arch="${x.id}">${esc(x.name)}</button>`).join("")}
      </div>
      <div class="result-hero">
        <div class="pic" style="background-image:url('${pic(d)}')" data-remote="${esc(d.remote || "")}"></div>
        <div class="copy">
          <p class="kicker">${esc(d.years)} · ${esc(d.place)}</p>
          <h2>${esc(d.name)}</h2>
          <p>${esc(d.hook)}</p>
          ${d.psychology.map((p) => `<p style="color:var(--muted)">${esc(p)}</p>`).join("")}
          <p><strong>Costo histórico.</strong> ${esc(d.historicalCost)}</p>
          <p id="wiki" style="color:var(--muted)"></p>
        </div>
      </div>
    </main>`;
  setBg(document.querySelector(".pic"), pic(d), d.remote);
  fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(d.searchQuery || d.name)}&limit=3`)
    .then((r) => r.json())
    .then((j) => {
      const el = document.getElementById("wiki");
      if (!el) return;
      const books = (j.docs || []).slice(0, 3).map((b) => `${b.title} — ${(b.author_name || ["s.a."])[0]}`).join(". ");
      el.textContent = books || "";
    })
    .catch(() => {});
}

function method() {
  app.innerHTML = `
    <main class="page enter">
      <p class="kicker">Transparencia</p>
      <h1>Cómo se construye el perfil</h1>
      <p>El inventario combina personalidad autoritaria (Adorno / Altemeyer), orientación de dominancia social (Sidanius y Pratto) y rasgos de tríada oscura y Big Five. Cada respuesta mueve un vector de diez dimensiones. El match es el arquetipo más cercano por distancia, no una identidad.</p>
      ${TRAIT_KEYS.map((k) => `<div class="card" style="margin-top:10px"><strong>${esc(DATA.TRAIT_LABELS[k].name)}</strong><p>${esc(DATA.TRAIT_LABELS[k].low)} ↔ ${esc(DATA.TRAIT_LABELS[k].high)}</p></div>`).join("")}
      <div class="row"><button class="btn btn-ghost" data-go="landing">Volver</button><button class="btn btn-primary" data-go="setup">Hacer el inventario</button></div>
    </main>`;
}

function render() {
  updateAuthor();
  setAccent(state.accent);
  if (state.screen === "landing") landing();
  else if (state.screen === "setup") setup();
  else if (state.screen === "quiz") quiz();
  else if (state.screen === "ranking") ranking();
  else if (state.screen === "results") results();
  else if (state.screen === "archive") archive();
  else if (state.screen === "method") method();
}

function moveRank(id, dir) {
  const i = state.ranking.indexOf(id);
  const j = i + Number(dir);
  if (i < 0 || j < 0 || j >= state.ranking.length) return;
  const next = [...state.ranking];
  [next[i], next[j]] = [next[j], next[i]];
  state.ranking = next;
  save();
  render();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-go],[data-ans],[data-arch],[data-accent],[data-move],#to-quiz,#next,#prev,#back-q,#restart");
  if (!t) return;
  if (t.dataset.go) go(t.dataset.go);
  if (t.dataset.ans) {
    const q = DATA.QUESTIONS[state.q];
    state.answers[q.id] = t.dataset.ans;
    save();
    render();
  }
  if (t.dataset.arch) {
    state.archiveId = t.dataset.arch;
    go("archive");
  }
  if (t.dataset.accent) {
    setAccent(t.dataset.accent);
    render();
  }
  if (t.dataset.move) moveRank(t.dataset.id, t.dataset.move);
  if (t.id === "to-quiz") {
    const v = document.getElementById("nm").value.trim();
    if (v.length < 2) {
      document.getElementById("nm-err").classList.remove("hidden");
      return;
    }
    state.name = v;
    state.q = 0;
    go("quiz");
  }
  if (t.id === "next") {
    if (state.q === DATA.QUESTIONS.length - 1) go("ranking");
    else {
      state.q += 1;
      save();
      render();
    }
  }
  if (t.id === "prev") {
    state.q = Math.max(0, state.q - 1);
    save();
    render();
  }
  if (t.id === "back-q") {
    state.q = DATA.QUESTIONS.length - 1;
    go("quiz");
  }
  if (t.id === "restart") {
    state.answers = {};
    state.q = 0;
    go("setup");
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "nm") state.name = e.target.value;
});

document.addEventListener("keydown", (e) => {
  if (state.screen !== "quiz" || !DATA) return;
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
  const q = DATA.QUESTIONS[state.q];
  const n = ["1", "2", "3", "4", "5"].indexOf(e.key);
  if (n >= 0 && q.answers[n]) {
    state.answers[q.id] = q.answers[n].id;
    save();
    render();
  }
  if ((e.key === "ArrowRight" || e.key === "Enter") && state.answers[q.id]) {
    if (state.q === DATA.QUESTIONS.length - 1) go("ranking");
    else {
      state.q += 1;
      save();
      render();
    }
  }
  if (e.key === "ArrowLeft" && state.q > 0) {
    state.q -= 1;
    save();
    render();
  }
});

let dragId = null;
document.addEventListener("dragstart", (e) => {
  const item = e.target.closest(".rank-item");
  if (!item) return;
  dragId = item.dataset.id;
  item.classList.add("dragging");
});
document.addEventListener("dragover", (e) => {
  if (e.target.closest(".rank-item")) e.preventDefault();
});
document.addEventListener("drop", (e) => {
  const item = e.target.closest(".rank-item");
  if (!item || !dragId) return;
  e.preventDefault();
  const target = item.dataset.id;
  if (dragId === target) return;
  const next = state.ranking.filter((id) => id !== dragId);
  next.splice(next.indexOf(target), 0, dragId);
  state.ranking = next;
  dragId = null;
  save();
  render();
});

document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

const data = await fetch("js/data.json").then((r) => r.json());
DATA = data;
setAccent(state.accent);
render();
