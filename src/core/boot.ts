/** Shared, tiny setup for every page. Kept small: it counts against first load. */
import { initPress } from './press';

export function boot() {
  initPress();
}
