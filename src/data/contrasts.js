// Authored sense contrasts. Every scene specifies the detail that determines the answer.
export const CONTRASTS = [
  {
    id: "stellen-bottle",
    words: ["stellen", "legen", "setzen"],
    prompt: "Coloco la botella de pie sobre la mesa.",
    sentence: "Ich ___ die Flasche auf den Tisch.",
    options: ["stelle", "lege", "setze"],
    answer: "stelle",
    explanation:
      "Stellen: colocar un objeto en posición vertical. Legen sería tumbar la botella; setzen suele colocar a alguien sentado.",
  },
  {
    id: "legen-book",
    words: ["stellen", "legen", "setzen"],
    prompt: "Dejo el libro tumbado, con la portada hacia arriba.",
    sentence: "Ich ___ das Buch auf den Tisch.",
    options: ["stelle", "lege", "setze"],
    answer: "lege",
    explanation:
      "Legen: colocar en posición horizontal. Stellen sería dejar el libro de pie.",
  },
  {
    id: "setzen-child",
    words: ["stellen", "legen", "setzen"],
    prompt: "Siento al niño en la silla.",
    sentence: "Ich ___ das Kind auf den Stuhl.",
    options: ["stelle", "lege", "setze"],
    answer: "setze",
    explanation:
      "Setzen: hacer que alguien quede sentado. Sich setzen significa sentarse uno mismo.",
  },
  {
    id: "lassen-keys",
    words: ["lassen", "verlassen"],
    prompt: "Dejo las llaves en casa; no me las llevo.",
    sentence: "Ich ___ die Schlüssel zu Hause.",
    options: ["lasse", "verlasse"],
    answer: "lasse",
    explanation:
      "Etwas irgendwo lassen: dejar algo en un lugar. Verlassen significa marcharse de un lugar o abandonar a alguien.",
  },
  {
    id: "verlassen-house",
    words: ["lassen", "verlassen"],
    prompt: "Salgo de casa a las ocho.",
    sentence: "Ich ___ das Haus um acht Uhr.",
    options: ["lasse", "verlasse"],
    answer: "verlasse",
    explanation:
      "Einen Ort verlassen: salir de un lugar. El lugar es el objeto directo, sin preposición.",
  },
  {
    id: "wissen-fact",
    words: ["wissen", "kennen"],
    prompt: "Sé que hoy viene Anna.",
    sentence: "Ich ___, dass Anna heute kommt.",
    options: ["weiß", "kenne"],
    answer: "weiß",
    explanation:
      "Wissen se usa para información o hechos; aquí introduce una oración con dass. Kennen expresa familiaridad con una persona o cosa.",
  },
  {
    id: "kennen-person",
    words: ["wissen", "kennen"],
    prompt: "Conozco personalmente a Anna.",
    sentence: "Ich ___ Anna persönlich.",
    options: ["weiß", "kenne"],
    answer: "kenne",
    explanation:
      "Jemanden kennen: conocer a una persona. No se usa wissen con una persona como objeto directo.",
  },
  {
    id: "holen-return",
    words: ["holen", "bringen"],
    prompt: "Voy a buscar leche al supermercado y vuelvo con ella.",
    sentence: "Ich gehe zum Supermarkt und ___ Milch.",
    options: ["hole", "bringe"],
    answer: "hole",
    explanation:
      "Holen incluye ir a buscar algo para traerlo. Bringen pone el foco en llevar algo hacia un destino.",
  },
  {
    id: "helfen-case",
    words: ["helfen"],
    prompt: "Ayudo a mi hermano.",
    sentence: "Ich helfe ___ Bruder.",
    options: ["meinem", "meinen"],
    answer: "meinem",
    explanation:
      "Helfen exige dativo: jemandem helfen. En masculino: meinem Bruder.",
  },
  {
    id: "warten-case",
    words: ["warten"],
    prompt: "Espero el autobús.",
    sentence: "Ich warte auf ___ Bus.",
    options: ["den", "dem"],
    answer: "den",
    explanation:
      "Warten auf + acusativo: auf den Bus. Es una combinación fija del verbo, no una regla de movimiento físico.",
  },
  {
    id: "prefix-main",
    words: ["aufstehen", "stehen"],
    prompt: "Me levanto a las siete (oración principal).",
    sentence: "Ich ___ um sieben Uhr ___.",
    options: ["stehe … auf", "aufstehe … —"],
    answer: "stehe … auf",
    explanation:
      "En una oración principal, el verbo conjugado ocupa la segunda posición y el prefijo separable va al final: Ich stehe um sieben Uhr auf.",
  },
  {
    id: "prefix-subordinate",
    words: ["aufstehen", "stehen"],
    prompt: "… porque me levanto temprano (oración subordinada con weil).",
    sentence: "…, weil ich früh ___.",
    options: ["aufstehe", "stehe auf"],
    answer: "aufstehe",
    explanation:
      "En una subordinada con weil, el verbo conjugado va al final unido a su prefijo: weil ich früh aufstehe.",
  },
];
