// ─── État global ──────────────────────────────────────────────────────────────

let _uid = 0;
function uid() { return `n${++_uid}`; }

function createRule() {
  const field = FIELDS[0];
  const op    = OPERATORS_BY_TYPE[field.type][0];
  return { type: "rule", id: uid(), field: field.name, operator: op.id, value: "", value2: "" };
}
function createGroup(bool = "AND") {
  return { type: "group", id: uid(), boolean: bool, children: [createRule()] };
}

// Mode : "search" | "doc"
let appMode = "search";

// Bloc 1 — Recherche textuelle (q)
let qText  = "";
let qScope = "all"; // "all" | "title_s" | "abstract_s" | "keyword_s"

// Bloc 2 — Périmètre (fq)
let fqGroups = [];

// Filtre domaine disciplinaire
let domainFilter = { l0: "", l1: "", l2: "" };

// Bloc 3 — Affichage
let displayState = {
  flMode:      "count", // "default" | "all" | "pick"
  flPicked:    [],
  rows:        "0",
  countOnly:   true,
  start:       "0",
  wt:          "json",
  indent:      true,
  sortField:   "",
  sortDir:     "desc",
  facetFields: [],
  facetSort:   "",
  facetLimit:  "",
};

// Mode document unique
let docId = "";

// Point d'entrée
let baseUrl = "https://api.archives-ouvertes.fr/search";

// ─── Rendu principal ──────────────────────────────────────────────────────────

function render() {
  if (appMode === "doc") {
    document.getElementById("block-search").style.display = "none";
    document.getElementById("col-right").style.display    = "none";
    document.getElementById("block-doc").style.display    = "flex";
  } else {
    document.getElementById("block-search").style.display = "flex";
    document.getElementById("col-right").style.display    = "flex";
    document.getElementById("block-doc").style.display    = "none";
    renderFqSection();
    renderDisplaySection();
  }
  updatePreview();
}

// ─── Bloc 2 : Périmètre (fq) ─────────────────────────────────────────────────

function renderFqSection() {
  const container = document.getElementById("fq-list");
  const empty     = document.getElementById("fq-empty");
  container.innerHTML = "";
  if (fqGroups.length === 0) {
    empty.style.display = "flex";
  } else {
    empty.style.display = "none";
    fqGroups.forEach(g => container.appendChild(renderGroup(g, true, "fq")));
  }
}

// ─── Bloc 3 : Affichage ───────────────────────────────────────────────────────

function renderDisplaySection() {
  // fl radios
  document.querySelectorAll('input[name="fl-mode"]').forEach(r => {
    r.checked = (r.value === displayState.flMode);
  });
  const pickArea = document.getElementById("fl-pick-area");
  pickArea.style.display = displayState.flMode === "pick" ? "block" : "none";
  if (displayState.flMode === "pick") renderFlCheckboxes();

  // rows / countOnly
  const rowsInput  = document.getElementById("rows-input");
  if (displayState.countOnly) {
    rowsInput.value    = "0";
    rowsInput.disabled = true;
  } else {
    if (!displayState.rows || displayState.rows === "0") displayState.rows = "30"; // 30 par défaut
    rowsInput.value    = displayState.rows;
    rowsInput.disabled = false;
  }

  renderSortFieldSelect();
}

function renderFlCheckboxes() {
  const grid = document.getElementById("fl-checkboxes");
  grid.innerHTML = "";
  [...FIELDS].sort((a, b) => a.label.localeCompare(b.label)).forEach(f => {
    const label = el("label", "fl-checkbox-label");
    const cb    = document.createElement("input");
    cb.type    = "checkbox";
    cb.value   = f.name.replace(/_t$/, "_s");
    cb.checked = displayState.flPicked.includes(f.name.replace(/_t$/, "_s"));
    cb.onchange = () => {
      const fieldName = f.name.replace(/_t$/, "_s");
      if (cb.checked) { if (!displayState.flPicked.includes(fieldName)) displayState.flPicked.push(fieldName); }
      else { displayState.flPicked = displayState.flPicked.filter(n => n !== fieldName); }
      renderSortFieldSelect();
      updatePreview();
    };
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + f.label));
    const tech = el("span", "fl-field-tech"); tech.textContent = f.name.replace(/_t$/, "_s");
    label.appendChild(tech);
    grid.appendChild(label);
  });
}

