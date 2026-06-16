function getDerivatives(rad) {
  const z = Math.exp(-rad * rad);
  const zp = -2 * rad * z;
  const zpp = z * (4 * rad * rad - 2);
  return { z, zp, zpp };
}

function uEq(r, E, Lz) {
  const { z, zp } = getDerivatives(r);
  return (Lz * Lz - 2 * r * r * (E - z)) / (2 * r * r * (1 + zp * zp));
}

function stabilityS(r) {
  const { zp, zpp } = getDerivatives(r);
  return 3 * zp + r * zpp;
}

function findTurningPoints(rMin, rMax, E, Lz, step = 0.0005) {
  const pts = [];
  let prev = uEq(rMin, E, Lz);
  for (let r = rMin + step; r <= rMax; r += step) {
    const cur = uEq(r, E, Lz);
    if ((prev <= 0 && cur >= 0) || (prev >= 0 && cur <= 0)) {
      const rt = r - step + (step * Math.abs(prev)) / (Math.abs(prev) + Math.abs(cur));
      pts.push(rt);
    }
    prev = cur;
  }
  return pts;
}

function simulate({ r0, vr0, Lz, tMax = 100, dt = 0.005 }) {
  let r = r0, vr = vr0, phi = 0, simTime = 0;
  const { z: z0, zp: zp0 } = getDerivatives(r0);
  const E0 = 0.5 * (1 + zp0 * zp0) * vr0 * vr0 + (Lz * Lz) / (2 * r0 * r0) + z0;
  let lastVr = vr, lastPeriTime = -1, lastPeriPhi = 0;
  let Tr = null, Ta = null, ratio = null;
  const periapsis = [];
  let escaped = false;
  let maxErr = 0, errAt100 = null;
  const rHist = [r];

  while (simTime < tMax && !escaped) {
    if (r > 10 || r < 0.01) { escaped = true; break; }
    const { z, zp, zpp } = getDerivatives(r);
    const denom = r * r * r * (1 + zp * zp);
    if (Math.abs(denom) < 1e-8) { escaped = true; break; }
    const numer = Lz * Lz - r * r * r * zp * (1 + zpp * vr * vr);
    vr += (numer / denom) * dt;
    r += vr * dt;
    phi += (Lz / (r * r)) * dt;
    simTime += dt;
    rHist.push(r);

    if (lastVr <= 0 && vr > 0) {
      if (lastPeriTime >= 0) {
        const dTr = simTime - lastPeriTime;
        const dPhi = phi - lastPeriPhi;
        Tr = dTr; Ta = (2 * Math.PI * dTr) / dPhi; ratio = Ta / dTr;
      }
      periapsis.push({ t: simTime, r, phi });
      lastPeriTime = simTime; lastPeriPhi = phi;
    }
    lastVr = vr;

    const Et = 0.5 * (1 + zp * zp) * vr * vr + (Lz * Lz) / (2 * r * r) + z;
    const err = Math.abs((Et - E0) / E0) * 100;
    maxErr = Math.max(maxErr, err);
    if (simTime >= 99.9) errAt100 = { E: Et, err };
  }

  return {
    r0, vr0, Lz, E0, escaped, Tr, Ta, ratio, periapsis, maxErr, errAt100,
    S_at_r0: stabilityS(r0),
    Ueq_at_r0: uEq(r0, E0, Lz),
    rMin: Math.min(...rHist), rMax: Math.max(...rHist),
    final: { t: simTime, r, vr, phi },
  };
}

// --- Main cases for report ---
const reportCases = {
  cone: { type: 'cone', r0: 1.2, vr0: 0.5, Lz: 1.0 },
  paraboloid: { type: 'paraboloid', r0: 1.2, vr0: 0, Lz: 5.0 },
};

