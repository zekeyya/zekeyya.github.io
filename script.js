const c = document.getElementById("c");
const ctx = c.getContext("2d");

let w = window.innerWidth;
let h = window.innerHeight;
c.width = w * devicePixelRatio;
c.height = h * devicePixelRatio;
ctx.scale(devicePixelRatio, devicePixelRatio);

let bg = "#000"; 
let animations = [];
let hoverText = false;

const text = "Zeke.Portfolio";
const chars = text.split("");
const charOffsets = chars.map((_, i) => i * 0.11);
const waveAmp = 7;
const waveSpeed = 2400;
const charScales = chars.map(() => ({ scale: 1 }));

class Circle {
  constructor(opt) { Object.assign(this, opt); }
  draw() {
    ctx.globalAlpha = this.opacity || 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    if (this.stroke) {
      ctx.strokeStyle = this.stroke.color;
      ctx.lineWidth = this.stroke.width;
      ctx.stroke();
    }
    if (this.fill) ctx.fillStyle = this.fill, ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }
}

const colorPicker = (() => {
  const colors = ["#000000", "#ffffff"];
  let i = 0;
  return {
    next: () => { i = (i + 1) % colors.length; return colors[i]; },
    current: () => colors[i]
  };
})();

function removeAnim(a) {
  const idx = animations.indexOf(a);
  if (idx > -1) animations.splice(idx, 1);
}

function pageFillRadius(x, y) {
  return Math.sqrt(Math.pow(Math.max(x, w - x), 2) + Math.pow(Math.max(y, h - y), 2));
}

function handleEvent(e) {
  let x, y;
  if (e.touches) {
    e.preventDefault();
    x = e.touches[0].pageX;
    y = e.touches[0].pageY;
  } else {
    x = e.pageX || w / 2;
    y = e.pageY || h / 2;
  }

  const cur = colorPicker.current();
  const next = colorPicker.next();
  const targetR = pageFillRadius(x, y);
  const rippleSize = Math.min(200, w * 0.4);

  const fill = new Circle({ x, y, r: 0, fill: next });
  const fillAnim = anime({
    targets: fill,
    r: targetR,
    duration: Math.max(targetR / 2, 750),
    easing: "easeOutQuart",
    complete: () => { bg = fill.fill; removeAnim(fillAnim); }
  });

  const ripple = new Circle({ x, y, r: 0, fill: cur, stroke: { width: 3, color: cur }, opacity: 1 });
  const rippleAnim = anime({
    targets: ripple, r: rippleSize, opacity: 0, duration: 900,
    easing: "easeOutExpo", complete: removeAnim
  });

  const particles = [];
  for (let i = 0; i < 32; i++) {
    particles.push(new Circle({ x, y, fill: cur, r: anime.random(24, 48) }));
  }
  const partAnim = anime({
    targets: particles,
    x: p => p.x + anime.random(rippleSize, -rippleSize),
    y: p => p.y + anime.random(rippleSize * 1.15, -rippleSize * 1.15),
    r: 0,
    duration: anime.random(1000, 1300),
    easing: "easeOutExpo",
    complete: removeAnim
  });

  animations.push(fillAnim, rippleAnim, partAnim);
}

async function handleTextClick(e) {
  let x = e.pageX || (e.touches && e.touches[0].pageX);
  let y = e.pageY || (e.touches && e.touches[0].pageY);

  ctx.font = "24px Helvetica, Arial, sans-serif";
  const tw = ctx.measureText(text).width;
  const th = 24, tx = 20, ty = 20;

  if (x >= tx && x <= tx + tw && y >= ty - waveAmp && y <= ty + th + waveAmp) {
    e.preventDefault();

    if (!window.isSecureContext) {
      alert("Needs HTTPS. Copy manually: " + window.location.href);
      return false;
    }

    try {
      const p = await navigator.permissions.query({ name: "clipboard-write" });
      if (p.state === "granted" || p.state === "prompt") {
        await navigator.clipboard.writeText(window.location.href);
        charScales.forEach((t, i) => {
          anime({
            targets: t,
            scale: [1, 1.5, 1],
            duration: 600,
            delay: i * 50,
            easing: "easeOutElastic(1, 0.6)"
          });
        });
      } else throw new Error("Permission denied");
    } catch (err) {
      alert("Clipboard blocked. Copy manually: " + window.location.href);
    }
    return false;
  }
  return true;
}

function handleMove(e) {
  let x = e.pageX || (e.touches && e.touches[0].pageX);
  let y = e.pageY || (e.touches && e.touches[0].pageY);

  ctx.font = "24px Helvetica, Arial, sans-serif";
  const tw = ctx.measureText(text).width;
  const th = 24, tx = 20, ty = 20;

  hoverText = (x >= tx && x <= tx + tw && y >= ty - waveAmp && y <= ty + th + waveAmp);
  document.body.style.cursor = hoverText ? "pointer" : "url('cursor.png') 16 16, auto";
}

document.addEventListener("mousemove", handleMove);
document.addEventListener("touchmove", handleMove);
document.addEventListener("mousedown", async e => { if (await handleTextClick(e)) handleEvent(e); });
document.addEventListener("touchstart", async e => { if (await handleTextClick(e)) handleEvent(e); });

setTimeout(() => handleEvent({}), 1500); // auto ripple after a sec and a half

function animate() {
  const t = performance.now();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  animations.forEach(a => a.animatables.forEach(obj => obj.target.draw()));

  ctx.font = "24px Helvetica, Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.globalCompositeOperation = "difference";
  ctx.fillStyle = "#fff";
  
  let x = 20;
  chars.forEach((ch, i) => {
    const yOff = Math.sin((t / waveSpeed + charOffsets[i]) * Math.PI * 2) * waveAmp;
    const sc = charScales[i].scale;
    ctx.save();
    ctx.translate(x, 20 + yOff);
    ctx.scale(sc, sc);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    x += ctx.measureText(ch).width * sc;
  });

  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(animate);
}
animate();

window.addEventListener("resize", () => {
  w = window.innerWidth;
  h = window.innerHeight;
  c.width = w * devicePixelRatio;
  c.height = h * devicePixelRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
});