function renderSortFieldSelect() {
  const DEFAULT_FL_FIELDS = ["docid", "label_s", "uri_s"];

  let fieldNames = [];
  if (displayState.flMode === "default") {
    fieldNames = DEFAULT_FL_FIELDS;
  } else if (displayState.flMode === "pick") {
    fieldNames = displayState.flPicked.map(f => f.replace(/_t$/, "_s"));
  } else if (displayState.flMode === "all") {
    fieldNames = FIELDS.map(f => f.name.replace(/_t$/, "_s"));
  }
  // flMode === "count" → fieldNames reste []

  const select = document.getElementById("sort-field");
  const current = displayState.sortField;

  select.innerHTML = `<option value="">— tri par défaut —</option>`;
  fieldNames.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  // Réinitialise si la valeur courante n'est plus dans la liste
  if (fieldNames.includes(current)) {
    select.value = current;
  } else {
    select.value = "";
    displayState.sortField = "";
  }
}

// ─── Rendu groupes / règles ───────────────────────────────────────────────────

function renderGroup(group, isRoot, context) {
  const wrap = el("div", "group" + (isRoot ? " group--root" : ""));
  wrap.dataset.id = group.id;

  const header = el("div", "group__header");

  if (!isRoot) {
    const removeBtn = iconBtn("×", "btn btn--ghost btn--icon", "Supprimer ce groupe");
    removeBtn.onclick = () => { fqGroups.forEach(g => removeNodeFrom(g, group.id)); render(); };
    header.appendChild(removeBtn);
  }

  const lbl = el("span", "group__label");
  lbl.textContent = isRoot ? "Filtre" : "Groupe";
  header.appendChild(lbl);

  const boolSel = el("div", "bool-selector");
  ["AND", "OR", "NOT"].forEach(b => {
    const btn = el("button", "bool-btn" + (group.boolean === b ? " bool-btn--active" : ""));
    btn.textContent = b;
    btn.onclick = () => { group.boolean = b; render(); };
    boolSel.appendChild(btn);
  });
  header.appendChild(boolSel);

  if (isRoot) {
    const delFq = el("button", "btn btn--remove-fq btn--sm");
    delFq.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg> Supprimer`;
    delFq.onclick = () => { fqGroups = fqGroups.filter(g => g.id !== group.id); render(); };
    header.appendChild(delFq);
  }

  wrap.appendChild(header);

  const body = el("div", "group__body");
  group.children.forEach(child => {
    body.appendChild(child.type === "rule" ? renderRule(child) : renderGroup(child, false, context));
  });
  wrap.appendChild(body);

  const actions = el("div", "group__actions");
  const addRule = el("button", "btn btn--outline btn--sm");
  addRule.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Condition`;
  addRule.onclick = () => { group.children.push(createRule()); render(); };
  actions.appendChild(addRule);

  const addGrp = el("button", "btn btn--outline btn--sm");
  addGrp.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Groupe`;
  addGrp.onclick = () => { group.children.push(createGroup("AND")); render(); };
  actions.appendChild(addGrp);

  wrap.appendChild(actions);
  return wrap;
}

function renderRule(rule) {
  const row = el("div", "rule");

  const fieldSel = el("select", "rule__select rule__field");
  [...FIELDS].filter(f => !f.outputOnly).sort((a, b) => a.label.localeCompare(b.label)).forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.name; opt.textContent = f.label;
    if (f.name === rule.field) opt.selected = true;
    fieldSel.appendChild(opt);
  });
  fieldSel.onchange = () => {
    rule.field    = fieldSel.value;
    rule.operator = OPERATORS_BY_TYPE[getField(rule.field).type][0].id;
    rule.value    = ""; rule.value2 = "";
    render();
  };
  row.appendChild(fieldSel);

  const ops   = getOperators(rule.field);
  const opSel = el("select", "rule__select rule__operator");
  ops.forEach(op => {
    const opt = document.createElement("option");
    opt.value = op.id; opt.textContent = op.label;
    if (op.id === rule.operator) opt.selected = true;
    opSel.appendChild(opt);
  });
  opSel.onchange = () => { rule.operator = opSel.value; render(); };
  row.appendChild(opSel);

  const currentOp = ops.find(o => o.id === rule.operator);
  const fieldType = getField(rule.field).type;
  if (currentOp && currentOp.arity >= 1) {
    row.appendChild(renderValueInput(rule, "value", fieldType));
  }
  if (currentOp && currentOp.arity === 2) {
    const sep = el("span", "rule__sep"); sep.textContent = "et";
    row.appendChild(sep);
    row.appendChild(renderValueInput(rule, "value2", fieldType));
  }

  const del = iconBtn("×", "btn btn--ghost btn--icon rule__delete", "Supprimer");
  del.onclick = () => { fqGroups.forEach(g => removeNodeFrom(g, rule.id)); render(); };
  row.appendChild(del);
  return row;
}

function renderValueInput(rule, key, fieldType) {
  const field = getField(rule.field);
  if (fieldType === "_domain") {
  const wrap = el("div", "domain-inline");

  const l0 = el("select", "domain-select");
  l0.innerHTML = "<option value=''>— toutes disciplines —</option>";
  Object.entries(DOMAIN_TREE)
    .sort((a,b) => a[1].label.localeCompare(b[1].label))
    .forEach(([code, d]) => {
      const opt = document.createElement("option");
      opt.value = code; opt.textContent = d.label;
      if (code === (rule[key] || "").split("|")[0]) opt.selected = true;
      l0.appendChild(opt);
    });

  const l1 = el("select", "domain-select");
  const l2 = el("select", "domain-select");
  l1.style.display = "none";
  l2.style.display = "none";

  function updateSelects() {
    const v0 = l0.value;
    l1.innerHTML = "<option value=''>— toute la discipline —</option>";
    l2.innerHTML = "<option value=''>— toute la sous-discipline —</option>";
    l1.style.display = "none"; l2.style.display = "none";
    if (v0 && DOMAIN_TREE[v0]) {
      Object.entries(DOMAIN_TREE[v0].children)
        .sort((a,b) => a[1].label.localeCompare(b[1].label))
        .forEach(([code, d]) => {
          const opt = document.createElement("option");
          opt.value = code; opt.textContent = d.label;
          l1.appendChild(opt);
        });
      l1.style.display = "";
    }
  }

  function updateL2() {
    const v0 = l0.value, v1 = l1.value;
    l2.innerHTML = "<option value=''>— toute la sous-discipline —</option>";
    l2.style.display = "none";
    const d1 = v1 && DOMAIN_TREE[v0] && DOMAIN_TREE[v0].children[v1];
    if (d1 && d1.children && Object.keys(d1.children).length > 0) {
      Object.entries(d1.children)
        .sort((a,b) => a[1].localeCompare(b[1]))
        .forEach(([code, label]) => {
          const opt = document.createElement("option");
          opt.value = code; opt.textContent = label;
          l2.appendChild(opt);
        });
      l2.style.display = "";
    }
  }

  function saveValue() {
    rule[key] = l2.value || l1.value || l0.value;
    updatePreview();
  }

  l0.onchange = () => { updateSelects(); l1.value = ""; l2.value = ""; saveValue(); };
  l1.onchange = () => { updateL2(); l2.value = ""; saveValue(); };
  l2.onchange = () => saveValue();

  // Restore state
  const saved = rule[key] || "";
  if (saved) {
    const parts = saved.split(".");
    l0.value = parts[0] || "";
    updateSelects();
    if (parts.length >= 2) {
      l1.value = parts[0] + "." + parts[1];
      updateL2();
    }
    if (parts.length >= 3) {
      l2.value = saved;
    }
  }

  wrap.appendChild(l0); wrap.appendChild(l1); wrap.appendChild(l2);
  return wrap;
}
  if (field && field.options) {
    const select = el("select", "rule__select");
    const blank  = document.createElement("option");
    blank.value = ""; blank.textContent = "— choisir —";
    select.appendChild(blank);
    field.options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.value; o.textContent = opt.label;
      if (opt.value === rule[key]) o.selected = true;
      select.appendChild(o);
    });
    select.onchange = () => { rule[key] = select.value; updatePreview(); };
    return select;
  }
  let input;
  if (fieldType === "_tdate") {
    input = el("input", "rule__input rule__input--date"); input.type = "date";
  } else if (fieldType === "_i") {
    input = el("input", "rule__input rule__input--number"); input.type = "number";
    input.placeholder = key === "value2" ? "jusqu'à" : "valeur";
  } else {
    input = el("input", "rule__input"); input.type = "text"; input.placeholder = "valeur…";
  }
  input.value = rule[key] || "";
  input.oninput = () => { rule[key] = input.value; updatePreview(); };
  return input;
}

// ─── Aperçu URL ───────────────────────────────────────────────────────────────

function updatePreview() {
  let readable, encoded;

  if (appMode === "doc") {
    const id = docId.trim();
    const base = baseUrl.trim().replace(/\/$/, "");
    if (!id) {
      readable = "(entrez un identifiant de document)";
      encoded  = "#";
    } else {
      encoded  = `${base}/?q=docid:${encodeURIComponent(id)}&fl=*`;
      readable = `${base}/?\n  q=docid:${id}\n  &fl=*`;
    }
  } else {
    const params = {
      rows:      displayState.countOnly ? "0" : displayState.rows,
      wt:        displayState.wt,
      indent:    displayState.indent,
      start:     displayState.start,
      sortField: displayState.sortField,
      sortDir:   displayState.sortDir,
      fl:        buildFl(),
    };
    const facets = { fields: displayState.facetFields, sort: displayState.facetSort, limit: displayState.facetLimit };
    readable = buildHALUrlReadable(baseUrl, qText, qScope, fqGroups, params, facets);
    encoded  = buildHALUrl(baseUrl, qText, qScope, fqGroups, params, facets);
  }

  document.getElementById("url-output").textContent = readable;
  document.getElementById("open-link").href = encoded;
}

function buildFl() {
  if (displayState.flMode === "all")  return "*";
  if (displayState.flMode === "pick") return displayState.flPicked.join(",");
  return "";
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

function copyUrl() {
  const params = { rows: displayState.countOnly ? "0" : displayState.rows, wt: displayState.wt, indent: displayState.indent, start: displayState.start, sortField: displayState.sortField, sortDir: displayState.sortDir, fl: buildFl() };
  const facets = { fields: displayState.facetFields, sort: displayState.facetSort, limit: displayState.facetLimit };
  let url;
  if (appMode === "doc") {
    const id = docId.trim();
    url = id ? `${baseUrl.trim().replace(/\/$/, "")}/?q=docid:${encodeURIComponent(id)}&fl=*` : "";
  } else {
    url = buildHALUrl(baseUrl, qText, qScope, fqGroups, params, facets);
  }
  if (!url || url === "#") return;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("copy-btn");
    btn.textContent = "Copié !";
    setTimeout(() => { btn.textContent = "Copier"; }, 2000);
  });
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetAll() {
  appMode      = "search";
  qText        = ""; qScope = "all";
  fqGroups     = [];
  domainFilter = { l0: "", l1: "", l2: "" };
  displayState = { flMode: "default", flPicked: [], rows: "30", countOnly: false, start: "0", wt: "json", indent: true, sortField: "", sortDir: "desc", facetFields: [], facetSort: "", facetLimit: "" };
  docId        = "";

  document.getElementById("mode-search").checked   = true;
  document.getElementById("q-text-input").value    = "";
  document.getElementById("q-scope-select").value  = "all";
  document.getElementById("rows-input").value      = "30";
  document.getElementById("rows-input").disabled   = false;
  document.getElementById("start-input").value     = "0";
  document.getElementById("wt-select").value       = "json";
  document.getElementById("indent-check").checked  = true;
  document.getElementById("sort-field").value      = "";
  document.getElementById("sort-dir").value        = "desc";
  document.getElementById("doc-id-input").value    = "";
  document.getElementById("facet-fields-list").innerHTML = "";
  document.getElementById("facet-sort").value      = "";
  document.getElementById("facet-limit").value     = "";
  render();
}

// ─── Utilitaires DOM ──────────────────────────────────────────────────────────

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function iconBtn(label, cls, title) { const b = el("button", cls); b.textContent = label; b.title = title; return b; }
function removeNodeFrom(group, id) {
  group.children = group.children.filter(c => c.id !== id);
  group.children.forEach(c => { if (c.type === "group") removeNodeFrom(c, id); });
}

function renderFacetList() {
  const list = document.getElementById("facet-fields-list");
  list.innerHTML = "";
  displayState.facetFields.forEach((val, idx) => {
    const row   = el("div", "facet-row");

    const select = el("select", "rule__select");
    const blank  = document.createElement("option");
    blank.value = ""; blank.textContent = "— choisir un champ —";
    select.appendChild(blank);
    [...FIELDS].sort((a, b) => a.label.localeCompare(b.label)).forEach(f => {
      const opt = document.createElement("option");
      opt.value   = f.name.replace(/_t$/, "_s");
      opt.textContent = f.label;
      if (f.name.replace(/_t$/, "_s") === val) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = () => { displayState.facetFields[idx] = select.value.replace(/_t$/, "_s"); updatePreview(); };
    row.appendChild(select);

    const del = iconBtn("×", "btn btn--ghost btn--icon", "Supprimer");
    del.onclick = () => { displayState.facetFields.splice(idx, 1); renderFacetList(); updatePreview(); };
    row.appendChild(del);

    list.appendChild(row);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  const themeBtn = document.getElementById('theme-btn');
themeBtn.onclick = () => {
  const isLight = document.body.classList.toggle('light');
  themeBtn.textContent = isLight ? '🌚​ Dark​' : '🌞​ Light';
};

  // Mode
  document.getElementById("mode-search").onchange = () => { appMode = "search"; render(); };
  document.getElementById("mode-doc").onchange    = () => { appMode = "doc";    render(); };

  // Base URL
  document.getElementById("input-base-url").oninput = e => { baseUrl = e.target.value; updatePreview(); };

  // Bloc 1 — recherche textuelle
  document.getElementById("q-text-input").oninput  = e => { qText  = e.target.value; updatePreview(); };
  document.getElementById("q-scope-select").onchange = e => { qScope = e.target.value; updatePreview(); };

  // Bloc 2 — ajouter un filtre
  document.getElementById("add-fq-btn").onclick = () => { fqGroups.push(createGroup("AND")); render(); };

  // Bloc 3 — fl mode
document.querySelectorAll('input[name="fl-mode"]').forEach(r => {
  r.onchange = () => {
    displayState.flMode    = r.value;
    displayState.countOnly = (r.value === "count");
    renderDisplaySection();
    updatePreview();
  };
});

document.getElementById("rows-input").addEventListener("input", e => {
  displayState.rows = e.target.value;
  displayState.countOnly = false;
  updatePreview();
});

  // Bloc 3 — autres params
  const bind = (id, key) => {
    const input = document.getElementById(id);
    const ev = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(ev, () => {
      displayState[key] = input.type === "checkbox" ? input.checked : input.value;
      updatePreview();
    });
    input.addEventListener("change", () => {
      displayState[key] = input.type === "checkbox" ? input.checked : input.value;
      updatePreview();
    });
  };
  bind("start-input",   "start");
  bind("wt-select",     "wt");
  bind("indent-check",  "indent");
  document.getElementById("sort-field").addEventListener("change", e => {
    displayState.sortField = e.target.value;
    updatePreview();
  });
  bind("sort-dir",      "sortDir");

  // Facettes
  document.getElementById("add-facet-btn").onclick = () => {
    displayState.facetFields.push(""); renderFacetList(); updatePreview();
  };
  document.getElementById("facet-sort").onchange = e  => { displayState.facetSort  = e.target.value; updatePreview(); };
  document.getElementById("facet-limit").oninput = e  => { displayState.facetLimit = e.target.value; updatePreview(); };

  // Doc mode
  document.getElementById("doc-id-input").oninput = e => { docId = e.target.value; updatePreview(); };

  // Boutons globaux
  document.getElementById("copy-btn").onclick  = copyUrl;
  document.getElementById("reset-btn").onclick = resetAll;

  render();
});
