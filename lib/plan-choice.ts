/**
 * The plan that fits the test date picked in the planner, shared with the
 * price list further down the page so the pen can ring it there.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export const planChoice = {
  get: () => current,
  set(name: string | null) {
    if (name === current) return;
    current = name;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