function runConeParaboloid(type, r0, vr0, Lz) {
  let r = r0, vr = vr0, phi = 0, simTime = 0;
  const dt = 0.005, tMax = 100;
  let z, zp, zpp;
  if (type === 'cone') { z = r0; zp = 1; zpp = 0; }
  else { z = r0*r0; zp = 2*r0; zpp = 2; }
  const E0 = 0.5*(1+zp*zp)*vr0*vr0 + (Lz*Lz)/(2*r0*r0) + z;
  const getD = (rad) => type==='cone'
    ? { z: rad, zp: 1, zpp: 0 }
    : { z: rad*rad, zp: 2*rad, zpp: 2 };
  const uEqT = (rr, E, L) => {
    const { z: zz, zp: zzp } = getD(rr);
    return (L*L - 2*rr*rr*(E-zz)) / (2*rr*rr*(1+zzp*zzp));
  };
  const tps = findTurningPoints(0.05, 5, E0, Lz);
  // recompute with correct surface for cone/parabola
  const tpsFixed = (() => {
    const pts = []; let prev = uEqT(0.05, E0, Lz);
    for (let rr = 0.0505; rr <= 5; rr += 0.0005) {
      const cur = uEqT(rr, E0, Lz);
      if ((prev<=0&&cur>=0)||(prev>=0&&cur<=0)) pts.push(rr);
      prev = cur;
    }
    return pts;
  })();

  let lastVr=vr, lastPeriTime=-1, lastPeriPhi=0;
  let Tr=null, Ta=null, ratio=null;
  const periapsis = [];
  let maxErr=0; let err100=null;
  const rHist=[r];
  let escaped=false;

  while (simTime < tMax && !escaped) {
    if (r>10||r<0.01){escaped=true;break;}
    ({ z, zp, zpp } = getD(r));
    const denom = r*r*r*(1+zp*zp);
    const numer = Lz*Lz - r*r*r*zp*(1+zpp*vr*vr);
    vr += (numer/denom)*dt;
    r += vr*dt;
    phi += (Lz/(r*r))*dt;
    simTime += dt;
    rHist.push(r);
    if (lastVr<=0 && vr>0) {
      if (lastPeriTime>=0) {
        Tr = simTime-lastPeriTime;
        Ta = 2*Math.PI*Tr/(phi-lastPeriPhi);
        ratio = Ta/Tr;
      }
      periapsis.push({t:simTime,r,phi});
      lastPeriTime=simTime; lastPeriPhi=phi;
    }
    lastVr=vr;
    const Et = 0.5*(1+zp*zp)*vr*vr + (Lz*Lz)/(2*r*r)+z;
    maxErr = Math.max(maxErr, Math.abs((Et-E0)/E0)*100);
    if (simTime>=99.9) err100={E:Et, err:Math.abs((Et-E0)/E0)*100};
  }
  const S = 3*getD(r0).zp + r0*getD(r0).zpp;
  return { r0, vr0, Lz, E0, S_at_r0:S, Ueq_at_r0:uEqT(r0,E0,Lz),
    turningPoints: tpsFixed, rMin:Math.min(...rHist), rMax:Math.max(...rHist),
    Tr, Ta, ratio, periapsis: periapsis.slice(0,3), nPeri: periapsis.length,
    maxEnergyErrPct: maxErr, energyAt100: err100, escaped, final:{t:simTime,r,vr,phi} };
}

// Find bound gaussian
let bestGaussian = null;
for (const r0 of [1.0, 1.2, 1.5, 2.0, 2.2, 2.5, 2.8, 3.0]) {
  for (const Lz of [0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25, 0.3, 0.35, 0.4]) {
    for (const vr0 of [0, 0.01, 0.02, 0.03, 0.05, 0.08, -0.02, -0.05]) {
      const { z: z0, zp: zp0 } = getDerivatives(r0);
      const E0 = 0.5*(1+zp0*zp0)*vr0*vr0 + (Lz*Lz)/(2*r0*r0)+z0;
      const tps = findTurningPoints(0.05, 8, E0, Lz);
      if (tps.length >= 2) {
        const res = simulate({ r0, vr0, Lz, tMax: 100 });
        if (!res.escaped && res.periapsis.length >= 3) {
          if (!bestGaussian || res.maxErr < bestGaussian.maxErr)
            bestGaussian = { ...res, turningPoints: tps };
        }
      }
    }
  }
}

const output = {
  cone_z_eq_r: runConeParaboloid('cone', 1.2, 0.5, 1.0),
  paraboloid_z_eq_r2: runConeParaboloid('paraboloid', 1.2, 0, 5.0),
  gaussian_z_eq_exp_neg_r2: bestGaussian,
};

console.log(JSON.stringify(output, null, 2));
