const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * Esta función se ejecuta automáticamente todos los días a las 5:00 AM.
 * Su trabajo es calcular y guardar una "foto" (snapshot) del progreso
 * de cada usuario para poder mostrar gráficos de evolución.
 */
exports.calculateDailyMasteryStats = functions.pubsub
  .schedule("every day 05:00")
  .timeZone("Europe/Madrid") // Puedes ajustar tu zona horaria
  .onRun(async (context) => {
    console.log("Iniciando cálculo de estadísticas diarias de dominio.");

    // Nuevos criterios de dominio
    const MASTERY_CRITERIA = {
      MIN_PLAYS: 5,
      MAX_ERROR_RATE: 0.2,
      STREAK_NEEDED: 4,
    };

    try {
      // 1. Obtener la lista de todos los usuarios que tienen progreso guardado.
      const usersSnapshot = await db.collection("users").get();
      if (usersSnapshot.empty) {
        console.log("No hay usuarios con progreso. Saliendo.");
        return null;
      }
      const userIds = usersSnapshot.docs.map((doc) => doc.id);

      // 2. Procesar cada usuario uno por uno.
      for (const userId of userIds) {
        console.log(`Procesando usuario: ${userId}`);

        const progressCollectionRef = db.collection(`users/${userId}/progress`);
        const progressSnapshot = await progressCollectionRef.get();

        if (progressSnapshot.empty) {
          console.log(`Usuario ${userId} no tiene progreso. Saltando.`);
          continue; // Pasa al siguiente usuario
        }

        let masteredWordsCount = 0;

        // 3. Revisar cada palabra en el progreso del usuario.
        progressSnapshot.forEach((doc) => {
          const progress = doc.data();
          const totalPlays = (progress.correct || 0) + (progress.incorrect || 0);
          const errorRate = totalPlays > 0 ? (progress.incorrect || 0) / totalPlays : 0;
          const streak = progress.correctStreak || 0;

          // 4. Aplicar las nuevas reglas de "palabra dominada".
          const isMasteredByPlays = totalPlays >= MASTERY_CRITERIA.MIN_PLAYS && errorRate < MASTERY_CRITERIA.MAX_ERROR_RATE;
          const isMasteredByStreak = streak >= MASTERY_CRITERIA.STREAK_NEEDED;

          if (isMasteredByPlays || isMasteredByStreak) {
            masteredWordsCount++;
          }
        });

        // 5. Guardar el resultado en la nueva colección `dailyStats`.
        const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
        const statDocRef = db.collection("dailyStats").doc(`${userId}_${today}`);

        await statDocRef.set({
          userId: userId,
          date: admin.firestore.Timestamp.now(),
          masteredCount: masteredWordsCount,
        });

        console.log(`Estadísticas guardadas para ${userId}: ${masteredWordsCount} palabras dominadas.`);
      }

      console.log("Cálculo de estadísticas diarias completado exitosamente.");
      return null;
    } catch (error) {
      console.error("Error al calcular las estadísticas diarias:", error);
      return null;
    }
  });
