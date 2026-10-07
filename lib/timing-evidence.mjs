import { includedHumanEvents } from "./human-timing.mjs";

export function hasMeasuredHumanTime(events) {
  return Array.isArray(events) && includedHumanEvents(events).length > 0;
}
