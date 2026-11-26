import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { categoryKey, defaultCategory } from "../utils/categories.js";
import { readCollection } from "./repository.js";

export async function readCategories() {
  const rows = await readCollection("categories");
  return rows
    .map((row) => ({
      id: row.id,
      name: [row.name_es, row.name, row.name_de]
        .find((value) => typeof value === "string" && value.trim())
        ?.trim(),
    }))
    .filter((row) => row.name);
}

export async function categoryForSave(form, categories, uid, original) {
  const creating = form.category === null;
  const name = (creating ? form.newCategory : form.category)
    .trim()
    .normalize("NFC");
  if (creating && !name)
    throw new Error("Escribe el nombre de la nueva categoría.");
  // Editing the translation of an old card must not replace an unresolved reference.
  if (!name && original) return {};
  const label = name || defaultCategory;
  const key = categoryKey(label);
  const existing =
    categories.find(
      (c) => c.id === original?.categoryId && categoryKey(c.name) === key,
    ) || categories.find((c) => categoryKey(c.name) === key);
  if (existing) return { categoryId: existing.id, category: existing.name };
  if (
    original?.categoryId &&
    original.categoryId !== "otros-local" &&
    categoryKey(original.category || original.categoryName) === key
  )
    return { categoryId: original.categoryId, category: label };

  // Existing random IDs remain valid. Concurrent creations of a new name use one document.
  const id = "cat_" + encodeURIComponent(key);
  const ref = doc(db, "categories", id);
  try {
    const savedName = await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref);
      if (snapshot.exists()) return snapshot.data().name_es || label;
      tx.set(ref, {
        name_es: label,
        name_de: label,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      return label;
    });
    return { categoryId: id, category: savedName };
  } catch {
    throw new Error(
      "No se pudo guardar la categoría. Conservamos lo que has escrito para que puedas reintentar.",
    );
  }
}
