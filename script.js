/* ============================================================
   RELATIVIDAD ESPACIAL — SIMULADOR
   Physics Engine + UI Controller
   ============================================================ */

const C = 1; // velocidad de la luz = 1 (normalizada)

// ---------- DOM REFERENCES ----------
const select     = document.getElementById('phenomenon-select');
const dynInputs  = document.getElementById('dynamic-inputs');
const slider     = document.getElementById('velocity-slider');
const sliderFill = document.getElementById('slider-fill');
const velDisplay = document.getElementById('velocity-display');
const lorentz    = document.getElementById('lorentz-value');
const btnCalc    = document.getElementById('btn-calculate');
const simBadge   = document.getElementById('sim-badge');
const simInfo    = document.getElementById('sim-info-text');

// Procedure
const procEmpty  = document.getElementById('procedure-empty');
const procResult = document.getElementById('procedure-result');
const bodyDatos  = document.getElementById('body-datos');
const bodyForm   = document.getElementById('body-formulas');
const bodySust   = document.getElementById('body-sust');
const bodyRes    = document.getElementById('body-result');

// Scenes
const scenes = {
  contraction: document.getElementById('scene-contraction'),
  dilation:    document.getElementById('scene-dilation'),
  mass:        document.getElementById('scene-mass'),
  velocity:    document.getElementById('scene-velocity'),
};

// ---------- STATE ----------
let currentVelocity = 0;
let clockAnimFrame = null;
let clockPhase = 0;
let clockLastTime = null;
let dilatedFactor = 1;

// ---------- INPUT DEFINITIONS ----------
const INPUTS = {
  contraction: [
  { id: 'L2', label: 'Longitud en reposo (L₂)', unit: 'm', default: 5 },
  { id: 'L1', label: 'Longitud en movimiento (L₁)', unit: 'm', default: '' },
],
  dilation: [
  { id: 'T2', label: 'Tiempo propio (T₂)', unit: 's', default: 5e-8 },
  { id: 'T1', label: 'Tiempo dilatado (T₁)', unit: 's', default: '' },
],
  mass: [
  { id: 'M2', label: 'Masa en reposo (m₂)', unit: 'kg', default: 30 },
  { id: 'M1', label: 'Masa relativista (m₁)', unit: 'kg', default: '' },
],
  velocity: [
    { id: 'V1', label: 'Velocidad rápida (v₁)', unit: 'c', default: 0.90, hint: 'Velocidad del más rápido (ej: 0.90)' },
    { id: 'V2inp', label: 'Velocidad lenta (v₂)', unit: 'c', default: 0.65, hint: 'Velocidad del más lento (ej: 0.65)' },
  ],
};

// ---------- PHYSICS FUNCTIONS ----------
function gamma(v) {
  const beta = Math.min(Math.abs(v), 0.9999);
  return 1 / Math.sqrt(1 - beta * beta);
}

function contraction(L0, v) {
  return L0 * Math.sqrt(1 - v * v);
}

function dilation(T0, v) {
  return T0 * gamma(v);
}

function relMass(m0, v) {
  return m0 * gamma(v);
}

function velAddition(v1, v2) {
  // Fórmula de clase: V = (v1 - v2) / (1 - v1*v2/C²)
  return (v1 - v2) / (1 - v1 * v2);
}

// ---------- INITIALIZE INPUTS ----------
function renderInputs(phenomenon) {
  dynInputs.innerHTML = '';
  (INPUTS[phenomenon] || []).forEach(inp => {
    const row = document.createElement('div');
    row.className = 'input-row';
    row.innerHTML = `
      <label class="input-label" for="inp-${inp.id}">${inp.label}</label>
      <input type="number" id="inp-${inp.id}" step="any" value="${inp.default}" />
      <span class="input-hint">${inp.hint} [${inp.unit}]</span>
    `;
    dynInputs.appendChild(row);
  });
}

function getInputVal(id) {
  const el = document.getElementById(`inp-${id}`);
  return el ? parseFloat(el.value) : NaN;
}

