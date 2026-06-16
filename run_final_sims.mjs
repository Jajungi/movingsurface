/**
 * Reproducible verification export for main.tex
 * Physics engine: explicit Euler, dt=0.005, m=g=1 (matches index.html)
 */
import { writeFileSync } from 'fs';

function surface(type, rad, alpha = 1) {
  switch (type) {
    case 'cone':
      return { z: alpha * rad, zp: alpha, zpp: 0 };
    case 'paraboloid':
      return { z: alpha * rad * rad, zp: 2 * alpha * rad, zpp: 2 * alpha };
    case 'gaussian': {
      const z = Math.exp(-rad * rad);
      return { z, zp: -2 * rad * z, zpp: z * (4 * rad * rad - 2) };
    }
    default:
      throw new Error(type);
  }
}

function energy(r, vr, Lz, type) {
  const { z, zp } = surface(type, r);
  return 0.5 * (1 + zp * zp) * vr * vr + (Lz * Lz) / (2 * r * r) + z;
}

function uEq(r, E, Lz, type) {
  const { z, zp } = surface(type, r);
  return (Lz * Lz - 2 * r * r * (E - z)) / (2 * r * r * (1 + zp * zp));
}

function uEff(r, E, Lz, type) {
  const { z } = surface(type, r);
  return (Lz * Lz) / (2 * r * r) + z - E;
}

function stabilityS(r, type) {
  const { zp, zpp } = surface(type, r);
  return 3 * zp + r * zpp;
}

function turningPoints(E, Lz, type, rMax = 10, step = 0.0005) {
  const pts = [];
  let prev = uEq(0.05, E, Lz, type);
  for (let r = 0.05 + step; r <= rMax; r += step) {
    const cur = uEq(r, E, Lz, type);
    if ((prev <= 0 && cur >= 0) || (prev >= 0 && cur <= 0)) {
      const rt = r - step + (step * Math.abs(prev)) / (Math.abs(prev) + Math.abs(cur));
      pts.push(rt);
    }
    prev = cur;
  }
  return pts;
}

/** Plot export: balance smooth curves vs. LaTeX compile time */
const PLOT_SAMPLE_DT = 0.25;
const PLOT_SAMPLE_MAX = 800;
const UEQ_PROFILE_DR = 0.02;

