// Curated dictionary forms. Patterns describe the displayed sense, not every use.
export const GRAMMAR_CATALOG = {
  "verb:stellen": {
    principalParts: "stellt · stellte · gestellt",
    auxiliary: "haben",
    pattern: "etwas (Akk.) irgendwohin stellen",
    mainClause: "Ich stelle die Flasche auf den Tisch.",
    subordinateClause: "…, weil ich die Flasche auf den Tisch stelle.",
  },
  "verb:legen": {
    principalParts: "legt · legte · gelegt",
    auxiliary: "haben",
    pattern: "etwas (Akk.) irgendwohin legen",
  },
  "verb:setzen": {
    principalParts: "setzt · setzte · gesetzt",
    auxiliary: "haben",
    pattern: "jemanden (Akk.) auf einen Stuhl setzen; sich (Akk.) setzen",
  },
  "verb:lassen": {
    principalParts: "lässt · ließ · gelassen",
    auxiliary: "haben",
    pattern: "etwas (Akk.) irgendwo lassen; jemanden (Akk.) etwas tun lassen",
    registerEs:
      "Con otro infinitivo, el Perfekt suele usar lassen: Ich habe ihn gehen lassen.",
  },
  "verb:verlassen": {
    principalParts: "verlässt · verließ · verlassen",
    auxiliary: "haben",
    pattern: "jemanden / einen Ort (Akk.) verlassen",
  },
  "verb:stehen": {
    principalParts: "steht · stand · gestanden",
    auxiliary: "haben / sein (regional)",
    pattern: "an / auf / in + Dat. para indicar ubicación",
  },
  "verb:aufstehen": {
    principalParts: "steht auf · stand auf · aufgestanden",
    auxiliary: "sein",
    mainClause: "Ich stehe um sieben Uhr auf.",
    subordinateClause: "…, weil ich um sieben Uhr aufstehe.",
  },
  "verb:anrufen": {
    principalParts: "ruft an · rief an · angerufen",
    auxiliary: "haben",
    pattern: "jemanden (Akk.) anrufen",
    mainClause: "Ich rufe dich morgen an.",
    subordinateClause: "…, weil ich dich morgen anrufe.",
  },
  "verb:helfen": {
    principalParts: "hilft · half · geholfen",
    auxiliary: "haben",
    pattern: "jemandem (Dat.) helfen",
  },
  "verb:warten": {
    principalParts: "wartet · wartete · gewartet",
    auxiliary: "haben",
    pattern: "auf jemanden / etwas (Akk.) warten",
  },
  "verb:denken": {
    principalParts: "denkt · dachte · gedacht",
    auxiliary: "haben",
    pattern: "an jemanden / etwas (Akk.) denken",
  },
  "verb:gehen": { principalParts: "geht · ging · gegangen", auxiliary: "sein" },
  "verb:kommen": {
    principalParts: "kommt · kam · gekommen",
    auxiliary: "sein",
  },
  "verb:bringen": {
    principalParts: "bringt · brachte · gebracht",
    auxiliary: "haben",
    pattern: "jemandem (Dat.) etwas (Akk.) bringen",
  },
  "verb:holen": {
    principalParts: "holt · holte · geholt",
    auxiliary: "haben",
    pattern: "jemanden / etwas (Akk.) holen",
  },
  "verb:wissen": {
    principalParts: "weiß · wusste · gewusst",
    auxiliary: "haben",
  },
  "verb:kennen": {
    principalParts: "kennt · kannte · gekannt",
    auxiliary: "haben",
    pattern: "jemanden / etwas (Akk.) kennen",
  },
  "verb:leihen": {
    principalParts: "leiht · lieh · geliehen",
    auxiliary: "haben",
    pattern:
      "jemandem (Dat.) etwas (Akk.) leihen; sich (Dat.) etwas (Akk.) leihen",
  },
  "noun:Buch": { plural: "die Bücher" },
  "noun:Haus": { plural: "die Häuser" },
  "noun:Kind": { plural: "die Kinder" },
  "noun:Tisch": { plural: "die Tische" },
  "noun:Stuhl": { plural: "die Stühle" },
  "noun:Flasche": { plural: "die Flaschen" },
  "noun:Schlüssel": { plural: "die Schlüssel" },
  "noun:Bahnhof": { plural: "die Bahnhöfe" },
  "noun:Bus": { plural: "die Busse" },
  "noun:Arbeit": {
    plural: "die Arbeiten",
    registerEs:
      "El plural suele referirse a trabajos o tareas concretos; Arbeit como actividad suele ser incontable.",
  },
};
export function suggestedGrammar(word) {
  return GRAMMAR_CATALOG[`${word.type}:${word.german}`];
}
