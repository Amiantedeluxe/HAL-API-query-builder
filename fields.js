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
  { name: "authFullName_t",        label: "Auteur",               type: "_s"     },
  { name: "collection_t",            label: "Collection",           type: "_s"     },
  { name: "doiId_id",              label: "DOI",                  type: "_id"    },
  { name: "publicationDateY_i",    label: "Année de publication", type: "_i"     },
  { name: "publicationDate_tdate", label: "Date de publication",  type: "_tdate" },
  { name: "docType_s",            label: "Type de document",    type: "_s", options: [ 
  { value: "ART", label: "Article de revue" },
  { value: "COMM", label: "Communication dans un congrès" },
  { value: "COUV", label: "Chapitre d'ouvrage" },
  ]},
  { name: "primaryDomain_s",       label: "Discipline",    type: "_s", options: undefined },
  { name: "submitType_s",         label: "Type de dépôt",  type: "_s", options: [ 
  { value: "file", label: "avec fichier" },
  { value: "notice", label: "notice" },
  { value: "annex", label: "annexe" },
  ]},
  { name: "language_s",           label: "Langue",        type: "_s",  options: [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "de", label: "Allemand" },
  { value: "es", label: "Espagnol" },
  { value: "it", label: "Italien" },
{ value: "pt", label: "Portugais" },
{ value: "ru", label: "Russe" },
{ value: "zh", label: "Chinois" },
{ value: "ja", label: "Japonais" },
{ value: "ar", label: "Arabe" },
{ value: "ca", label: "Catalan" },
{ value: "pl", label: "Polonais" },
{ value: "el", label: "Grec" },
{ value: "eu", label: "Basque" },
{ value: "ro", label: "Roumain" },
{ value: "nl", label: "Néerlandais" },
{ value: "tr", label: "Turc" },
{ value: "uk", label: "Ukrainien" },
{ value: "hy", label: "Arménien" },
{ value: "cs", label: "Tchèque" },
{ value: "ko", label: "Coréen" },
{ value: "fa", label: "Persan" },
{ value: "bg", label: "Bulgare" },
{ value: "ie", label: "Interlingue" },
{ value: "hu", label: "Hongrois" },
{ value: "vi", label: "Vietnamien" },
{ value: "br", label: "Breton" },
{ value: "oc", label: "Occitan" },
{ value: "la", label: "Latin" },
{ value: "sv", label: "Suédois" },
{ value: "id", label: "Indonésien" },
{ value: "da", label: "Danois" },
{ value: "eo", label: "Espéranto" },
{ value: "sa", label: "Sanskrit" },
{ value: "sr", label: "Serbe" },
{ value: "ta", label: "Tamoul" },
{ value: "sq", label: "Albanais" },
{ value: "hr", label: "Croate" },
{ value: "he", label: "Hébreu" },
{ value: "fi", label: "Finnois" },
{ value: "hi", label: "Hindi" },
{ value: "ur", label: "Ourdou" },
{ value: "mr", label: "Marathi" },
{ value: "ms", label: "Malais" },
{ value: "sk", label: "Slovaque" },
{ value: "ff", label: "Peul" },
{ value: "co", label: "Corse" },
{ value: "gl", label: "Galicien" },
{ value: "no", label: "Norvégien" },
{ value: "sl", label: "Slovène" },
{ value: "lt", label: "Lituanien" },
{ value: "bs", label: "Bosnien" },
{ value: "mg", label: "Malgache" },
{ value: "et", label: "Estonien" },
{ value: "sw", label: "Swahili" },
{ value: "az", label: "Azéri" },
{ value: "km", label: "Khmer" },
{ value: "lv", label: "Letton" },
{ value: "mk", label: "Macédonien" },
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
