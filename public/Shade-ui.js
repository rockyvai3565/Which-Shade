export function bootShadeUI({ root, onReadyText }) {
  const KEY = "shade_best_v1";

  const state = {
    level: 2,            // grid size
    streak: 0,
    best: loadBest(),
    oddIndex: 0,
    base: { r: 120, g: 120, b: 120 },
    delta: 18,
    isMini: false
  };

  root.innerHTML = `
    <div class="wrap">
      <div class="top">
        <div class="brand">
          <div class="name">Which Shade?</div>
          <div class="sub">tap the square that feels “off”</div>
        </div>
        <div class="pill" id="envPill">WEB</div>
      </div>

      <div class="hud">
        <div class="stat"><div class="k">GRID</div><div class="v" id="gridV">2×2</div></div>
        <div class="stat"><div class="k">STREAK</div><div class="v" id="streakV">0</div></div>
        <div class="stat"><div class="k">BEST</div><div class="v" id="bestV">0</div></div>
      </div>

      <div class="boardWrap">
        <div class="board" id="board" aria-label="Color grid"></div>
      </div>

      <div class="footer">
        <button class="ghost" id="resetBtn" type="button">reset</button>
        <div class="toast" id="toast">${onReadyText || "ready ✓"}</div>
        <button class="ghost" id="hintBtn" type="button">hint</button>
      </div>
    </div>
  `;

  const el = {
    env: root.querySelector("#envPill"),
    board: root.querySelector("#board"),
    gridV: root.querySelector("#gridV"),
    streakV: root.querySelector("#streakV"),
    bestV: root.querySelector("#bestV"),
    toast: root.querySelector("#toast"),
    reset: root.querySelector("#resetBtn"),
    hint: root.querySelector("#hintBtn"),
  };

  function setEnv(isMini) {
    state.isMini = !!isMini;
    el.env.textContent = state.isMini ? "MINI" : "WEB";
    el.env.classList.toggle("mini", state.isMini);
  }

  function loadBest(){
    try { return Number(localStorage.getItem(KEY) || 0) || 0; } catch { return 0; }
  }
  function saveBest(){
    try { localStorage.setItem(KEY, String(state.best)); } catch {}
  }

  function clamp(v){ return Math.max(0, Math.min(255, v)); }
  function rgb(o){ return `rgb(${o.r}, ${o.g}, ${o.b})`; }

  function pickPalette() {
    // Make interesting palettes: avoid gray-ish + avoid near-white/near-black
    const r = 40 + Math.floor(Math.random()*180);
    const g = 40 + Math.floor(Math.random()*180);
    const b = 40 + Math.floor(Math.random()*180);
    state.base = { r, g, b };

    // As level increases, delta shrinks (harder)
    const maxL = 9;
    const t = Math.min(1, (state.level-2) / (maxL-2));
    state.delta = Math.round(22 - t*14); // 22 -> 8
  }

  function makeOddColor() {
    // Shift all channels by a small delta in random direction
    const dir = Math.random() < 0.5 ? -1 : 1;
    const d = state.delta * dir;
    return {
      r: clamp(state.base.r + d),
      g: clamp(state.base.g + Math.round(d*0.8)),
      b: clamp(state.base.b + Math.round(d*0.6))
    };
  }

  function toast(msg){
    el.toast.textContent = msg;
    el.toast.classList.remove("pop");
    void el.toast.offsetWidth;
    el.toast.classList.add("pop");
  }

  function shake(){
    el.board.classList.remove("shake");
    void el.board.offsetWidth;
    el.board.classList.add("shake");
  }

  function render() {
    const n = state.level;
    const total = n*n;

    el.gridV.textContent = `${n}×${n}`;
    el.streakV.textContent = String(state.streak);
    el.bestV.textContent = String(state.best);

    el.board.style.setProperty("--n", n);
    el.board.innerHTML = "";

    pickPalette();
    const odd = makeOddColor();
    state.oddIndex = Math.floor(Math.random()*total);

    for (let i=0; i<total; i++){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      const col = (i === state.oddIndex) ? odd : state.base;
      btn.style.background = rgb(col);
      btn.setAttribute("aria-label", i === state.oddIndex ? "odd square" : "square");

      btn.addEventListener("click", () => onPick(i));
      el.board.appendChild(btn);
    }
  }

  function onPick(i){
    const correct = i === state.oddIndex;
    if (correct) {
      state.streak += 1;
      if (state.streak > state.best) { state.best = state.streak; saveBest(); }
      toast("✓");
      // Increase grid occasionally
      if (state.streak % 2 === 0 && state.level < 9) state.level += 1;
      render();
    } else {
      shake();
      toast("✕");
      // penalty: drop grid and streak
      state.streak = 0;
      state.level = Math.max(2, state.level - 1);
      render();
    }
  }

  function doHint(){
    // Briefly outline the odd square
    const cell = el.board.children[state.oddIndex];
    if (!cell) return;
    cell.classList.add("hint");
    toast("odd outlined");
    setTimeout(() => cell.classList.remove("hint"), 600);
  }

  function doReset(){
    state.level = 2;
    state.streak = 0;
    toast("reset");
    render();
  }

  el.reset.addEventListener("click", doReset);
  el.hint.addEventListener("click", doHint);

  // Tap anywhere around board focuses interaction feel
  root.addEventListener("pointerdown", (e) => {
    if (e.target === root) doHint();
  });

  render();
  return { setEnv };
}