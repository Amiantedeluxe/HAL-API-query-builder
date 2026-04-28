// ─── Sérialisation Lucene (q / fq) ───────────────────────────────────────────

function escapeString(v) {
  return v.replace(/[+\-&|!(){}[\]^"~*?:\\\/]/g, "\\$&");
}

function toHALDate(v) {
  if (/^\d{4}$/.test(v))              return `${v}-01-01T00:00:00Z`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00Z`;
  return v;
}

function serializeRule(rule) {
  const field = getField(rule.field);
  if (!field) return "";
  const { name, type } = field;
  if (rule.operator === "exists")     return `${name}:[* TO *]`;
  if (rule.operator === "not_exists") return `NOT ${name}:[* TO *]`;
  if (!rule.value.trim()) return "";
  const v  = rule.value.trim();
  const v2 = (rule.value2 || "").trim();

  // _s et _t : même syntaxe Lucene
  if (type === "_s" || type === "_t") {
    if (rule.operator === "contains")    return v.includes(" ") ? `${name}:"${escapeString(v)}"` : `${name}:*${escapeString(v)}*`;
    if (rule.operator === "is")          return `${name}:"${escapeString(v)}"`;
    if (rule.operator === "is_not")      return `NOT ${name}:"${escapeString(v)}"`;
    if (rule.operator === "starts_with") return `${name}:${escapeString(v)}*`;
  }
  if (type === "_i") {
    if (rule.operator === "eq")      return `${name}:${v}`;
    if (rule.operator === "neq")     return `NOT ${name}:${v}`;
    if (rule.operator === "lt")      return `${name}:[* TO ${v}}`;
    if (rule.operator === "gt")      return `${name}:{${v} TO *]`;
    if (rule.operator === "between") return `${name}:[${v} TO ${v2 || "*"}]`;
  }
  if (type === "_id") {
    if (rule.operator === "is")     return `${name}:"${v}"`;
    if (rule.operator === "is_not") return `NOT ${name}:"${v}"`;
  }
  if (type === "_tdate") {
    const d  = toHALDate(v);
    const d2 = v2 ? toHALDate(v2) : "*";
    if (rule.operator === "eq")           return `${name}:${d}`;
    if (rule.operator === "before")       return `${name}:[* TO ${d}]`;
    if (rule.operator === "after")        return `${name}:[${d} TO *]`;
    if (rule.operator === "date_between") return `${name}:[${d} TO ${d2}]`;
  }
  return "";
}

function serializeGroup(group) {
  const parts = group.children.map(serializeNode).filter(s => s.trim());
  if (!parts.length) return "";
  if (group.boolean === "NOT") {
    const inner = parts.map(c => `NOT ${c}`).join(" AND ");
    return parts.length > 1 ? `(${inner})` : inner;
  }
  const joined = parts.join(` ${group.boolean} `);
  return parts.length > 1 ? `(${joined})` : joined;
}

function serializeNode(node) {
  return node.type === "rule" ? serializeRule(node) : serializeGroup(node);
}

// ─── Sérialisation recherche textuelle libre (q=) ────────────────────────────

// fieldScope : "all" | "title_s" | "abstract_s" | "keyword_s"
function serializeFreetextQ(text, fieldScope) {
  const t = text.trim();
  if (!t) return "*:*";

  // Plusieurs mots → on les entoure de parenthèses pour le champ
  const val = t.includes(" ") ? `(${t})` : t;

  if (fieldScope === "all") return val;
  return `${fieldScope}:${val}`;
}

// ─── Construction de l'URL complète ──────────────────────────────────────────

function buildHALUrl(baseUrl, qText, qScope, fqGroups, params, facets) {
  const parts = [];

  parts.push(`q=${encodeURIComponent(serializeFreetextQ(qText, qScope))}`);

  fqGroups.forEach(fqGroup => {
    const fq = serializeNode(fqGroup).trim();
    if (fq) parts.push(`fq=${encodeURIComponent(fq)}`);
  });

  if (params.rows !== "" && params.rows !== undefined) parts.push(`rows=${params.rows}`);
  if (params.wt)     parts.push(`wt=${params.wt}`);
  if (params.indent) parts.push(`indent=true`);
  if (params.start && params.start !== "0") parts.push(`start=${params.start}`);
  if (params.sortField && params.sortDir) {
    parts.push(`sort=${encodeURIComponent(params.sortField.trim() + " " + params.sortDir)}`);
  }
  if (params.fl && params.fl.trim()) {
    parts.push(`fl=${encodeURIComponent(params.fl.trim())}`);
  }

  const activeFacets = (facets.fields || []).filter(f => f.trim());
  if (activeFacets.length > 0) {
    parts.push("facet=true");
    activeFacets.forEach(f => parts.push(`facet.field=${encodeURIComponent(f.trim())}`));
    if (facets.sort)  parts.push(`facet.sort=${facets.sort}`);
    if (facets.limit) parts.push(`facet.limit=${facets.limit}`);
  }

  const base = baseUrl.trim().replace(/\/$/, "");
  return `${base}/?${parts.join("&")}`;
}

function buildHALUrlReadable(baseUrl, qText, qScope, fqGroups, params, facets) {
  const parts = [];

  parts.push(`q=${serializeFreetextQ(qText, qScope)}`);

  fqGroups.forEach(fqGroup => {
    const fq = serializeNode(fqGroup).trim();
    if (fq) parts.push(`fq=${fq}`);
  });

  if (params.rows !== "" && params.rows !== undefined) parts.push(`rows=${params.rows}`);
  if (params.wt)     parts.push(`wt=${params.wt}`);
  if (params.indent) parts.push(`indent=true`);
  if (params.start && params.start !== "0") parts.push(`start=${params.start}`);
  if (params.sortField && params.sortDir) {
    parts.push(`sort=${params.sortField.trim()} ${params.sortDir}`);
  }
  if (params.fl && params.fl.trim()) {
    parts.push(`fl=${params.fl.trim()}`);
  }

  const activeFacets = (facets.fields || []).filter(f => f.trim());
  if (activeFacets.length > 0) {
    parts.push("facet=true");
    activeFacets.forEach(f => parts.push(`facet.field=${f.trim()}`));
    if (facets.sort)  parts.push(`facet.sort=${facets.sort}`);
    if (facets.limit) parts.push(`facet.limit=${facets.limit}`);
  }

  const base = baseUrl.trim().replace(/\/$/, "");
  return `${base}/?\n  ${parts.join("\n  &")}`;
}
