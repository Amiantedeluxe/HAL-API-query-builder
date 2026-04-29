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
  flMode:      "default", // "default" | "all" | "pick"
  flPicked:    [],
  rows:        "30",
  countOnly:   false,
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
    document.getElementById("block-doc").style.display    = "flex";
  } else {
    document.getElementById("block-search").style.display = "flex";
    document.getElementById("block-doc").style.display    = "none";
    renderFqSection();
    renderDisplaySection();
  }
  updatePreview();
}

// ─── Bloc 2 : Périmètre (fq) ─────────────────────────────────────────────────

function renderFqSection() {
  renderDomainFilter();
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

// ─── Filtre domaine disciplinaire ─────────────────────────────────────────────

function renderDomainFilter() {
  const l0Select = document.getElementById("domain-l0");
  const l1Wrap   = document.getElementById("domain-l1-wrap");
  const l1Select = document.getElementById("domain-l1");
  const l2Wrap   = document.getElementById("domain-l2-wrap");
  const l2Select = document.getElementById("domain-l2");

  // Level 0 — remplir une seule fois
  if (l0Select.options.length <= 1) {
    Object.entries(DOMAIN_TREE)
      .sort((a,b) => a[1].label.localeCompare(b[1].label))
      .forEach(([code, d]) => {
        const opt = document.createElement("option");
        opt.value = code; opt.textContent = d.label;
        l0Select.appendChild(opt);
      });
  }
  l0Select.value = domainFilter.l0;
  document.getElementById("domain-clear").style.display = domainFilter.l0 ? "inline-flex" : "none";

  // Level 1
  l1Select.innerHTML = "<option value=''>— toute la discipline —</option>";
  const d0 = domainFilter.l0 && DOMAIN_TREE[domainFilter.l0];
  if (d0) {
    Object.entries(d0.children)
      .sort((a,b) => a[1].label.localeCompare(b[1].label))
      .forEach(([code, d1]) => {
        const opt = document.createElement("option");
        opt.value = code; opt.textContent = d1.label;
        l1Select.appendChild(opt);
      });
    l1Wrap.style.display = "flex";
  } else {
    l1Wrap.style.display = "none";
  }
  l1Select.value = domainFilter.l1;

  // Level 2
  l2Select.innerHTML = "<option value=''>— toute la sous-discipline —</option>";
  const d1 = domainFilter.l1 && d0 && d0.children[domainFilter.l1];
  if (d1 && d1.children && Object.keys(d1.children).length > 0) {
    Object.entries(d1.children)
      .sort((a,b) => a[1].localeCompare(b[1]))
      .forEach(([code, label]) => {
        const opt = document.createElement("option");
        opt.value = code; opt.textContent = label;
        l2Select.appendChild(opt);
      });
    l2Wrap.style.display = "flex";
  } else {
    l2Wrap.style.display = "none";
    domainFilter.l2 = "";
  }
  l2Select.value = domainFilter.l2;
}

function domainFq() {
  if (!domainFilter.l0) return null;
  if (domainFilter.l2) return `level2_domain_s:${domainFilter.l2}`;
  if (domainFilter.l1) return `level1_domain_s:${domainFilter.l1}`;
  return `level0_domain_s:${domainFilter.l0}`;
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
  const countBtn   = document.getElementById("count-only-btn");
  if (displayState.countOnly) {
    rowsInput.value    = "0";
    rowsInput.disabled = true;
    countBtn.classList.add("btn--active");
  } else {
    rowsInput.disabled = false;
    countBtn.classList.remove("btn--active");
  }
}

function renderFlCheckboxes() {
  const grid = document.getElementById("fl-checkboxes");
  grid.innerHTML = "";
  FIELDS.forEach(f => {
    const label = el("label", "fl-checkbox-label");
    const cb    = document.createElement("input");
    cb.type    = "checkbox";
    cb.value   = f.name;
    cb.checked = displayState.flPicked.includes(f.name);
    cb.onchange = () => {
      if (cb.checked) { if (!displayState.flPicked.includes(f.name)) displayState.flPicked.push(f.name); }
      else { displayState.flPicked = displayState.flPicked.filter(n => n !== f.name); }
      updatePreview();
    };
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + f.label));
    const tech = el("span", "fl-field-tech"); tech.textContent = f.name;
    label.appendChild(tech);
    grid.appendChild(label);
  });
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
  FIELDS.forEach(f => {
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
    readable = buildHALUrlReadable(baseUrl, qText, qScope, fqGroups, params, facets, domainFq());
    encoded  = buildHALUrl(baseUrl, qText, qScope, fqGroups, params, facets, domainFq());
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
    url = buildHALUrl(baseUrl, qText, qScope, fqGroups, params, facets, domainFq());
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
    FIELDS.forEach(f => {
      const opt = document.createElement("option");
      opt.value   = f.name;
      opt.textContent = f.label + " (" + f.name + ")";
      if (f.name === val) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = () => { displayState.facetFields[idx] = select.value; updatePreview(); };
    row.appendChild(select);

    const del = iconBtn("×", "btn btn--ghost btn--icon", "Supprimer");
    del.onclick = () => { displayState.facetFields.splice(idx, 1); renderFacetList(); updatePreview(); };
    row.appendChild(del);

    list.appendChild(row);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  // Mode
  document.getElementById("mode-search").onchange = () => { appMode = "search"; render(); };
  document.getElementById("mode-doc").onchange    = () => { appMode = "doc";    render(); };

  // Base URL
  document.getElementById("input-base-url").oninput = e => { baseUrl = e.target.value; updatePreview(); };

  // Bloc 1 — recherche textuelle
  document.getElementById("q-text-input").oninput  = e => { qText  = e.target.value; updatePreview(); };
  document.getElementById("q-scope-select").onchange = e => { qScope = e.target.value; updatePreview(); };

  // Bloc 2 — domaine disciplinaire
  document.getElementById("domain-l0").onchange = e => {
    domainFilter.l0 = e.target.value;
    domainFilter.l1 = "";
    renderDomainFilter();
    updatePreview();
  };
  document.getElementById("domain-l1").onchange = e => {
    domainFilter.l1 = e.target.value;
    domainFilter.l2 = "";
    renderDomainFilter();
    updatePreview();
  };
  document.getElementById("domain-l2").onchange = e => {
    domainFilter.l2 = e.target.value;
    updatePreview();
  };
  document.getElementById("domain-clear").onclick = () => {
    domainFilter = { l0: "", l1: "", l2: "" };
    renderDomainFilter();
    updatePreview();
  };

  // Bloc 2 — ajouter un filtre
  document.getElementById("add-fq-btn").onclick = () => { fqGroups.push(createGroup("AND")); render(); };

  // Bloc 3 — fl mode
  document.querySelectorAll('input[name="fl-mode"]').forEach(r => {
    r.onchange = () => { displayState.flMode = r.value; renderDisplaySection(); updatePreview(); };
  });

  // Bloc 3 — rows + count-only
  document.getElementById("rows-input").addEventListener("input", e => {
    displayState.rows = e.target.value;
    displayState.countOnly = false;
    document.getElementById("count-only-btn").classList.remove("btn--active");
    updatePreview();
  });
  document.getElementById("count-only-btn").onclick = () => {
    displayState.countOnly = !displayState.countOnly;
    renderDisplaySection();
    updatePreview();
  };

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
  bind("sort-field",    "sortField");
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