// ---------- SLIDER LOGIC ----------
function updateSlider() {
  const raw = parseInt(slider.value); // 0–99
  currentVelocity = raw / 100;
  const pct = raw / 99 * 100;
  sliderFill.style.width = `${pct}%`;
  velDisplay.textContent = `${currentVelocity.toFixed(2)} c`;
  const g = gamma(currentVelocity);
  lorentz.textContent = g.toFixed(4);
  updateSimulationLive();
}

slider.addEventListener('input', updateSlider);

// ---------- SCENE SWITCHER ----------
function showScene(key) {
  Object.keys(scenes).forEach(k => {
    scenes[k].classList.toggle('hidden', k !== key);
  });
}

select.addEventListener('change', () => {
  const ph = select.value;
  renderInputs(ph);
  showScene(ph);
  hideProcedure();

  // Hide velocity slider for velocity-addition (uses its own inputs)
  const sliderSection = document.querySelector('.slider-group');
  const lorentzBox    = document.getElementById('lorentz-display');
  const isVel = ph === 'velocity';
  sliderSection.style.display = isVel ? 'none' : '';
  lorentzBox.style.display    = isVel ? 'none' : '';

  updateSimulationLive();
  updateTargetOptions();
});

// ---------- LIVE SIMULATION UPDATE ----------
function updateSimulationLive() {
  const v = currentVelocity;
  const ph = select.value;
  const g = gamma(v);
  const speedLabel = v === 0 ? 'En reposo' : `v = ${v.toFixed(2)}c`;

  simBadge.textContent = speedLabel;
  simBadge.classList.toggle('active', v > 0);

  if (ph === 'contraction') {
    const target = document.getElementById("target-select").value;
    const L2_inp = getInputVal('L2');
    const L1_inp = getInputVal('L1');
    const sqrtVal = Math.sqrt(1 - v * v);

    if (target === 'L0') { // Calcular Longitud en Reposo (L2)
      if (isNaN(L1_inp) || L1_inp <= 0) { alert('Ingresa L₁ válido'); return; }
      const L2_res = L1_inp / sqrtVal;

      renderProcedure(
        dataLine('L₁', `${L1_inp} m`) + dataLine('V', `${v}c`),
        mathFormula(`L_2 = L_1 / \\sqrt{1 - V^2/C^2}`),
        substStep(`L_2 = ${L1_inp} / \\sqrt{1 - (${v})^2}`) +
        substStep(`L_2 = ${L1_inp} / ${sqrtVal.toFixed(4)}`),
        resultHighlight('L₂ (reposo)', `${fmt(L2_res)} m`)
      );
    } else if (target === 'v') {
      // ... (Lógica de velocidad explicada anteriormente)
    } else { // Calcular L1 (Original)
      const L1_res = L2_inp * sqrtVal;
      renderProcedure(
        dataLine('L₂', `${L2_inp} m`) + dataLine('V', `${v}c`),
        mathFormula(`L_1 = L_2 \\sqrt{1 - V^2/C^2}`),
        substStep(`L_1 = ${L2_inp} (${sqrtVal.toFixed(4)})`),
        resultHighlight('L₁', `${fmt(L1_res)} m`)
      );
    }
  }

  if (ph === 'dilation') {
    dilatedFactor = g;
    simInfo.textContent = v === 0
      ? 'Sin movimiento — ambos relojes sincrónicos'
      : `Reloj en movimiento va ${g.toFixed(4)}× más lento (γ)`;
  }

  if (ph === 'mass') {
    const maxFactor = gamma(0.99);
    const normalizedFill = Math.min((g - 1) / (maxFactor - 1) * 80 + 20, 100);
    document.getElementById('mass-bar-fill').style.width = `${normalizedFill}%`;

    const relCircle = document.getElementById('mass-rel-circle');
    const baseSize = 60;
    const newSize = Math.min(baseSize * Math.sqrt(g), 96);
    relCircle.style.width = `${newSize}px`;
    relCircle.style.height = `${newSize}px`;
    document.getElementById('mass-multiplier').textContent = `× ${g.toFixed(4)}`;
    simInfo.textContent = v === 0
      ? 'Sin movimiento — masa igual a reposo'
      : `Masa relativista = m₀ × ${g.toFixed(4)}`;
  }

  if (ph === 'velocity') {
    const v1Raw = getInputVal('V1') || 0.90;
    const v2Raw = getInputVal('V2inp') || 0.65;
    const v1 = Math.min(Math.abs(v1Raw), 0.99);
    const v2c = Math.min(Math.abs(v2Raw), 0.99);
    const Vrel = Math.min(Math.abs(velAddition(v1, v2c)), 0.99);
    const toPos = val => 5 + val * 85;
    document.getElementById('obj1-dot').style.left   = `${toPos(v1)}%`;
    document.getElementById('result-dot').style.left = `${toPos(Vrel)}%`;
    simInfo.textContent = v1 === 0 && v2c === 0 ? 'Ingresa velocidades' : `V relativa ≈ ${Vrel.toFixed(4)}c`;
  }
}