function integrate(type, r0, vr0, Lz, tMax = 100, dt = 0.005) {
  let r = r0, vr = vr0, phi = 0, t = 0;
  const E0 = energy(r0, vr0, Lz, type);
  let lastVr = vr, lastPeriT = -1, lastPeriPhi = 0;
  let Tr = null, Ta = null, ratio = null;
  let periCount = 0;
  let maxErr = 0;
  let maxLzRelErrPct = 0;
  const errLog = [];
  const periapsisLog = [];
  const radialPeriodLog = [];
  let stop = null;
  const rSeries = [{ t: 0, r, vr, phi }];

  while (t < tMax) {
    if (r > 10) { stop = 'escaped outward (r>10)'; break; }
    if (r < 0.01) { stop = 'collapsed (r<0.01)'; break; }

    const { zp, zpp } = surface(type, r);
    const denom = r ** 3 * (1 + zp * zp);
    if (Math.abs(denom) < 1e-8) { stop = 'singular denominator'; break; }

    const acc = (Lz * Lz - r ** 3 * zp * (1 + zpp * vr * vr)) / denom;
    const prevPhi = phi;
    vr += acc * dt;
    r += vr * dt;
    phi += (Lz / (r * r)) * dt;
    t += dt;

    const LzFromPhi = (r * r * (phi - prevPhi)) / dt;
    maxLzRelErrPct = Math.max(maxLzRelErrPct, Math.abs((LzFromPhi - Lz) / Lz) * 100);

    rSeries.push({ t: +t.toFixed(4), r, vr, phi });

    if (lastVr <= 0 && vr > 0) {
      periCount++;
      if (lastPeriT >= 0) {
        Tr = t - lastPeriT;
        const dPhi = phi - lastPeriPhi;
        Ta = (2 * Math.PI * Tr) / dPhi;
        ratio = Ta / Tr;
        const dPhiOver2Pi = dPhi / (2 * Math.PI);
        const nearestInt = Math.round(dPhiOver2Pi);
        radialPeriodLog.push({
          Tr: +Tr.toFixed(4),
          dPhi: +dPhi.toFixed(6),
          dPhi_over_2pi: +dPhiOver2Pi.toFixed(6),
          closureResidual: +(dPhiOver2Pi - nearestInt).toFixed(6),
          apsidalAdvance_rad: +(dPhi - nearestInt * 2 * Math.PI).toFixed(6),
        });
      }
      periapsisLog.push({ t: +t.toFixed(4), r: +r.toFixed(6), phi: +phi.toFixed(6) });
      lastPeriT = t;
      lastPeriPhi = phi;
    }
    lastVr = vr;

    const Et = energy(r, vr, Lz, type);
    const err = Math.abs((Et - E0) / E0) * 100;
    maxErr = Math.max(maxErr, err);
    if (Math.abs(t - Math.round(t / 5) * 5) < dt / 2 || Math.abs(t - tMax) < dt) {
      errLog.push({ t: +t.toFixed(3), E: +Et.toFixed(6), errPct: +err.toFixed(6) });
    }
  }

  const EtFinal = energy(r, vr, Lz, type);
  const tpAnalytic = turningPoints(E0, Lz, type);
  const rMin = Math.min(...rSeries.map((p) => p.r));
  const rMaxObs = Math.max(...rSeries.map((p) => p.r));

  const meanDPhi = radialPeriodLog.length
    ? radialPeriodLog.reduce((s, p) => s + p.dPhi, 0) / radialPeriodLog.length
    : null;
  const meanClosureResidual = radialPeriodLog.length
    ? radialPeriodLog.reduce((s, p) => s + Math.abs(p.closureResidual), 0) / radialPeriodLog.length
    : null;

  // Dense subsample for smooth plot curves (~0.05 s spacing)
  const plotEveryN = Math.max(1, Math.round(PLOT_SAMPLE_DT / dt));
  const timeSeriesSample = [];
  const phaseSpaceSample = [];
  for (let i = 0; i < rSeries.length; i++) {
    const p = rSeries[i];
    const Et = energy(p.r, p.vr, Lz, type);
    const errPct = Math.abs((Et - E0) / E0) * 100;
    if (i % plotEveryN === 0) {
      timeSeriesSample.push({
        t: +p.t.toFixed(3),
        r: +p.r.toFixed(4),
        vr: +p.vr.toFixed(4),
        errPct: +errPct.toFixed(6),
      });
      phaseSpaceSample.push({
        r: +p.r.toFixed(4),
        vr: +p.vr.toFixed(4),
        phi: +p.phi.toFixed(4),
        x: +(p.r * Math.cos(p.phi)).toFixed(4),
        y: +(p.r * Math.sin(p.phi)).toFixed(4),
      });
    }
  }

  // Ueq profile for fixed E0, Lz (fine radial grid for smooth potential plots)
  const ueqProfile = [];
  const rPlotMax = type === 'gaussian' ? 4 : 3.5;
  for (let rr = 0.05; rr <= rPlotMax + 1e-9; rr += UEQ_PROFILE_DR) {
    ueqProfile.push({
      r: +rr.toFixed(4),
      ueq: +uEq(rr, E0, Lz, type).toFixed(6),
      ueff: +uEff(rr, E0, Lz, type).toFixed(6),
    });
  }

  const compareTurning = tpAnalytic.map((rt, i) => {
    const observed = i === 0 ? rMin : (tpAnalytic.length >= 2 && i === 1 ? rMaxObs : null);
    const relErr = observed ? Math.abs(observed - rt) / rt * 100 : null;
    return { predicted: +rt.toFixed(4), observed: observed ? +observed.toFixed(4) : null, relErrPct: relErr ? +relErr.toFixed(4) : null };
  });

  return {
    type,
    IC: { r0, vr0, Lz, dt, tMax },
    E0: +E0.toFixed(6),
    Ueq_r0: +uEq(r0, E0, Lz, type).toFixed(6),
    Ueff_r0: +uEff(r0, E0, Lz, type).toFixed(6),
    S_r0: +stabilityS(r0, type).toFixed(6),
    Lz_circular: (() => {
      const zp = surface(type, r0).zp;
      return zp > 0 ? +Math.sqrt(r0 ** 3 * zp).toFixed(6) : null;
    })(),
    turningPoints_analytic: tpAnalytic.map((x) => +x.toFixed(4)),
    turningPointComparison: compareTurning,
    rMin_observed: +rMin.toFixed(4),
    rMax_observed: +rMaxObs.toFixed(4),
    bounded_prediction: tpAnalytic.length >= 2 ? 'two turning points (bounded radial band)' : 'fewer than two turning points (not doubly bounded)',
    Tr: Tr ? +Tr.toFixed(4) : null,
    Ta: Ta ? +Ta.toFixed(4) : null,
    Ta_over_Tr: ratio ? +ratio.toFixed(4) : null,
    periapsisCount: periCount,
    periapsisLog: periapsisLog.slice(0, 5),
    radialPeriodLog: radialPeriodLog.slice(0, 10),
    mean_dPhi_per_Tr: meanDPhi ? +meanDPhi.toFixed(6) : null,
    mean_dPhi_over_2pi: meanDPhi ? +(meanDPhi / (2 * Math.PI)).toFixed(6) : null,
    mean_closureResidual: meanClosureResidual ? +meanClosureResidual.toFixed(6) : null,
    maxLzRelErrPct: +maxLzRelErrPct.toFixed(12),
    maxEnergyErrPct: +maxErr.toFixed(6),
    finalEnergyErrPct: +((Math.abs(EtFinal - E0) / E0) * 100).toFixed(6),
    errLog,
    timeSeriesSample: timeSeriesSample.slice(0, PLOT_SAMPLE_MAX),
    phaseSpaceSample: phaseSpaceSample.slice(0, PLOT_SAMPLE_MAX),
    ueqProfile,
    stopReason: stop,
    simTime: +t.toFixed(3),
    final: { r: +r.toFixed(4), vr: +vr.toFixed(4), phi: +phi.toFixed(4), E: +EtFinal.toFixed(6) },
  };
}

