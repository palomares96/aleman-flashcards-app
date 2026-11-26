// Catalogue exercises used one answer. Personal exercises can accept several.
export function contrastAnswers(exercise) {
  return exercise.answers || [exercise.answer];
}

export function validDocumentId(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    new TextEncoder().encode(value).length <= 1500 &&
    !value.includes("/") &&
    ![".", ".."].includes(value) &&
    !/^__.*__$/.test(value)
  );
}

export function prepareContrast(exercise) {
  const { id, wordIds, words, options, answers, sentence, explanation } =
    exercise;
  if (typeof id !== "string" || !/^custom_[\da-f-]{36}$/i.test(id))
    throw new Error("El identificador del contraste no es válido.");
  if (
    !Array.isArray(wordIds) ||
    ![2, 3].includes(wordIds.length) ||
    !wordIds.every(validDocumentId) ||
    new Set(wordIds).size !== wordIds.length
  )
    throw new Error("Elige dos o tres fichas distintas.");
  const strings = (values, length) =>
    Array.isArray(values) &&
    values.length === length &&
    values.every(
      (value) =>
        typeof value === "string" && value.trim() && value.length <= 1000,
    );
  if (!strings(words, wordIds.length) || !strings(options, wordIds.length))
    throw new Error("Escribe la forma que corresponde a cada ficha.");
  const forms = options.map((value) => value.trim());
  if (new Set(forms).size !== forms.length)
    throw new Error("Cada opción debe tener una forma distinta.");
  if (
    !Array.isArray(answers) ||
    !answers.length ||
    answers.length > forms.length ||
    !answers.every((answer) => options.includes(answer))
  )
    throw new Error("Marca al menos una opción válida.");
  if (
    typeof sentence !== "string" ||
    !sentence.includes("___") ||
    sentence.length > 2000
  )
    throw new Error(
      "Escribe la frase con ___ en cada hueco (máximo 2000 caracteres).",
    );
  if (
    typeof explanation !== "string" ||
    !explanation.trim() ||
    explanation.length > 2000
  )
    throw new Error("Añade una explicación de hasta 2000 caracteres.");
  return {
    id,
    wordIds,
    words,
    options: forms,
    answers: forms.filter((_, i) => answers.includes(options[i])),
    sentence: sentence.trim(),
    explanation: explanation.trim(),
  };
}
