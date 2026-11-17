type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionExpired() {
  listeners.forEach((listener) => listener());
}