/** Parameter scan for Gaussian Ueq root count — logged range documented in report */
function gaussianRootScan() {
  let totalTrials = 0;
  let twoRootCount = 0;
  let oneRootCount = 0;
  let zeroRootCount = 0;
  const r0List = [];
  for (let r = 0.5; r <= 4.0; r += 0.1) r0List.push(+r.toFixed(1));
  const LzList = [];
  for (let L = 0.05; L <= 2.0; L += 0.05) LzList.push(+L.toFixed(2));
  const vrList = [];
  for (let v = -0.2; v <= 0.2; v += 0.02) vrList.push(+v.toFixed(2));

  for (const r0 of r0List) {
    for (const Lz of LzList) {
      for (const vr0 of vrList) {
        totalTrials++;
        const E0 = energy(r0, vr0, Lz, 'gaussian');
        const roots = turningPoints(E0, Lz, 'gaussian', 10, 0.001);
        if (roots.length >= 2) twoRootCount++;
        else if (roots.length === 1) oneRootCount++;
        else zeroRootCount++;
      }
    }
  }
  return { r0Range: [0.5, 4.0], r0Step: 0.1, LzRange: [0.05, 2.0], LzStep: 0.05, vrRange: [-0.2, 0.2], vrStep: 0.02, totalTrials, twoRootCount, oneRootCount, zeroRootCount };
}

