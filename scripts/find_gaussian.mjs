import { getDerivatives, uEq, initialEnergy, simulate, findTurningPoints } from './simulate_lib.mjs';

// quick search - inline since we need bound gaussian
function getDerivativesLocal(rad, type, a = 1) {
  if (type !== 'gaussian') return null;
  const z = Math.exp(-rad * rad);
  const zp = -2 * rad * z;
  const zpp = z * (4 * rad * rad - 2);
  return { z, zp, zpp };
}

function findBoundGaussian() {
  const candidates = [];
  for (const r0 of [0.8, 1.0, 1.2, 1.5, 2.0, 2.5]) {
    for (const Lz of [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0]) {
      for (const vr0 of [0, 0.05, 0.1, -0.1, 0.15]) {
        const E0 = (() => {
          const z = Math.exp(-r0*r0);
          const zp = -2*r0*z;
          return 0.5*(1+zp*zp)*vr0*vr0 + (Lz*Lz)/(2*r0*r0) + z;
        })();
        const tps = findTurningPoints(0.05, 6, E0, Lz, 'gaussian', 1, 0.0005);
        if (tps.length >= 2) {
          const res = simulate({ type: 'gaussian', r0, vr0, Lz, tMax: 60 });
          if (!res.escaped && res.periapsis.length >= 2) {
            candidates.push({ r0, vr0, Lz, E0, tps, res });
          }
        }
      }
    }
  }
  return candidates;
}

// Export functions from simulate.mjs inline
function getDerivatives(rad, type, a = 1) {
  let z, zp, zpp;
  if (type === 'gaussian') {
    z = Math.exp(-rad * rad);
    zp = -2 * rad * z;
    zpp = z * (4 * rad * rad - 2);
  }
  return { z, zp, zpp };
}

function findTurningPoints(rMin, rMax, E, Lz, type, alpha, step = 0.001) {
  const pts = [];
  let prev = uEqLocal(rMin, E, Lz);
  for (let r = rMin + step; r <= rMax; r += step) {
    const cur = uEqLocal(r, E, Lz);
    if ((prev <= 0 && cur >= 0) || (prev >= 0 && cur <= 0)) {
      const rt = r - step + (step * Math.abs(prev)) / (Math.abs(prev) + Math.abs(cur));
      pts.push(rt);
    }
    prev = cur;
  }
  return pts;
}

function uEqLocal(r, E, Lz) {
  const { z, zp } = getDerivatives(r, 'gaussian');
  return (Lz * Lz - 2 * r * r * (E - z)) / (2 * r * r * (1 + zp * zp));
}

function simulateLocal({ r0, vr0, Lz, tMax = 60, dt = 0.005 }) {
  let r = r0, vr = vr0, phi = 0, simTime = 0;
  const z0 = Math.exp(-r0*r0), zp0 = -2*r0*z0;
  const E0 = 0.5*(1+zp0*zp0)*vr0*vr0 + (Lz*Lz)/(2*r0*r0) + z0;
  let lastVr = vr, lastPeriTime = -1, lastPeriPhi = 0;
  let Tr=null, Ta=null, ratio=null;
  const periapsis = [];
  let escaped = false;
  let maxErr = 0;
  const rVals = [r];

  while (simTime < tMax && !escaped) {
    if (r > 10 || r < 0.01) { escaped = true; break; }
    const z = Math.exp(-r*r);
    const zp = -2*r*z;
    const zpp = z*(4*r*r-2);
    const denom = r*r*r*(1+zp*zp);
    if (Math.abs(denom) < 1e-8) { escaped = true; break; }
    const numer = Lz*Lz - r*r*r*zp*(1+zpp*vr*vr);
    vr += (numer/denom)*dt;
    r += vr*dt;
    phi += (Lz/(r*r))*dt;
    simTime += dt;
    rVals.push(r);
    if (lastVr <= 0 && vr > 0) {
      if (lastPeriTime >= 0) {
        const dTr = simTime - lastPeriTime;
        const dPhi = phi - lastPeriPhi;
        Tr = dTr; Ta = 2*Math.PI*dTr/dPhi; ratio = Ta/dTr;
      }
      periapsis.push({ t: simTime, r });
      lastPeriTime = simTime; lastPeriPhi = phi;
    }
    lastVr = vr;
    const Et = 0.5*(1+zp*zp)*vr*vr + (Lz*Lz)/(2*r*r) + z;
    maxErr = Math.max(maxErr, Math.abs((Et-E0)/E0)*100);
  }
  return { r0, vr0, Lz, E0, escaped, Tr, Ta, ratio, periapsis, maxErr,
    rMin: Math.min(...rVals), rMax: Math.max(...rVals) };
}

const found = [];
for (const r0 of [0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0]) {
  for (const Lz of [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2]) {
    for (const vr0 of [0, 0.02, 0.05, 0.08, 0.1, -0.05, 0.12]) {
      const z0 = Math.exp(-r0*r0), zp0 = -2*r0*z0;
      const E0 = 0.5*(1+zp0*zp0)*vr0*vr0 + (Lz*Lz)/(2*r0*r0) + z0;
      const tps = findTurningPoints(0.05, 8, E0, Lz, 'gaussian', 1, 0.0005);
      if (tps.length >= 2) {
        const res = simulateLocal({ r0, vr0, Lz, tMax: 80 });
        if (!res.escaped && res.periapsis.length >= 2) {
          found.push({ r0, vr0, Lz, E0, tps, ...res });
        }
      }
    }
  }
}
found.sort((a,b) => a.maxErr - b.maxErr);
console.log('Found', found.length, 'bound gaussian orbits');
console.log(JSON.stringify(found.slice(0, 5), null, 2));
