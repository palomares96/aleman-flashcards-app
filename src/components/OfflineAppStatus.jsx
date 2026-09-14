import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
export default function OfflineAppStatus() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();
  if (needRefresh)
    return (
      <div role="status" className="mb-4 p-3 bg-blue-950 rounded-xl text-sm">
        Nueva versión disponible.{" "}
        <button className="underline" onClick={() => updateServiceWorker(true)}>
          Actualizar ahora
        </button>
        <p className="text-xs text-gray-400">
          Actualiza cuando termines de editar; se recargará la app.
        </p>
      </div>
    );
  if (offlineReady)
    return (
      <div role="status" className="mb-4 p-3 bg-teal-950 rounded-xl text-sm">
        App disponible sin conexión. Guarda tu vocabulario en Perfil → Datos
        para practicar sin internet.{" "}
        <button className="underline" onClick={() => setOfflineReady(false)}>
          Entendido
        </button>
      </div>
    );
  return null;
}
