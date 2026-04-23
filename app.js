'use strict';

const STAGES = ['lint', 'build', 'test', 'security', 'deploy'];

// ── State ────────────────────────────────────────────────────────────────────

const state = {
  running: false,
  results: {},   // { [testKey]: 'pass' | 'fail' }
  durations: {}, // { [stage]: ms }
};

// ── DOM helpers ──────────────────────────────────────────────────────────────

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function setBadge(stage, status) {
  const el = document.getElementById(`badge-${stage}`);
  if (!el) return;
  el.className = `card-badge ${status}`;
  el.textContent = { idle: 'En attente', running: 'En cours…', pass: '✓ Réussi', fail: '✗ Échec' }[status] ?? status;
}

function setCardState(stage, status) {
  const card = $(`.stage-card[data-stage="${stage}"]`);
  if (!card) return;
  card.classList.remove('running', 'pass', 'fail');
  if (status !== 'idle') card.classList.add(status);
}

function setPipelineStep(stage, status) {
  const step = $(`.pipeline-step[data-stage="${stage}"] .step-status`);
  if (!step) return;
  step.className = `step-status ${status}`;
  step.textContent = { idle: '—', running: '…', pass: '✓', fail: '✗' }[status] ?? '—';
}

function setTestResult(testEl, status) {
  const res = testEl.querySelector('.test-result');
  if (!res) return;
  res.className = `test-result ${status}`;
  res.textContent = { pending: '·', running: '◌', pass: '✓', fail: '✗' }[status] ?? '·';
}

function setDuration(stage, ms) {
  const el = document.getElementById(`dur-${stage}`);
  if (!el) return;
  el.textContent = ms ? `${(ms / 1000).toFixed(1)}s` : '';
}

function resetStage(stage) {
  setBadge(stage, 'idle');
  setCardState(stage, 'idle');
  setPipelineStep(stage, 'idle');
  setDuration(stage, 0);
  $$(`.test-item[data-stage="${stage}"]`).forEach(t => setTestResult(t, 'pending'));
  delete state.durations[stage];
}

function resetAll() {
  state.running = false;
  state.results = {};
  state.durations = {};
  STAGES.forEach(resetStage);
  const bar = document.getElementById('summaryBar');
  bar.style.display = 'none';
  bar.className = 'summary-bar';
  document.getElementById('runAll').disabled = false;
  $$('.btn-stage').forEach(b => (b.disabled = false));
}

// ── Simulation engine ────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulates a single test step — 90% pass rate
async function runTest(testEl) {
  setTestResult(testEl, 'running');
  const ms = parseInt(testEl.dataset.duration, 10) || 1000;
  // Speed factor: 4× faster than declared duration for demo
  await delay(Math.round(ms / 4));
  const pass = Math.random() > 0.1; // 90% pass
  const key = `${testEl.dataset.stage}:${testEl.dataset.test}`;
  state.results[key] = pass ? 'pass' : 'fail';
  setTestResult(testEl, pass ? 'pass' : 'fail');
  return pass;
}

async function runStage(stage) {
  const tests = $$(`.test-item[data-stage="${stage}"]`);
  if (!tests.length) return true;

  setBadge(stage, 'running');
  setCardState(stage, 'running');
  setPipelineStep(stage, 'running');

  const start = Date.now();
  const results = [];

  // Run tests sequentially within a stage
  for (const testEl of tests) {
    const ok = await runTest(testEl);
    results.push(ok);
  }

  const ms = Date.now() - start;
  state.durations[stage] = ms;
  setDuration(stage, ms);

  const allPass = results.every(Boolean);
  setBadge(stage, allPass ? 'pass' : 'fail');
  setCardState(stage, allPass ? 'pass' : 'fail');
  setPipelineStep(stage, allPass ? 'pass' : 'fail');
  return allPass;
}

// ── Summary ──────────────────────────────────────────────────────────────────

function showSummary() {
  const total = Object.keys(state.results).length;
  const passed = Object.values(state.results).filter(v => v === 'pass').length;
  const failed = total - passed;
  const totalDuration = Object.values(state.durations).reduce((a, b) => a + b, 0);

  const bar = document.getElementById('summaryBar');
  bar.style.display = 'block';
  bar.className = `summary-bar ${failed === 0 ? 'all-pass' : 'has-fail'}`;

  document.getElementById('summaryIcon').textContent = failed === 0 ? '🎉' : '❌';
  document.getElementById('summaryText').textContent =
    failed === 0
      ? 'Pipeline complet — tous les tests sont passés !'
      : `Pipeline échoué — ${failed} test${failed > 1 ? 's' : ''} en erreur`;
  document.getElementById('summaryStats').textContent =
    `${passed}/${total} tests • durée totale : ${(totalDuration / 1000).toFixed(1)}s`;

  document.getElementById('lastRun').textContent =
    `Dernier run : ${new Date().toLocaleTimeString('fr-FR')}`;
}

// ── Run pipeline ─────────────────────────────────────────────────────────────

async function runPipeline(stagesToRun) {
  if (state.running) return;
  state.running = true;

  document.getElementById('runAll').disabled = true;
  $$('.btn-stage').forEach(b => (b.disabled = true));

  const bar = document.getElementById('summaryBar');
  bar.style.display = 'none';

  for (const stage of stagesToRun) {
    resetStage(stage);
  }

  for (const stage of stagesToRun) {
    const ok = await runStage(stage);
    if (!ok && stagesToRun.length > 1) {
      // Mark remaining stages as idle (pipeline stops on failure)
      const idx = stagesToRun.indexOf(stage);
      stagesToRun.slice(idx + 1).forEach(s => {
        resetStage(s);
        setPipelineStep(s, 'idle');
      });
      break;
    }
  }

  showSummary();
  state.running = false;
  document.getElementById('runAll').disabled = false;
  $$('.btn-stage').forEach(b => (b.disabled = false));
}

// ── Event listeners ──────────────────────────────────────────────────────────

document.getElementById('runAll').addEventListener('click', () => {
  runPipeline([...STAGES]);
});

$$('.btn-stage').forEach(btn => {
  btn.addEventListener('click', () => {
    const stage = btn.dataset.stage;
    if (stage) runPipeline([stage]);
  });
});

document.getElementById('resetAll').addEventListener('click', resetAll);
