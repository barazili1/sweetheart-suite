/**
 * Neon particle background (80 particles + connecting lines, colour #90D600).
 * Injected on every page of the cloned site.
 */
(function () {
  var COUNT = 80;
  var COLOR = "#90D600";
  var LINK_DISTANCE = 130;

  function start() {
    if (document.getElementById("neon-particles")) return;

    var canvas = document.createElement("canvas");
    canvas.id = "neon-particles";
    canvas.setAttribute(
      "style",
      "position:fixed;inset:0;width:100vw;height:100vh;z-index:1;pointer-events:none;display:block;background:transparent;",
    );
    (document.body || document.documentElement).appendChild(canvas);

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0;
    var h = 0;
    var dots = [];

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      dots = [];
      for (var i = 0; i < COUNT; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: Math.random() * 1.8 + 1,
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < dots.length; i++) {
        var p = dots[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        for (var j = i + 1; j < dots.length; j++) {
          var q = dots[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DISTANCE) {
            ctx.strokeStyle = COLOR;
            ctx.globalAlpha = (1 - d / LINK_DISTANCE) * 0.35;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = COLOR;
      ctx.shadowColor = COLOR;
      ctx.shadowBlur = 8;
      for (var k = 0; k < dots.length; k++) {
        var d2 = dots[k];
        ctx.beginPath();
        ctx.arc(d2.x, d2.y, d2.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      requestAnimationFrame(frame);
    }

    resize();
    seed();
    window.addEventListener("resize", function () {
      resize();
      seed();
    });
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