// ---------- CLOCK ANIMATION ----------
function startClocks() {
  stopClocks();
  clockLastTime = null;
  clockPhase = 0;

  function frame(ts) {
    if (!clockLastTime) clockLastTime = ts;
    const dt = (ts - clockLastTime) / 1000;
    clockLastTime = ts;

    const speed = 0.5; // rev/s for rest clock
    clockPhase += dt * speed * 360;
    if (clockPhase > 360) clockPhase -= 360;

    const restHand   = document.getElementById('hand-rest');
    const movingHand = document.getElementById('hand-moving');
    const dilatedPhase = clockPhase / dilatedFactor;

    if (restHand)   restHand.style.transform   = `translateX(-50%) rotate(${clockPhase}deg)`;
    if (movingHand) movingHand.style.transform = `translateX(-50%) rotate(${dilatedPhase % 360}deg)`;

    clockAnimFrame = requestAnimationFrame(frame);
  }

  clockAnimFrame = requestAnimationFrame(frame);
}

function stopClocks() {
  if (clockAnimFrame) {
    cancelAnimationFrame(clockAnimFrame);
    clockAnimFrame = null;
  }
}

// ---------- PROCEDURE RENDERING ----------
function hideProcedure() {
  procEmpty.classList.remove('hidden');
  procResult.classList.add('hidden');
}

// Renders a clean "key = value" data line
function dataLine(key, val) {
  return `<div class="proc-line"><span class="proc-key">${key} =</span><span class="proc-val">${val}</span></div>`;
}

// Renders a math-style formula block (centered, prominent)
function mathFormula(latex) {
  return `<div class="proc-math">${latex}</div>`;
}

// Renders a substitution step line
function substStep(expr) {
  return `<div class="proc-step">${expr}</div>`;
}

// Final result highlight
function resultHighlight(key, val) {
  return `<div class="proc-final"><span class="proc-final-key">${key} =</span><span class="proc-final-val">${val}</span></div>`;
}

function renderProcedure(datos, formulas, sust, results) {
  bodyDatos.innerHTML = datos;
  bodyForm.innerHTML  = formulas;
  bodySust.innerHTML  = sust;
  bodyRes.innerHTML   = results;
  procEmpty.classList.add('hidden');
  procResult.classList.remove('hidden');
}

// Format number: use scientific notation only if needed, 4 sig figs
function fmt(n, digits = 4) {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 0.001 || abs >= 1e6) {
    // scientific
    const exp = Math.floor(Math.log10(abs));
    const coeff = (n / Math.pow(10, exp)).toFixed(2);
    return `${coeff} × 10<sup>${exp}</sup>`;
  }
  // round to digits sig figs
  const factor = Math.pow(10, digits - Math.floor(Math.log10(abs)) - 1);
  return (Math.round(n * factor) / factor).toString();
}

