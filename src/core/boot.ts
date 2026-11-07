/** Shared, tiny setup for every page. Kept small: it counts against first load. */
import { initModality } from './modality';
import { initPress } from './press';
import { initViewTransitions } from './view-transitions';

export function boot() {
  initModality();
  initPress();
  initViewTransitions();
}
