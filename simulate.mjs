/**
 * Batch simulation matching index.html physics (m=g=1, Euler dt=0.005).
 * Surfaces: cone (z=αr), paraboloid (z=αr²), gaussian (z=e^{-r²}).
 */

function getDerivatives(rad, type, a = 1) {
  let z, zp, zpp;
  switch (type) {
    case 'cone':
      z = a * rad; zp = a; zpp = 0;
      break;
    case 'paraboloid':
      z = a * rad * rad; zp = 2 * a * rad; zpp = 2 * a;
      break;
    case 'gaussian':
      z = Math.exp(-rad * rad);
      zp = -2 * rad * z;
      zpp = z * (4 * rad * rad - 2);
      break;
    default:
      throw new Error(`Unknown type: ${type}`);
  }
  return { z, zp, zpp };
}

function uEq(r, E, Lz, type, alpha = 1) {
  const { z, zp } = getDerivatives(r, type, alpha);
  return (Lz * Lz - 2 * r * r * (E - z)) / (2 * r * r * (1 + zp * zp));
}

function uEff(r, E, Lz, type, alpha = 1) {
  const { z } = getDerivatives(r, type, alpha);
  return (Lz * Lz) / (2 * r * r) + z - E;
}

function stabilityS(r, type, alpha = 1) {
  const { zp, zpp } = getDerivatives(r, type, alpha);
  return 3 * zp + r * zpp;
}

function initialEnergy(r, vr, Lz, type, alpha = 1) {
  const { z, zp } = getDerivatives(r, type, alpha);
  return 0.5 * (1 + zp * zp) * vr * vr + (Lz * Lz) / (2 * r * r) + z;
}

function circularLz(r, type, alpha = 1) {
  const { zp } = getDerivatives(r, type, alpha);
  const lzSq = r * r * r * zp;
  if (lzSq <= 0) return null;
  return Math.sqrt(lzSq);
}

function findTurningPoints(rMin, rMax, E, Lz, type, alpha, step = 0.001) {
  const pts = [];
  let prev = uEq(rMin, E, Lz, type, alpha);
  for (let r = rMin + step; r <= rMax; r += step) {
    const cur = uEq(r, E, Lz, type, alpha);
    if ((prev <= 0 && cur >= 0) || (prev >= 0 && cur <= 0)) {
      // linear interpolate zero crossing
      const rt = r - step + (step * Math.abs(prev)) / (Math.abs(prev) + Math.abs(cur));
      pts.push(rt);
    }
    prev = cur;
  }
  return pts;
}

function simulate({ type, alpha = 1, r0, vr0, Lz, tMax = 100, dt = 0.005 }) {
  let r = r0, vr = vr0, phi = 0, simTime = 0;
  const E0 = initialEnergy(r, vr, Lz, type, alpha);
  const MAX_R = 10;
  const rHist = [{ t: 0, r, vr, phi }];
  let lastVr = vr;
  let lastPeriTime = -1;
  let lastPeriPhi = 0;
  const periapsis = [];
  const energySamples = [{ t: 0, E: E0, err: 0 }];
  let escaped = false;
  let escapeReason = null;
  let maxEnergyErr = 0;
  let sumEnergyErr = 0;
  let nEnergy = 0;
  let Tr = null, Ta = null, ratio = null;

  while (simTime < tMax && !escaped) {
    if (r > MAX_R) { escaped = true; escapeReason = 'r>10'; break; }
    if (r < 0.01) { escaped = true; escapeReason = 'r<0.01'; break; }

    const { zp, zpp } = getDerivatives(r, type, alpha);
    const denom = r * r * r * (1 + zp * zp);
    if (Math.abs(denom) < 1e-8) { escaped = true; escapeReason = 'singular'; break; }

    const numer = Lz * Lz - r * r * r * zp * (1 + zpp * vr * vr);
    vr += (numer / denom) * dt;
    r += vr * dt;
    phi += (Lz / (r * r)) * dt;
    simTime += dt;

    if (lastVr <= 0 && vr > 0 && r < MAX_R) {
      if (lastPeriTime >= 0) {
        const dTr = simTime - lastPeriTime;
        const dPhi = phi - lastPeriPhi;
        if (Math.abs(dPhi) > 1e-6) {
          Tr = dTr;
          Ta = (2 * Math.PI * dTr) / dPhi;
          ratio = Ta / dTr;
        }
      }
      periapsis.push({ t: simTime, r, phi });
      lastPeriTime = simTime;
      lastPeriPhi = phi;
    }
    lastVr = vr;

    if (Number.isNaN(r) || Number.isNaN(vr)) {
      escaped = true; escapeReason = 'nan'; break;
    }

    if (Math.abs(simTime - Math.round(simTime / 5) * 5) < dt / 2 || simTime >= tMax - dt) {
      const { z, zp: zp2 } = getDerivatives(r, type, alpha);
      const Et = 0.5 * (1 + zp2 * zp2) * vr * vr + (Lz * Lz) / (2 * r * r) + z;
      const err = Math.abs(E0) > 1e-6 ? Math.abs((Et - E0) / E0) * 100 : Math.abs(Et - E0) * 100;
      maxEnergyErr = Math.max(maxEnergyErr, err);
      sumEnergyErr += err;
      nEnergy++;
      energySamples.push({ t: simTime, E: Et, err });
    }

    if (rHist.length < 50000) rHist.push({ t: simTime, r, vr, phi });
  }

  const { z, zp } = getDerivatives(r0, type, alpha);
  const rMin = rHist.reduce((a, p) => Math.min(a, p.r), Infinity);
  const rMaxObs = rHist.reduce((a, p) => Math.max(a, p.r), -Infinity);

  return {
    type, alpha, r0, vr0, Lz, E0, dt, tMax, escaped, escapeReason,
    S_at_r0: stabilityS(r0, type, alpha),
    Ueq_at_r0: uEq(r0, E0, Lz, type, alpha),
    Ueff_at_r0: uEff(r0, E0, Lz, type, alpha),
    Lz_circular: circularLz(r0, type, alpha),
    turningPoints_analytic: findTurningPoints(0.05, 5, E0, Lz, type, alpha),
    rMin_observed: rMin,
    rMax_observed: rMaxObs,
    periapsis,
    Tr, Ta, ratio,
    maxEnergyErrPct: maxEnergyErr,
    meanEnergyErrPct: sumEnergyErr / Math.max(nEnergy, 1),
    energyAt100: energySamples.filter(s => s.t >= 99.9)[0] || energySamples[energySamples.length - 1],
    final: { t: simTime, r, vr, phi },
    nSteps: Math.round(simTime / dt),
  };
}

const cases = [
  { name: 'cone_z=r', type: 'cone', alpha: 1, r0: 1.2, vr0: 0.5, Lz: 1.0 },
  { name: 'paraboloid_z=r2', type: 'paraboloid', alpha: 1, r0: 1.2, vr0: 0, Lz: 5.0 },
  { name: 'paraboloid_z=r2_perturbed', type: 'paraboloid', alpha: 1, r0: 1.2, vr0: 0.3, Lz: 5.0 },
  { name: 'gaussian', type: 'gaussian', alpha: 1, r0: 1.5, vr0: 0.2, Lz: 1.2 },
  { name: 'gaussian_r2', type: 'gaussian', alpha: 1, r0: 2.0, vr0: 0.15, Lz: 0.85 },
];

const results = {};
for (const c of cases) {
  results[c.name] = simulate(c);
}

console.log(JSON.stringify(results, null, 2));