// ---------- CALCULATE ----------
function calculate() {
  const ph = select.value;
  const v  = currentVelocity;

  if (ph === 'contraction') {
    const target = document.getElementById("target-select").value;
    const L2_inp = getInputVal('L2');
    const L1_inp = getInputVal('L1');
    const sqrtVal = Math.sqrt(1 - v * v);

    if (target === 'L0') { // Calcular Longitud en Reposo (L2)
      if (isNaN(L1_inp) || L1_inp <= 0) { alert('Ingresa L₁ válido'); return; }
      const L2_res = L1_inp / sqrtVal;

      renderProcedure(
        dataLine('L₁', `${L1_inp} m`) + dataLine('V', `${v}c`),
        mathFormula(`L_2 = L_1 / \\sqrt{1 - V^2/C^2}`),
        substStep(`L_2 = ${L1_inp} / \\sqrt{1 - (${v})^2}`) +
        substStep(`L_2 = ${L1_inp} / ${sqrtVal.toFixed(4)}`),
        resultHighlight('L₂ (reposo)', `${fmt(L2_res)} m`)
      );
    } else if (target === 'v') {
      // ... (Lógica de velocidad explicada anteriormente)
    } else { // Calcular L1 (Original)
      const L1_res = L2_inp * sqrtVal;
      renderProcedure(
        dataLine('L₂', `${L2_inp} m`) + dataLine('V', `${v}c`),
        mathFormula(`L_1 = L_2 \\sqrt{1 - V^2/C^2}`),
        substStep(`L_1 = ${L2_inp} (${sqrtVal.toFixed(4)})`),
        resultHighlight('L₁', `${fmt(L1_res)} m`)
      );
    }
  }

  else if (ph === 'dilation') {
    const target = document.getElementById("target-select").value;
    const T2_inp = getInputVal('T2');
    const T1_inp = getInputVal('T1');
    const sqrtVal = Math.sqrt(1 - v * v);

    if (target === 'T0') { // Calcular Tiempo Propio (T2)
      if (isNaN(T1_inp) || T1_inp <= 0) { alert('Ingresa T₁ válido'); return; }
      const T2_res = T1_inp * sqrtVal;

      renderProcedure(
        dataLine('T₁', `${fmt(T1_inp)} s`) + dataLine('V', `${v}c`),
        mathFormula(`T_2 = T_1 \\sqrt{1 - V^2/C^2}`),
        substStep(`T_2 = ${fmt(T1_inp)} \\cdot ${sqrtVal.toFixed(4)}`),
        resultHighlight('T₂ (propio)', `${fmt(T2_res)} s`)
      );
    } else if (target === 'v') {
      // ... (Lógica de velocidad)
    } else { // Calcular T1
      const T1_res = T2_inp / sqrtVal;
      renderProcedure(
        dataLine('T₂', `${fmt(T2_inp)} s`) + dataLine('V', `${v}c`),
        mathFormula(`T_1 = T_2 / \\sqrt{1 - V^2/C^2}`),
        substStep(`T_1 = ${fmt(T2_inp)} / ${sqrtVal.toFixed(4)}`),
        resultHighlight('T₁', `${fmt(T1_res)} s`)
      );
    }
  }

  else if (ph === 'mass') {
    const target = document.getElementById("target-select").value;
    const m2_inp = getInputVal('M2');
    const m1_inp = getInputVal('M1');
    const sqrtVal = Math.sqrt(1 - v * v);

    if (target === 'm0') { // Calcular Masa en Reposo (m2)
      if (isNaN(m1_inp) || m1_inp <= 0) { alert('Ingresa m₁ válido'); return; }
      const m2_res = m1_inp * sqrtVal;

      renderProcedure(
        dataLine('m₁', `${m1_inp} kg`) + dataLine('V', `${v}c`),
        mathFormula(`m_2 = m_1 \\sqrt{1 - V^2/C^2}`),
        substStep(`m_2 = ${m1_inp} (${sqrtVal.toFixed(4)})`),
        resultHighlight('m₂ (reposo)', `${fmt(m2_res)} kg`)
      );
    } else { // Calcular m1
      const m1_res = m2_inp / sqrtVal;
      renderProcedure(
        dataLine('m₂', `${m2_inp} kg`) + dataLine('V', `${v}c`),
        mathFormula(`m_1 = m_2 / \\sqrt{1 - V^2/C^2}`),
        substStep(`m_1 = ${m2_inp} / ${sqrtVal.toFixed(4)}`),
        resultHighlight('m₁', `${fmt(m1_res)} kg`)
      );
    }
  }

  else if (ph === 'velocity') {
    const v1 = getInputVal('V1');
    const v2inp = getInputVal('V2inp');
    if (isNaN(v1) || isNaN(v2inp)) { alert('Ingresa valores válidos para v₁ y v₂'); return; }

    const v1c = Math.min(Math.abs(v1), 0.9999);
    const v2c = Math.min(Math.abs(v2inp), 0.9999);
    const num  = v1c - v2c;
    const prod = v1c * v2c;
    const den  = 1 - prod;
    const Vrel = num / den;

    renderProcedure(
      dataLine('v₁', `${v1c}c`) +
      dataLine('v₂', `${v2c}c`),

      mathFormula(`V = (v<sub>1</sub> − v<sub>2</sub>) / (1 − v<sub>1</sub>v<sub>2</sub>/C²)`),

      substStep(`V = (${v1c}c − ${v2c}c) / (1 − (${v1c}c)(${v2c}c)/c²)`) +
      substStep(`V = ${num.toFixed(4)}c / (1 − ${prod.toFixed(4)})`) +
      substStep(`V = ${num.toFixed(4)}c / ${den.toFixed(4)}`),

      resultHighlight('V', `${fmt(Vrel)}c`)
    );

    // Update sim with these two velocities
    const toPos = val => 5 + (Math.min(val, 0.99) / 1) * 85;
    document.getElementById('obj1-dot').style.left   = `${toPos(v1c)}%`;
    document.getElementById('result-dot').style.left = `${toPos(Vrel)}%`;
    simInfo.textContent = `Velocidad relativa V = ${fmt(Vrel)}c`;
  }
}

