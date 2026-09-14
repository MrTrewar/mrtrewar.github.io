export const RUNWAY_LIGHTS = Object.freeze({ spacing: 2.8, phases: 4, period: 2.4, minimum: .45 });

export function runwayPulse(time, phase = 0, reducedMotion = false) {
  if (reducedMotion) return .82;
  const wave = .5 + .5 * Math.cos(Math.PI * 2 * (time / RUNWAY_LIGHTS.period - phase / RUNWAY_LIGHTS.phases));
  return RUNWAY_LIGHTS.minimum + (1 - RUNWAY_LIGHTS.minimum) * wave ** 3;
}

// Markers belong to individual surfaces, so no light row bridges a real gap.
export function runwayMarkers({ length, width, type }) {
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return [];
  const inset = Math.min(.52, length / 4), span = length - inset * 2;
  const intervals = Math.max(1, Math.ceil(span / RUNWAY_LIGHTS.spacing));
  const x = type === 'rail' ? .19 : Math.max(width * .25, width / 2 - .14);
  const markers = [];
  for (let i = 0; i <= intervals; i++) {
    const endpoint = i === 0 || i === intervals;
    for (const side of [-1, 1]) markers.push({
      x: side * x, y: .035, z: -length / 2 + inset + span * i / intervals,
      phase: (intervals - i) % RUNWAY_LIGHTS.phases, endpoint,
      size: Math.min(endpoint ? 1.35 : 1, length / 1.6),
    });
  }
  return markers;
}
