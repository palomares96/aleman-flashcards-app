// Sistema global para notificaciones de trofeos
// Permite que cualquier componente escuche cuando se desbloquea un trofeo

const trophyEventEmitter = {
  listeners: [],
  
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },
  
  emit(trophy) {
    this.listeners.forEach(callback => callback(trophy));
  }
};

const api = {
  emitTrophy: trophy => trophyEventEmitter.emit(trophy),
  subscribe: callback => trophyEventEmitter.subscribe(callback),
};
export function useTrophyNotification() { return api; }
export default trophyEventEmitter;
