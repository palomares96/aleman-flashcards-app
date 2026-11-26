import React, { useId } from "react";
import { categoryKey, defaultCategory } from "../utils/categories.js";
const optionPrefix = "category:";

export default function CategoryField({
  form,
  options,
  onChange,
  editing = false,
  loading = false,
}) {
  const id = useId();
  const creating = form.category === null;
  const names = options.map((option) => option.name);
  if (!names.some((name) => categoryKey(name) === categoryKey(defaultCategory)))
    names.push(defaultCategory);
  const selected = names.find(
    (name) => categoryKey(name) === categoryKey(form.category),
  );
  const fieldClass = "block mt-1 w-full rounded-xl p-3 bg-gray-800 text-white";
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-300">
        Categoría
      </label>
      <select
        id={id}
        name="category"
        disabled={loading}
        value={creating ? "new" : selected ? optionPrefix + selected : ""}
        className={fieldClass}
        onChange={(event) => {
          const value = event.target.value;
          onChange({
            category: value === "new" ? null : value.slice(optionPrefix.length),
            newCategory: "",
          });
        }}
      >
        <option value="" disabled={editing}>
          {loading ? "Cargando categorías…" : editing ? "Sin categoría" : "Elegir categoría (opcional)"}
        </option>
        {names.map((name) => (
          <option key={name} value={optionPrefix + name}>
            {name}
          </option>
        ))}
        <option value="new">+ Crear categoría…</option>
      </select>
      {creating && (
        <label className="block mt-3 text-sm text-gray-300">
          Nombre de la nueva categoría
          <input
            name="newCategory"
            required
            maxLength={100}
            value={form.newCategory}
            onChange={(event) => onChange({ newCategory: event.target.value })}
            className={fieldClass}
          />
        </label>
      )}
    </div>
  );
}
