const text = (value) =>
  typeof value === "string" ? value.trim().normalize("NFC") : "";
export const categoryKey = (name) => text(name).toLocaleLowerCase("es");
export const defaultCategory = "Otros";
const uncategorized = { id: "missing:", name: "Sin categoría" };

// The registry is authoritative for an ID. Older backups can contain only
// a label, and some older editors wrote the local placeholder "otros-local".
function storedName(word) {
  return (
    text(word.category) ||
    text(word.categoryName) ||
    (word.categoryId === "otros-local" ? defaultCategory : "")
  );
}

export function categoryIndex(categories, words) {
  const byId = new Map();
  const byName = new Map();
  function add(id, name) {
    const key = categoryKey(name);
    if (!key) return;
    const option = byName.get(key) || {
      id: id || "name:" + key,
      name: text(name),
    };
    byName.set(key, option);
    if (id) byId.set(id, option);
  }
  for (const { id, name } of categories) add(id, name);
  for (const word of words) {
    if (!byId.has(word.categoryId)) add(word.categoryId, storedName(word));
  }
  const forWord = (word) =>
    byId.get(word.categoryId) || byName.get(categoryKey(storedName(word)));
  const options = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  const unresolved = new Set(
    words
      .filter((word) => !forWord(word))
      .map((word) => word.categoryId || ""),
  );
  const filters = unresolved.size ? [...options, uncategorized] : options;
  const filterId = (id) => {
    if (!id) return "";
    if (byId.has(id)) return byId.get(id).id;
    if (unresolved.has(id) || (id === uncategorized.id && unresolved.size))
      return uncategorized.id;
    if (id.startsWith("name:")) return byName.get(id.slice(5))?.id || "";
    return "";
  };
  const matches = (word, id) => {
    const selected = filterId(id);
    return !selected || (forWord(word) || uncategorized).id === selected;
  };
  return { options, filters, forWord, matches, filterId };
}
