/**
 * Export pgfplots-compatible .dat files from data/sim_results.json
 * Run from project root: node scripts/export_pgfplots.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const plotDir = path.join(root, 'report', 'plot_data');
const simResultsPath = path.join(root, 'data', 'sim_results.json');

const d = JSON.parse(readFileSync(simResultsPath, 'utf8'));
mkdirSync(plotDir, { recursive: true });

/** Max points per trajectory series written for pgfplots (compile-time knob) */
const PLOT_MAX_POINTS = 320;
const UEQ_EXPORT_DR = 0.02;
const cases = [
  { key: 'cone', prefix: 'cone' },
  { key: 'paraboloid', prefix: 'paraboloid' },
  { key: 'gaussian_runA', prefix: 'gaussian' },
];

function surface(type, rad) {
  switch (type) {
    case 'cone':
      return { z: rad, zp: 1, zpp: 0 };
    case 'paraboloid':
      return { z: rad * rad, zp: 2 * rad, zpp: 2 };
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

function filterUeq(profile, type) {
  return profile.filter((p) => {
    if (!Number.isFinite(p.ueq) || Math.abs(p.ueq) > 15) return false;
    if (type === 'cone') return p.r >= 0.55 && p.r <= 2.0;
    if (type === 'paraboloid') return p.r >= 1.0 && p.r <= 3.2;
    return p.r >= 0.5 && p.r <= 3.5;
  });
}

function bounds(values, padFrac = 0.08) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.abs(max) * 0.01, 1e-8);
  return {
    min: min - span * padFrac,
    max: max + span * padFrac,
  };
}

function symmetricBounds(values, padFrac = 0.12) {
  const lim = Math.max(...values.map((v) => Math.abs(v)), 1e-6);
  const span = lim * (1 + padFrac);
  return { min: -span, max: span };
}

function decimateSeries(rows, maxPoints = PLOT_MAX_POINTS) {
  if (rows.length <= maxPoints) return rows;
  const out = [rows[0]];
  const last = rows.length - 1;
  for (let i = 1; i < maxPoints - 1; i++) {
    out.push(rows[Math.round((i * last) / (maxPoints - 1))]);
  }
  out.push(rows[last]);
  return out;
}

function buildUeqProfile(run, type, dr = UEQ_EXPORT_DR) {
  const E0 = run.E0;
  const Lz = run.IC.Lz;
  const rMax = type === 'gaussian' ? 4 : 3.5;
  const pts = [];
  for (let rr = 0.05; rr <= rMax + 1e-9; rr += dr) {
    pts.push({
      r: +rr.toFixed(4),
      ueq: +uEq(rr, E0, Lz, type).toFixed(6),
      ueff: +uEff(rr, E0, Lz, type).toFixed(6),
    });
  }
  return pts;
}

function uEq(r, E, Lz, type) {
  const { z, zp } = surface(type, r);
  return (Lz * Lz - 2 * r * r * (E - z)) / (2 * r * r * (1 + zp * zp));
}

function uEff(r, E, Lz, type) {
  const { z } = surface(type, r);
  return (Lz * Lz) / (2 * r * r) + z - E;
}

const meta = {};

for (const { key, prefix } of cases) {
  const run = d[key];
  const E0 = run.E0;
  const type = run.type;
  const Lz = run.IC.Lz;

  const ueq = filterUeq(buildUeqProfile(run, type, UEQ_EXPORT_DR), type);
  writeFileSync(
    path.join(plotDir, `${prefix}_ueq.dat`),
    'r\tueq\tueff\n' + ueq.map((p) => `${p.r}\t${p.ueq}\t${p.ueff}`).join('\n'),
  );

  const rtRows = decimateSeries(run.timeSeriesSample);
  writeFileSync(
    path.join(plotDir, `${prefix}_rt.dat`),
    't\tr\n' + rtRows.map((p) => `${p.t}\t${p.r}`).join('\n'),
  );

  const energyRows = decimateSeries(run.timeSeriesSample).map((p) => {
    const Et = energy(p.r, p.vr, Lz, type);
    const dE = Et - E0;
    const errPct = Math.abs(dE / E0) * 100;
    return `${p.t}\t${dE.toFixed(8)}\t${errPct.toFixed(6)}`;
  });
  writeFileSync(path.join(plotDir, `${prefix}_energy.dat`), 't\tdE\terrPct\n' + energyRows.join('\n'));

  const phaseRows = decimateSeries(run.phaseSpaceSample);
  writeFileSync(
    path.join(plotDir, `${prefix}_phase.dat`),
    'r\tvr\n' + phaseRows.map((p) => `${p.r}\t${p.vr}`).join('\n'),
  );

  const xyPoints = decimateSeries(run.phaseSpaceSample).map((p) => {
    const x = p.x ?? p.r * Math.cos(p.phi ?? 0);
    const y = p.y ?? p.r * Math.sin(p.phi ?? 0);
    return { x, y };
  });
  writeFileSync(
    path.join(plotDir, `${prefix}_xy.dat`),
    'x\ty\n' + xyPoints.map((p) => `${p.x}\t${p.y}`).join('\n'),
  );

  if (run.periapsisLog?.length) {
    writeFileSync(
      path.join(plotDir, `${prefix}_peri.dat`),
      'x\ty\n'
        + run.periapsisLog
          .map((p) => `${(p.r * Math.cos(p.phi)).toFixed(4)}\t${(p.r * Math.sin(p.phi)).toFixed(4)}`)
          .join('\n'),
    );
  }

  const dEValues = run.timeSeriesSample.map((p) => energy(p.r, p.vr, Lz, type) - E0);
  const rValues = run.phaseSpaceSample.map((p) => p.r);
  const vrValues = run.phaseSpaceSample.map((p) => p.vr);
  const xValues = xyPoints.map((p) => p.x);
  const yValues = xyPoints.map((p) => p.y);

  meta[prefix] = {
    E0,
    r0: run.IC.r0,
    vr0: run.IC.vr0,
    Lz,
    turningPoints: run.turningPoints_analytic,
    tMax: run.simTime,
    maxEnergyErrPct: run.maxEnergyErrPct,
    energyAxis: bounds(dEValues),
    phaseAxis: {
      r: bounds(rValues),
      vr: bounds(vrValues),
    },
    xyAxis: symmetricBounds([...xValues, ...yValues], 0.12),
  };
}

writeFileSync(path.join(plotDir, 'meta.json'), JSON.stringify(meta, null, 2));

// Log-log dt scaling
if (d.dt_scaling_study) {
  for (const [key, label] of [['cone', 'cone'], ['paraboloid', 'paraboloid']]) {
    const study = d.dt_scaling_study[key];
    if (!study?.runs) continue;
    const rows = study.runs.map(
      (r) => `${r.dt}\t${r.maxEnergyErrPct}\t${Math.log10(r.dt)}\t${Math.log10(r.maxEnergyErrPct)}`,
    );
    writeFileSync(
      path.join(plotDir, `${key}_dt_scaling.dat`),
      'dt\tmaxErrPct\tlogDt\tlogErr\n' + rows.join('\n'),
    );
  }
}

console.log(`Wrote report/plot_data/*.dat (trajectory plots decimated to <=${PLOT_MAX_POINTS} points)`);
