// functions/index.js

// Importaciones para la versión 2 de Cloud Functions
const { onCall } = require("firebase-functions/v2/https");
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
const { CloudBillingClient } = require("@google-cloud/billing");

admin.initializeApp();
const db = admin.firestore();
const billing = new CloudBillingClient();

// Establecemos la región para todas las funciones en este archivo
setGlobalOptions({ region: "europe-west1" });

// --- Función para gestionar solicitudes de amistad ---
exports.handleFriendRequest = onCall(async (request) => {
  // 1. Verificamos que el usuario esté autenticado
  if (!request.auth) {
    throw new onCall.HttpsError(
      "unauthenticated",
      "Debes estar autenticado.",
    );
  }

  const { requestId, action } = request.data;
  const myUid = request.auth.uid;

  // ... (el resto de la lógica es la misma)
  const requestRef = db.collection("friendRequests").doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new onCall.HttpsError("not-found", "La solicitud no existe.");
  }
  const requestData = requestDoc.data();
  if (requestData.to_uid !== myUid) {
    throw new onCall.HttpsError(
      "permission-denied",
      "No puedes gestionar esta solicitud.",
    );
  }

  const theirUid = requestData.from_uid;
  
  try {
    if (action === "accept") {
      const batch = db.batch();
      const myFriendRef = db.doc(`users/${myUid}/friends/${theirUid}`);
      const theirFriendRef = db.doc(`users/${theirUid}/friends/${myUid}`);
      batch.update(requestRef, { status: "accepted" });
      batch.set(myFriendRef, {
        displayName: requestData.from_displayName,
        since: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(theirFriendRef, {
        displayName: requestData.to_displayName,
        since: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return { success: true, message: "Amigo añadido." };
    } else if (action === "decline") {
      await requestRef.delete();
      return { success: true, message: "Solicitud rechazada." };
    } else {
      throw new onCall.HttpsError("invalid-argument", "Acción no válida.");
    }
  } catch (error) {
    throw new onCall.HttpsError("internal", "Error al procesar la solicitud.");
  }
});


// --- Función para desactivar la facturación ---
exports.stopBilling = onMessagePublished("budget-killswitch-topic", async (event) => {
    const pubsubMessage = event.data.message;
    const budgetData = pubsubMessage.json;

    if (budgetData.costAmount <= budgetData.budgetAmount) {
        console.log("El coste no ha superado el presupuesto. No se hace nada.");
        return;
    }

    console.log("¡Presupuesto superado! Desactivando la facturación...");
    const project = await billing.getProjectBillingInfo({
        name: process.env.GCLOUD_PROJECT,
    });
    const projectName = project[0].name;

    if (!projectName || !project[0].billingEnabled) {
        console.log("La facturación ya está desactivada.");
        return;
    }
    
    await billing.updateProjectBillingInfo({
        name: projectName,
        projectBillingInfo: { billingAccountName: "" },
    });

    console.log("¡FACTURACIÓN DESACTIVADA!");
});