const gaussianScan = gaussianRootScan();

const coneMain = integrate('cone', 1.2, 0.5, 1.0);
const paraMain = integrate('paraboloid', 1.2, 0, 5.0);
const coneHalf = integrate('cone', 1.2, 0.5, 1.0, 100, 0.0025);
const paraHalf = integrate('paraboloid', 1.2, 0, 5.0, 100, 0.0025);

const dtValues = [0.01, 0.005, 0.0025, 0.001];
function dtScalingStudy(type, r0, vr0, Lz) {
  const runs = dtValues.map((dt) => {
    const run = integrate(type, r0, vr0, Lz, 100, dt);
    return { dt, maxEnergyErrPct: run.maxEnergyErrPct, finalEnergyErrPct: run.finalEnergyErrPct };
  });
  const logPts = runs.map((r) => ({
    logDt: Math.log10(r.dt),
    logErr: Math.log10(r.maxEnergyErrPct),
  }));
  const n = logPts.length;
  const meanX = logPts.reduce((s, p) => s + p.logDt, 0) / n;
  const meanY = logPts.reduce((s, p) => s + p.logErr, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of logPts) {
    num += (p.logDt - meanX) * (p.logErr - meanY);
    den += (p.logDt - meanX) ** 2;
  }
  const slope = den > 0 ? num / den : null;
  return { runs, fittedSlope: slope ? +slope.toFixed(4) : null };
}

const dtScalingCone = dtScalingStudy('cone', 1.2, 0.5, 1.0);
const dtScalingPara = dtScalingStudy('paraboloid', 1.2, 0, 5.0);

const results = {
  metadata: {
    generatedAt: new Date().toISOString(),
    integrator: 'explicit Euler',
    dt: 0.005,
    units: 'm=g=1',
    source: 'run_final_sims.mjs (matches index.html updatePhysics)',
  },
  cone: coneMain,
  paraboloid: paraMain,
  gaussian_runA: integrate('gaussian', 1.5, 0.08, 0.45, 20),
  gaussian_runB: integrate('gaussian', 1.0, 0, 0.25, 15),
  gaussian_stability_scan: {
    r_0_5: +stabilityS(0.5, 'gaussian').toFixed(6),
    r_1_0: +stabilityS(1.0, 'gaussian').toFixed(6),
    r_sqrt2: +stabilityS(Math.sqrt(2), 'gaussian').toFixed(6),
    r_2_0: +stabilityS(2.0, 'gaussian').toFixed(6),
    r_3_0: +stabilityS(3.0, 'gaussian').toFixed(6),
  },
  gaussian_root_scan: gaussianScan,
  dt_halving_study: {
    description: 'Same ICs as cone/paraboloid main runs; explicit Euler',
    cone_dt0_005: { dt: 0.005, maxEnergyErrPct: coneMain.maxEnergyErrPct, finalEnergyErrPct: coneMain.finalEnergyErrPct },
    cone_dt0_0025: { dt: 0.0025, maxEnergyErrPct: coneHalf.maxEnergyErrPct, finalEnergyErrPct: coneHalf.finalEnergyErrPct },
    paraboloid_dt0_005: { dt: 0.005, maxEnergyErrPct: paraMain.maxEnergyErrPct, finalEnergyErrPct: paraMain.finalEnergyErrPct },
    paraboloid_dt0_0025: { dt: 0.0025, maxEnergyErrPct: paraHalf.maxEnergyErrPct, finalEnergyErrPct: paraHalf.finalEnergyErrPct },
  },
  dt_scaling_study: {
    description: 'Log-log error scaling; dt in {0.01, 0.005, 0.0025, 0.001} s; same ICs as main bounded runs',
    cone: dtScalingCone,
    paraboloid: dtScalingPara,
  },
};

writeFileSync('sim_results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
