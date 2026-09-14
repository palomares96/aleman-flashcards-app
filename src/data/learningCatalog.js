// Authored learning aids, deliberately limited to useful, established meanings.
// Not an exhaustive dictionary. Never manufacture a verb by combining arbitrary prefixes.
export const LEARNING_VERSION = 1;

const note = (usageEs, exampleDe, exampleEs, hintEs = '') => ({
  version: LEARNING_VERSION, source: 'catalog-v1', usageEs, exampleDe, exampleEs, hintEs,
});

export const USAGE_NOTES = {
  'verb:stellen': note('Colocar algo de pie o en su posición de uso: una botella, una silla, un vaso. Para tumbarlo usa legen; para sentar a alguien, setzen. Con preposiciones de doble caso, el destino lleva acusativo. También aparece en expresiones como eine Frage stellen (hacer una pregunta).', 'Ich stelle die Flasche neben den Teller.', 'Coloco la botella de pie junto al plato.'),
  'verb:legen': note('Colocar algo tumbado o en horizontal. Compara stellen (de pie) y setzen (sentar). Legen describe la acción; liegen describe dónde está algo. En sentido espacial: auf den Tisch (destino) frente a auf dem Tisch (ubicación).', 'Ich lege das Handy auf das Sofa.', 'Dejo el móvil tumbado sobre el sofá.'),
  'verb:setzen': note('Sentar a alguien; sich setzen es sentarse. No es el equivalente general de poner objetos: suelen usarse stellen o legen según la posición. También hay usos figurados, como ein Ziel setzen (fijar un objetivo).', 'Ich setze das Kind auf den Stuhl.', 'Siento al niño en la silla.'),
  'verb:stehen': note('Estar de pie o estar colocado en posición vertical o de uso. Es un estado; stellen es la acción de colocar. Para algo tumbado usa liegen; para alguien sentado, sitzen.', 'Die Flasche steht neben dem Teller.', 'La botella está de pie junto al plato.'),
  'verb:liegen': note('Estar tumbado, en horizontal o situado en un lugar. Es un estado; legen es colocar en esa posición. No confundir con lügen (mentir).', 'Das Handy liegt auf dem Sofa.', 'El móvil está sobre el sofá.'),
  'verb:sitzen': note('Estar sentado: describe un estado. Sich setzen significa sentarse y expresa el cambio de posición.', 'Das Kind sitzt auf dem Stuhl.', 'El niño está sentado en la silla.'),
  'verb:lassen': note('Dejar tiene varios sentidos: dejar algo donde está (etwas hier lassen), permitir (jemanden etwas tun lassen) o hacer que otro realice algo (etwas reparieren lassen). Para prestar algo usa leihen; para abandonar a alguien o salir de un lugar, verlassen; para dejar de hacer algo, aufhören mit + dativo.', 'Ich lasse meinen Rucksack hier.', 'Dejo mi mochila aquí.'),
  'verb:verlassen': note('Abandonar a alguien o salir de un lugar. Lleva objeto directo en acusativo: die Wohnung verlassen. Para dejar un objeto en un sitio usa lassen, no verlassen.', 'Wir verlassen das Büro um sechs.', 'Salimos de la oficina a las seis.'),
  'verb:leihen': note('Puede ser prestar o tomar prestado: jemandem etwas leihen (prestar algo a alguien) y sich etwas von jemandem leihen (tomar algo prestado de alguien). La persona que recibe lleva dativo; el objeto, acusativo.', 'Ich leihe dir meinen Stift.', 'Te presto mi bolígrafo.'),
  'verb:aufhören': note('Dejar de hacer algo o terminar una actividad: aufhören mit + dativo, o aufhören zu + infinitivo. El prefijo auf se separa en una oración principal.', 'Ich höre auf, so spät Kaffee zu trinken.', 'Dejo de tomar café tan tarde.'),
  'verb:kennen': note('Conocer o estar familiarizado con una persona, un lugar o una cosa. Para saber un dato o una respuesta usa wissen; para saber hacer algo, können.', 'Ich kenne diese Stadt gut.', 'Conozco bien esta ciudad.'),
  'verb:wissen': note('Saber un dato, una respuesta o un hecho. Conocer a una persona o un sitio es kennen. Saber hacer algo se expresa con können + infinitivo.', 'Ich weiß, wann der Zug kommt.', 'Sé cuándo llega el tren.'),
  'verb:können': note('Poder por capacidad o posibilidad, y saber hacer algo. Para permiso se usa dürfen. El otro verbo va en infinitivo al final.', 'Ich kann gut schwimmen.', 'Sé nadar bien.'),
  'verb:dürfen': note('Poder en el sentido de tener permiso. Nicht dürfen significa tenerlo prohibido; no necesitar hacerlo es nicht müssen.', 'Du darfst hier nicht parken.', 'No puedes aparcar aquí; está prohibido.'),
  'verb:müssen': note('Tener que: obligación o necesidad. Nicht müssen significa no tener que hacerlo, no que esté prohibido. Para una prohibición usa nicht dürfen.', 'Du musst morgen nicht arbeiten.', 'Mañana no tienes que trabajar.'),
  'verb:bringen': note('Llevar o traer algo/alguien hacia un destino. La traducción española depende del punto de vista. Holen añade la idea de ir a buscarlo; nehmen es coger o tomar.', 'Ich bringe dir morgen das Buch.', 'Mañana te traigo el libro.'),
  'verb:holen': note('Ir a buscar y traer algo o a alguien. No significa simplemente coger algo que ya está a tu lado (nehmen).', 'Ich hole frisches Brot.', 'Voy a buscar pan fresco.'),
  'verb:nehmen': note('Coger o tomar: seleccionar, recoger con la mano, tomar un transporte o un medicamento. Llevar algo a alguien suele ser bringen; ir a buscarlo, holen.', 'Ich nehme heute den Bus.', 'Hoy cojo el autobús.'),
  'verb:bekommen': note('Recibir u obtener. No significa convertirse en, que es werden; es un falso amigo del inglés become.', 'Ich bekomme morgen ein Paket.', 'Mañana recibo un paquete.'),
  'verb:werden': note('Volverse, hacerse o llegar a ser. También funciona como auxiliar del futuro y de la pasiva, por lo que no siempre se traduce como una palabra independiente.', 'Es wird langsam kalt.', 'Poco a poco empieza a hacer frío.'),
  'verb:suchen': note('Buscar: describe el intento. Encontrar es finden y expresa el resultado. Suchen no garantiza que encuentres lo que buscas.', 'Ich suche meine Schlüssel.', 'Estoy buscando mis llaves.'),
  'verb:finden': note('Encontrar, o parecer/opinar cuando se combina con un adjetivo. Buscar es suchen.', 'Ich finde diese Idee gut.', 'Esta idea me parece buena.'),
  'verb:lernen': note('Aprender o estudiar una materia/habilidad. Studieren suele referirse a cursar estudios universitarios; aprender alemán normalmente es Deutsch lernen.', 'Ich lerne jeden Abend Deutsch.', 'Estudio alemán todas las noches.'),
  'verb:studieren': note('Cursar estudios universitarios o examinar algo con detenimiento. Estudiar vocabulario o para un examen normalmente es lernen.', 'Sie studiert Physik in Zürich.', 'Ella estudia Física en Zúrich.'),
  'verb:fahren': note('Desplazarse en vehículo o conducir. Ir andando suele ser gehen; volar es fliegen. El auxiliar del perfecto depende del uso: ich bin nach Hause gefahren, pero ich habe den Wagen gefahren.', 'Wir fahren mit dem Zug nach Bern.', 'Vamos a Berna en tren.'),
  'verb:gehen': note('Ir, especialmente andando; también funcionar o encontrarse en expresiones como Wie geht es dir? Para desplazarse en vehículo se suele usar fahren.', 'Ich gehe zu Fuß zur Arbeit.', 'Voy andando al trabajo.'),
  'verb:tragen': note('Llevar algo encima, en brazos o puesto. No equivale siempre a transportar hacia un destino (bringen).', 'Sie trägt heute eine blaue Jacke.', 'Hoy lleva puesta una chaqueta azul.'),
  'verb:anziehen': note('Ponerse una prenda o vestir a alguien. Es separable: zieht … an. Llevarla ya puesta puede expresarse con tragen o anhaben.', 'Ich ziehe meine Jacke an.', 'Me pongo la chaqueta.'),
  'verb:ausziehen': note('Quitarse una prenda o mudarse fuera de una vivienda. El contexto cambia el significado y el auxiliar del perfecto: hat die Jacke ausgezogen; ist aus der Wohnung ausgezogen.', 'Ich ziehe meine Schuhe aus.', 'Me quito los zapatos.'),
  'verb:umziehen': note('En su uso separable puede ser mudarse (ist umgezogen) o cambiarse de ropa, normalmente reflexivo (hat sich umgezogen).', 'Ich ziehe mich vor dem Essen um.', 'Me cambio de ropa antes de comer.'),
  'verb:vorstellen': note('Presentar a alguien o imaginarse algo. Presentarse: sich (acusativo) vorstellen. Imaginarse algo: sich (dativo) etwas vorstellen, por ejemplo ich stelle mir das vor.', 'Ich stelle dir meine Schwester vor.', 'Te presento a mi hermana.'),
  'verb:aufstehen': note('Levantarse de la cama o ponerse de pie. No es despertar (aufwachen). Es separable: steht … auf; perfecto: ist aufgestanden.', 'Ich stehe um sieben auf.', 'Me levanto a las siete.'),
  'adjective:gleich': note('Puede significar igual (comparación) o enseguida (tiempo). Das gleiche Buch puede ser otro ejemplar igual; dasselbe Buch es el mismo ejemplar.', 'Ich bin gleich zurück.', 'Vuelvo enseguida.'),
  'adjective:fertig': note('Terminado o listo tras acabar algo. Bereit significa preparado o dispuesto para empezar. Ich bin fertig también puede expresar agotamiento.', 'Ich bin mit der Aufgabe fertig.', 'He terminado la tarea.'),
  'adjective:bereit': note('Preparado o dispuesto para empezar. Fertig se usa cuando algo ya está terminado. Estoy listo puede corresponder a cualquiera de los dos según el contexto.', 'Ich bin bereit für die Prüfung.', 'Estoy preparado para el examen.'),
  'noun:Tasche': note('Bolso, bolsa o bolsillo según el contexto. Una bolsa de compra puede ser Tüte; un bolsillo del pantalón es Hosentasche.', 'Mein Handy ist in der Tasche.', 'Mi móvil está en el bolso o bolsillo; depende del contexto.'),
  'noun:Karte': note('Tarjeta, carta de restaurante, mapa o entrada según el contexto. Una carta que envías en un sobre es Brief; un billete de transporte suele ser Fahrkarte.', 'Kann ich mit Karte bezahlen?', '¿Puedo pagar con tarjeta?'),
  'noun:Brief': note('Carta escrita que se envía a alguien. No es la carta de un restaurante (Speisekarte) ni una carta de juego (Karte).', 'Ich schreibe meiner Oma einen Brief.', 'Escribo una carta a mi abuela.'),
};