btnCalc.addEventListener('click', calculate);

document.getElementById("target-select")
  .addEventListener("change", updateInputs);

// ---------- INITIAL SETUP ----------
renderInputs('contraction');
updateTargetOptions();
showScene('contraction');
updateSlider();
startClocks();

// Dynamic input changes update simulation live
dynInputs.addEventListener('input', () => {
  updateSimulationLive();
});

function getInput(name) {
  const el = document.querySelector(`[name="${name}"]`);
  return el ? el.value : null;
}

function getVelocity() {
  const slider = document.getElementById("velocity-slider");
  return slider.value / 100;
}

function setVelocity(v) {
  const slider = document.getElementById("velocity-slider");
  slider.value = v * 100;
  slider.dispatchEvent(new Event("input"));
}

function updateTargetOptions() {

  const ph = select.value;
  const target = document.getElementById("target-select");

  let options = "";

  if (ph === "contraction") {
    options = `
      <option value="L">L₁ (movimiento)</option>
      <option value="L0">L₂ (reposo)</option>
      <option value="v">v (velocidad)</option>
    `;
  }

  if (ph === "dilation") {
    options = `
      <option value="T">T₁ (dilatado)</option>
      <option value="T0">T₂ (propio)</option>
      <option value="v">v (velocidad)</option>
    `;
  }

  if (ph === "mass") {
    options = `
      <option value="m">m₁ (relativista)</option>
      <option value="m0">m₂ (reposo)</option>
      <option value="v">v (velocidad)</option>
    `;
  }

  if (ph === "velocity") {
    options = `
      <option value="V">V (resultado)</option>
    `;
  }

  target.innerHTML = options;

  updateInputs(); // ← importante
}
function updateInputs() {

  const target = document.getElementById("target-select").value;

  document.querySelectorAll(".input-row input").forEach(input => {
    input.disabled = false;
    input.parentElement.style.opacity = "1";
  });

  // Mapear nombres reales
  const map = {
    L: "L1",
    L0: "L2",
    T: "T1",
    T0: "T2",
    m: "M1",
    m0: "M2"
  };

  const id = map[target];

  const input = document.getElementById(`inp-${id}`);

  if (input) {
    input.disabled = true;
    input.parentElement.style.opacity = "0.5";
  }
}
