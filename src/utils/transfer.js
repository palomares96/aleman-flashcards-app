import { prepareWordForSave } from "./vocabulary.js";
const normalized = (value) =>
  String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export function lexicalKey(word) {
  return JSON.stringify([
    word.type,
    normalized(word.german).replace(/[|·]/g, ""),
    normalized(word.spanish),
    normalized(word.learning?.hintEs),
  ]);
}
export function portableWord(word) {
  const output = {};
  for (const key of [
    "german",
    "spanish",
    "type",
    "category",
    "categoryId",
    "difficulty",
    "attributes",
    "learning",
    "grammar",
    "schemaVersion",
  ])
    if (word[key] !== undefined) output[key] = word[key];
  if (
    !["noun", "verb", "adjective", "preposition", "other"].includes(output.type)
  )
    throw new Error("Tipo de palabra no válido.");
  if (
    JSON.stringify(output).length > 20000 ||
    typeof output.german !== "string" ||
    typeof output.spanish !== "string" ||
    output.german.length > 250 ||
    output.spanish.length > 1000
  )
    throw new Error("La palabra excede el tamaño permitido.");
  for (const key of ["attributes", "learning", "grammar"]) {
    if (
      output[key] !== undefined &&
      (output[key] === null ||
        typeof output[key] !== "object" ||
        Array.isArray(output[key]))
    )
      throw new Error(`Campo ${key} no válido.`);
  }
  for (const key of ["gender", "pastTense", "participle", "case"])
    if (
      output.attributes?.[key] !== undefined &&
      typeof output.attributes[key] !== "string"
    )
      throw new Error(`Atributo ${key} no válido.`);
  if (
    output.grammar &&
    Object.entries(output.grammar).some(
      ([key, value]) => !["version"].includes(key) && typeof value !== "string",
    )
  )
    throw new Error("Los campos gramaticales deben ser texto.");
  return prepareWordForSave(output);
}
export function parseVocabularyBackup(json) {
  if (json.length > 5_000_000)
    throw new Error("El archivo debe ocupar menos de 5 MB.");
  const value = JSON.parse(json);
  if (
    value.format !== "aleman-vocabulary" ||
    value.version !== 1 ||
    !Array.isArray(value.words) ||
    value.words.length > 10000
  )
    throw new Error(
      "Selecciona una copia JSON de vocabulario de esta app (máximo 10.000 palabras).",
    );
  return [
    ...new Map(
      value.words.map((word) => {
        const prepared = portableWord(word);
        return [lexicalKey(prepared), prepared];
      }),
    ).values(),
  ];
}
const csvCell = (value) => {
  const text = String(value ?? "");
  // Spreadsheet formulas must stay text, including cells beginning with whitespace.
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
};
export function vocabularyCSV(words) {
  const header = [
    "German",
    "Spanish",
    "Type",
    "Article",
    "Plural",
    "Usage",
    "ExampleDE",
    "ExampleES",
    "Pattern",
  ];
  return (
    "\ufeff" +
    [
      header,
      ...words.map((word) => [
        word.german,
        word.spanish,
        word.type,
        { m: "der", f: "die", n: "das" }[word.attributes?.gender] || "",
        word.grammar?.plural,
        word.learning?.usageEs,
        word.learning?.exampleDe,
        word.learning?.exampleEs,
        word.grammar?.pattern,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
export function downloadFile(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
