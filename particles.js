(function () {
  "use strict";

  var canvas = document.querySelector(".hero-particles");
  if (!canvas || !canvas.getContext) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  var ctx = canvas.getContext("2d");
  var w = 0, h = 0, dust = [], beams = [];
  var t0 = performance.now();
  var raf = null;

  var opts = {
    dichte: 110,
    tempo: 4.4,
    strahlen: 3,
    lichtstaerke: 1,
    akzent: "#E7AC55",
    rig: false
  };

  function rgba(hex, a) {
    var h2 = hex.replace("#", "");
    var v = h2.length === 3 ? h2.split("").map(function (c) { return c + c; }).join("") : h2;
    var n = parseInt(v, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")";
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function build() {
    var n = Math.round(opts.dichte);
    dust = [];
    for (var i = 0; i < n; i++) {
      var z = rnd(0.25, 1);
      dust.push({
        x: Math.random(), y: Math.random(), z: z,
        r: (0.6 + z * 2.2) * rnd(0.7, 1.4),
        vx: rnd(-0.011, 0.016) * z,
        vy: rnd(-0.016, -0.003) * z,
        sw: rnd(0.06, 0.3), sp: rnd(0.15, 0.5), ph: rnd(0, 6.28),
        tw: rnd(0.4, 1.1)
      });
    }
    var presets = [
      { x: 0.13, y: -0.16, a: 1.02, spread: 0.2, len: 1.5, w: 0.9 },
      { x: 0.78, y: -0.2, a: 1.9, spread: 0.15, len: 1.45, w: 0.75 },
      { x: 1.06, y: 0.32, a: 2.72, spread: 0.11, len: 1.1, w: 0.6 },
      { x: -0.06, y: 0.62, a: 0.28, spread: 0.1, len: 1.0, w: 0.5 }
    ];
    var beamCount = Math.max(0, Math.min(4, Math.round(opts.strahlen)));
    beams = presets.slice(0, beamCount).map(function (b, i) {
      var out = {};
      for (var k in b) out[k] = b[k];
      out.ph = i * 1.7;
      return out;
    });
  }

  function drawRig(t, speed) {
    var s = Math.min(w, h);
    function sway(f, amp) { return Math.sin(t * f * speed) * amp; }
    var line = "#4A4A7C";
    var accent = opts.akzent;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.lineCap = "round";

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = line;
    var ty = h * 0.085 + sway(0.09, 3);
    var th = s * 0.032;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, ty); ctx.lineTo(w * 0.94, ty);
    ctx.moveTo(w * 0.06, ty + th); ctx.lineTo(w * 0.94, ty + th);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    for (var x = w * 0.06; x < w * 0.94; x += th) {
      ctx.moveTo(x, ty); ctx.lineTo(Math.min(x + th, w * 0.94), ty + th);
      ctx.moveTo(Math.min(x + th, w * 0.94), ty); ctx.lineTo(x, ty + th);
    }
    ctx.stroke();

    [0.17, 0.44, 0.71].forEach(function (fx, i) {
      var lx = w * fx + sway(0.11 + i * 0.03, 4);
      var ly = ty + th;
      var drop = s * (0.08 + i * 0.015);
      var tilt = 0.45 + sway(0.13 + i * 0.05, 0.06);
      ctx.globalAlpha = 0.34;
      ctx.strokeStyle = line;
      ctx.beginPath();
      ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + drop);
      ctx.stroke();
      var hw = s * 0.028, hh = s * 0.042;
      ctx.save();
      ctx.translate(lx, ly + drop);
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.moveTo(-hw * 0.55, 0); ctx.lineTo(hw * 0.55, 0);
      ctx.lineTo(hw, hh); ctx.lineTo(-hw, hh);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-hw, hh); ctx.lineTo(hw, hh);
      ctx.stroke();
      ctx.restore();
    });

    var cx = w * 0.2 + sway(0.05, 6), cy = h * 0.78;
    var cs = s * 0.075;
    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = line;
    ctx.beginPath();
    ctx.rect(cx - cs * 0.9, cy - cs * 0.5, cs * 1.8, cs);
    ctx.moveTo(cx + cs * 0.9, cy - cs * 0.18); ctx.lineTo(cx + cs * 1.7, cy - cs * 0.18);
    ctx.moveTo(cx + cs * 0.9, cy + cs * 0.22); ctx.lineTo(cx + cs * 1.7, cy + cs * 0.22);
    ctx.moveTo(cx - cs * 0.5, cy - cs * 0.5); ctx.lineTo(cx - cs * 0.5, cy - cs * 1.0);
    ctx.lineTo(cx + cs * 0.1, cy - cs * 1.0); ctx.lineTo(cx + cs * 0.1, cy - cs * 0.5);
    ctx.moveTo(cx, cy + cs * 0.5); ctx.lineTo(cx - cs * 0.75, cy + cs * 1.7);
    ctx.moveTo(cx, cy + cs * 0.5); ctx.lineTo(cx + cs * 0.75, cy + cs * 1.7);
    ctx.moveTo(cx, cy + cs * 0.5); ctx.lineTo(cx + cs * 0.1, cy + cs * 1.75);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(cx + cs * 1.7, cy, cs * 0.3, 0, 6.2832);
    ctx.stroke();
    ctx.globalAlpha = 0.25 + Math.sin(t * 1.2 * speed) * 0.18;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx - cs * 0.62, cy - cs * 0.62, s * 0.004, 0, 6.2832);
    ctx.fill();

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = line;
    var bx = w * 1.02, by = h * 0.3;
    var ba = 2.55 + sway(0.08, 0.045);
    var bl = s * 0.72;
    var ex = bx + Math.cos(ba) * bl, ey = by + Math.sin(ba) * bl;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 0.03, s * 0.012, ba, 0, 6.2832);
    ctx.stroke();

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    var mx = w * 0.55, my = h * 0.88;
    ctx.beginPath();
    ctx.moveTo(mx - s * 0.02, my - s * 0.02); ctx.lineTo(mx + s * 0.02, my + s * 0.02);
    ctx.moveTo(mx + s * 0.02, my - s * 0.02); ctx.lineTo(mx - s * 0.02, my + s * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  function frame(t) {
    if (!ctx) return;
    var accent = opts.akzent;
    var speed = opts.tempo;
    var beamGain = opts.lichtstaerke;
    var D = Math.hypot(w, h);
    ctx.clearRect(0, 0, w, h);

    var liveBeams = beams.map(function (b) {
      var a = b.a + Math.sin(t * 0.07 * speed + b.ph) * 0.055;
      return { ox: b.x * w, oy: b.y * h, a: a, spread: b.spread, len: b.len * D, w: b.w };
    });

    ctx.globalCompositeOperation = "lighter";
    liveBeams.forEach(function (b, i) {
      var puls = 0.82 + Math.sin(t * 0.5 * speed + i * 2.1) * 0.1 + Math.sin(t * 3.1 + i) * 0.02;
      var a1 = b.a - b.spread, a2 = b.a + b.spread;
      var p1 = [b.ox + Math.cos(a1) * b.len, b.oy + Math.sin(a1) * b.len];
      var p2 = [b.ox + Math.cos(a2) * b.len, b.oy + Math.sin(a2) * b.len];
      var mid = [b.ox + Math.cos(b.a) * b.len, b.oy + Math.sin(b.a) * b.len];
      var g = ctx.createLinearGradient(b.ox, b.oy, mid[0], mid[1]);
      var A = 0.11 * b.w * beamGain * puls;
      g.addColorStop(0, rgba(accent, A));
      g.addColorStop(0.35, rgba("#78788E", A * 0.5));
      g.addColorStop(1, rgba("#34365F", 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(b.ox, b.oy);
      ctx.lineTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.closePath();
      ctx.fill();
      var hg = ctx.createRadialGradient(b.ox, b.oy, 0, b.ox, b.oy, D * 0.12 * b.w);
      hg.addColorStop(0, rgba(accent, 0.16 * beamGain * puls));
      hg.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = hg;
      ctx.fillRect(b.ox - D, b.oy - D, D * 2, D * 2);
    });

    dust.forEach(function (p) {
      p.x += p.vx * 0.0016 * speed;
      p.y += p.vy * 0.0016 * speed;
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      if (p.y > 1.06) p.y = -0.04;
      if (p.x < -0.05) p.x = 1.04;
      if (p.x > 1.05) p.x = -0.04;
      var x = (p.x + Math.sin(t * p.sp * speed + p.ph) * p.sw * 0.02) * w;
      var y = p.y * h;
      var lit = 0;
      liveBeams.forEach(function (b) {
        var dx = x - b.ox, dy = y - b.oy;
        var dist = Math.hypot(dx, dy);
        if (dist > b.len) return;
        var da = Math.abs(Math.atan2(dy, dx) - b.a);
        while (da > Math.PI) da = Math.abs(da - Math.PI * 2);
        if (da > b.spread) return;
        lit += (1 - da / b.spread) * (1 - dist / b.len) * b.w;
      });
      var twinkle = 0.7 + Math.sin(t * 1.6 * p.tw + p.ph) * 0.3;
      var base = 0.09 * p.z;
      var a = Math.min(0.95, (base + lit * 0.75 * beamGain) * twinkle);
      var r = p.r * (1 + lit * 0.5);
      var g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g2.addColorStop(0, rgba(lit > 0.25 ? accent : "#EEF1FB", a));
      g2.addColorStop(0.4, rgba(lit > 0.25 ? accent : "#BFC1DB", a * 0.28));
      g2.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, 6.2832);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";

    if (opts.rig) drawRig(t, speed);
  }

  function loop(now) {
    frame((now - t0) / 1000);
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  resize();
  build();
  raf = requestAnimationFrame(loop);
})();