// Prefix, one useful meaning, and an original example showing actual separation.
const family = (rows) => rows.map(([prefix, meaning, exampleDe, exampleEs]) => ({ prefix, meaning, exampleDe, exampleEs }));
export const VERB_FAMILIES = {
  machen: family([
    ['auf', 'abrir', 'Ich mache das Fenster auf.', 'Abro la ventana.'],
    ['zu', 'cerrar', 'Mach bitte die Tür zu.', 'Cierra la puerta, por favor.'],
    ['mit', 'participar', 'Machst du beim Spiel mit?', '¿Participas en el juego?'],
    ['an', 'encender', 'Ich mache das Licht an.', 'Enciendo la luz.'],
    ['aus', 'apagar', 'Ich mache den Fernseher aus.', 'Apago el televisor.'],
  ]),
  gehen: family([
    ['aus', 'salir de ocio', 'Wir gehen heute Abend aus.', 'Esta noche salimos.'],
    ['mit', 'ir con alguien', 'Gehst du mit uns mit?', '¿Vienes con nosotros?'],
    ['zurück', 'volver andando / regresar', 'Ich gehe zum Bahnhof zurück.', 'Vuelvo a la estación.'],
    ['weg', 'irse / alejarse', 'Sie geht früh weg.', 'Ella se va temprano.'],
  ]),
  kommen: family([
    ['an', 'llegar', 'Der Zug kommt um acht an.', 'El tren llega a las ocho.'],
    ['mit', 'venir con alguien', 'Kommst du morgen mit?', '¿Vienes mañana con nosotros?'],
    ['zurück', 'volver', 'Er kommt am Montag zurück.', 'Él vuelve el lunes.'],
    ['vor', 'ocurrir', 'So etwas kommt manchmal vor.', 'Eso ocurre a veces.'],
  ]),
  stehen: family([
    ['auf', 'levantarse', 'Ich stehe um sieben auf.', 'Me levanto a las siete.'],
    ['an', 'hacer cola', 'Wir stehen an der Kasse an.', 'Hacemos cola en la caja.'],
    ['fest', 'estar decidido / ser seguro', 'Der Termin steht schon fest.', 'La fecha ya está fijada.'],
  ]),
  stellen: family([
    ['vor', 'presentar; imaginarse (sich)', 'Ich stelle dir meinen Bruder vor.', 'Te presento a mi hermano.'],
    ['ab', 'dejar / estacionar', 'Ich stelle mein Fahrrad hier ab.', 'Dejo mi bicicleta aquí.'],
    ['auf', 'montar / colocar de pie', 'Wir stellen das Zelt auf.', 'Montamos la tienda de campaña.'],
    ['ein', 'ajustar', 'Ich stelle die Temperatur ein.', 'Ajusto la temperatura.'],
    ['fest', 'constatar / comprobar', 'Ich stelle einen Fehler fest.', 'Detecto un error.'],
  ]),
  legen: family([
    ['ab', 'dejar / depositar', 'Ich lege die Tasche hier ab.', 'Dejo la bolsa aquí.'],
    ['hin', 'tumbarse (sich) / depositar', 'Ich lege mich kurz hin.', 'Me tumbo un momento.'],
    ['zurück', 'devolver a su sitio', 'Ich lege das Buch zurück.', 'Devuelvo el libro a su sitio.'],
  ]),
  setzen: family([
    ['hin', 'sentarse (sich)', 'Ich setze mich neben dich hin.', 'Me siento a tu lado.'],
    ['fort', 'continuar', 'Wir setzen die Arbeit morgen fort.', 'Continuamos el trabajo mañana.'],
    ['ein', 'emplear / utilizar', 'Wir setzen neue Geräte ein.', 'Utilizamos aparatos nuevos.'],
  ]),
  nehmen: family([
    ['mit', 'llevarse', 'Ich nehme einen Regenschirm mit.', 'Me llevo un paraguas.'],
    ['ab', 'adelgazar / disminuir', 'Er nimmt langsam ab.', 'Él va adelgazando poco a poco.'],
    ['zu', 'engordar / aumentar', 'Der Verkehr nimmt zu.', 'El tráfico aumenta.'],
    ['an', 'aceptar', 'Ich nehme das Angebot an.', 'Acepto la oferta.'],
    ['auf', 'grabar', 'Ich nehme das Gespräch auf.', 'Grabo la conversación.'],
  ]),
  geben: family([
    ['ab', 'entregar', 'Ich gebe das Formular morgen ab.', 'Entrego el formulario mañana.'],
    ['auf', 'rendirse / abandonar', 'Wir geben nicht auf.', 'No nos rendimos.'],
    ['zurück', 'devolver', 'Ich gebe dir das Buch zurück.', 'Te devuelvo el libro.'],
    ['aus', 'gastar', 'Ich gebe wenig Geld aus.', 'Gasto poco dinero.'],
  ]),
  fahren: family([
    ['ab', 'salir un transporte', 'Der Bus fährt gleich ab.', 'El autobús sale enseguida.'],
    ['los', 'ponerse en marcha', 'Wir fahren um sechs los.', 'Salimos a las seis.'],
    ['mit', 'ir como acompañante', 'Ich fahre morgen mit euch mit.', 'Mañana voy con vosotros en el vehículo.'],
    ['zurück', 'volver en vehículo', 'Ich fahre morgen zurück.', 'Vuelvo mañana en vehículo.'],
  ]),
  ziehen: family([
    ['an', 'ponerse ropa', 'Ich ziehe meinen Mantel an.', 'Me pongo el abrigo.'],
    ['aus', 'quitarse ropa / mudarse fuera', 'Ich ziehe die Jacke aus.', 'Me quito la chaqueta.'],
    ['um', 'mudarse; cambiarse de ropa (sich)', 'Wir ziehen nach Bern um.', 'Nos mudamos a Berna.'],
    ['ein', 'mudarse a una vivienda', 'Wir ziehen am Samstag ein.', 'Nos instalamos en la vivienda el sábado.'],
  ]),
  kaufen: family([
    ['ein', 'hacer la compra', 'Ich kaufe nach der Arbeit ein.', 'Hago la compra después del trabajo.'],
    ['ab', 'comprarle algo a alguien', 'Ich kaufe dir dein altes Fahrrad ab.', 'Te compro tu bicicleta vieja.'],
  ]),
  rufen: family([
    ['an', 'llamar por teléfono', 'Ich rufe dich später an.', 'Te llamo luego.'],
    ['auf', 'llamar / convocar', 'Die Ärztin ruft den nächsten Patienten auf.', 'La médica llama al siguiente paciente.'],
    ['zurück', 'devolver una llamada', 'Ich rufe morgen zurück.', 'Devuelvo la llamada mañana.'],
  ]),
  hören: family([
    ['auf', 'dejar de / parar', 'Der Regen hört auf.', 'Deja de llover.'],
    ['zu', 'escuchar con atención', 'Ich höre dir zu.', 'Te escucho.'],
    ['an', 'escuchar algo; sonar (sich)', 'Ich höre mir das Lied an.', 'Escucho la canción.'],
  ]),
  sehen: family([
    ['an', 'mirar', 'Ich sehe mir das Foto an.', 'Miro la foto.'],
    ['aus', 'tener un aspecto', 'Du siehst müde aus.', 'Tienes aspecto cansado.'],
    ['fern', 'ver la televisión', 'Wir sehen abends fern.', 'Vemos la televisión por la noche.'],
  ]),
  bringen: family([
    ['mit', 'traer consigo', 'Ich bringe einen Kuchen mit.', 'Traigo una tarta.'],
    ['zurück', 'devolver / llevar de vuelta', 'Ich bringe das Paket zurück.', 'Devuelvo el paquete.'],
    ['bei', 'enseñar una habilidad', 'Sie bringt mir Deutsch bei.', 'Ella me enseña alemán.'],
  ]),
  holen: family([
    ['ab', 'recoger / ir a buscar', 'Ich hole dich am Bahnhof ab.', 'Te recojo en la estación.'],
    ['nach', 'recuperar algo pendiente', 'Ich hole den Unterricht nach.', 'Recupero la clase pendiente.'],
  ]),
  lassen: family([
    ['zu', 'permitir / admitir', 'Wir lassen keine Ausnahmen zu.', 'No permitimos excepciones.'],
    ['los', 'soltar', 'Lass meine Hand los.', 'Suéltame la mano.'],
    ['weg', 'omitir', 'Ich lasse den Zucker weg.', 'Omito el azúcar.'],
  ]),
  schlafen: family([
    ['ein', 'quedarse dormido', 'Das Kind schläft schnell ein.', 'El niño se duerme rápido.'],
    ['aus', 'dormir hasta descansar', 'Am Sonntag schlafe ich aus.', 'El domingo duermo hasta descansar.'],
  ]),
  schreiben: family([
    ['auf', 'anotar', 'Ich schreibe die Adresse auf.', 'Anoto la dirección.'],
    ['ab', 'copiar por escrito', 'Ich schreibe den Satz ab.', 'Copio la frase.'],
  ]),
  räumen: family([
    ['auf', 'ordenar', 'Ich räume mein Zimmer auf.', 'Ordeno mi habitación.'],
    ['ein', 'guardar / colocar dentro', 'Ich räume die Einkäufe ein.', 'Guardo la compra.'],
    ['aus', 'vaciar', 'Ich räume den Schrank aus.', 'Vacío el armario.'],
  ]),
};
