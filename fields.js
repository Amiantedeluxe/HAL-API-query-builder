const OPERATORS_BY_TYPE = {
  _s: [
    { id: "contains",    label: "contient",       arity: 1 },
    { id: "is",          label: "est exactement", arity: 1 },
    { id: "is_not",      label: "n'est pas",      arity: 1 },
    { id: "starts_with", label: "commence par",   arity: 1 },
  ],
  _i: [
    { id: "eq",      label: "=",      arity: 1 },
    { id: "neq",     label: "≠",      arity: 1 },
    { id: "lt",      label: "<",      arity: 1 },
    { id: "gt",      label: ">",      arity: 1 },
    { id: "between", label: "entre",  arity: 2 },
  ],
  _id: [
    { id: "is",     label: "est",       arity: 1 },
    { id: "is_not", label: "n'est pas", arity: 1 },
  ],
  _tdate: [
    { id: "eq",           label: "le",       arity: 1 },
    { id: "before",       label: "avant le", arity: 1 },
    { id: "after",        label: "après le", arity: 1 },
    { id: "date_between", label: "entre",    arity: 2 },
  ],
};

const FIELDS = [
  { name: "authFullName_s",        label: "Auteur",               type: "_s"     },
  { name: "collection_t",            label: "Collection",           type: "_s"     },
  { name: "doiId_id",              label: "DOI",                  type: "_id"    },
  { name: "publicationDateY_i",    label: "Année de publication", type: "_i"     },
  { name: "publicationDate_tdate", label: "Date de publication",  type: "_tdate" },
  { name: "docType_s",            label: "Type de document",    type: "_s", options: undefined },
  { name: "primaryDomain_s",       label: "Discipline",    type: "_s", options: undefined },
  { name: "submitType_s",         label: "Type de dépôt",  type: "_s", options: undefined },
  { name: "language_s",           label: "Langue",        type: "_s",  options: [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "de", label: "Allemand" },
  { value: "es", label: "Espagnol" },
  { value: "it", label: "Italien" },
  { value: "pt", label: "Portugais" },
  ] },
  { name: "journalTitle_s",       label: "Titre de revue", type: "_s"     },
];

// Champs disponibles pour les facettes (on peut en ajouter d'autres ici)
const FACET_FIELD_SUGGESTIONS = [
  "authFullName_s",
  "collection_t",
  "docType_s",
  "primaryDomain_s",
  "publicationDateY_i",
  "submitType_s",
  "language_s",
  "journalTitle_s",
];

function getField(name) {
  return FIELDS.find(f => f.name === name);
}

function getOperators(fieldName) {
  const field = getField(fieldName);
  return field ? OPERATORS_BY_TYPE[field.type] : [];
}
