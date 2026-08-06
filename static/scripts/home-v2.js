document.addEventListener("DOMContentLoaded", function () {
    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ----- Sticky nav: reveal Games/About/Events/Team once the hero scrolls out of view ----- */
    var nav = document.querySelector(".hv2-nav");
    var hero = document.querySelector(".hv2-hero, .hv2-gp-hero");

    if (nav && hero) {
        var navObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                nav.classList.toggle("is-expanded", !entry.isIntersecting);
            });
        }, { rootMargin: "-90% 0px 0px 0px" });

        navObserver.observe(hero);
    }

    /* ----- Scroll reveal for content sections -----
       rootMargin shrinks the observer's effective viewport to a thin band
       straddling the vertical center, so a section reveals as it crosses the
       middle of the screen instead of the instant its top edge peeks in from
       the bottom (the old `threshold: 0.15` fired far too early). */
    var revealTargets = document.querySelectorAll(".hv2-reveal");

    if (revealTargets.length) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });
    }

    /* ----- Club Games gallery: 4 / 4 / 3 pages, cross-fading both directions ----- */
    var pages = document.querySelectorAll(".hv2-games__page");
    var prevBtn = document.querySelector(".hv2-games__pager--prev");
    var nextBtn = document.querySelector(".hv2-games__pager--next");
    var dots = document.querySelectorAll(".hv2-games__dot");

    if (pages.length) {
        var currentPage = 0;
        var swapping = false;
        var PAGE_FADE_MS = 220;

        function updateDots() {
            for (var i = 0; i < dots.length; i++) {
                dots[i].classList.toggle("is-active", i === currentPage);
                dots[i].setAttribute("aria-current", i === currentPage ? "true" : "false");
            }
        }

        function goToPage(target) {
            target = (target + pages.length) % pages.length;
            if (swapping || pages.length < 2 || target === currentPage) return;
            swapping = true;

            var outgoing = pages[currentPage];
            outgoing.classList.add("is-leaving");

            setTimeout(function () {
                outgoing.hidden = true;
                outgoing.classList.remove("is-leaving");

                currentPage = target;

                var incoming = pages[currentPage];
                incoming.hidden = false;
                incoming.classList.add("is-leaving"); // start transparent
                void incoming.offsetWidth;            // force a reflow so the fade runs
                incoming.classList.remove("is-leaving");

                updateDots();

                setTimeout(function () { swapping = false; }, PAGE_FADE_MS);
            }, PAGE_FADE_MS);
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", function () { goToPage(currentPage + 1); });
        }
        if (prevBtn) {
            prevBtn.addEventListener("click", function () { goToPage(currentPage - 1); });
        }
        for (var d = 0; d < dots.length; d++) {
            (function (index) {
                dots[index].addEventListener("click", function () { goToPage(index); });
            })(d);
        }

        updateDots();
    }

    /* ----- Hero trailer reel: cycles every clip in static/images/games/trailers/,
       cross-fading between two stacked <video> layers. Only one clip is buffered
       at a time -- the outgoing layer's src is released after each fade. ----- */
    var HERO_TRAILERS = [
        "static/images/games/trailers/Encore_Demo_Clipped.mp4",
        "static/images/games/trailers/Encore - FreePlayClip 9-2.mp4",
        "static/images/games/trailers/27_Trailer_Clipped.mp4",
        "static/images/games/trailers/Dungeon_Barista_2026.mp4",
        "static/images/games/trailers/Glyphbound_2026.mp4",
        "static/images/games/trailers/Boola_Dash_2026.mp4",
        "static/images/games/trailers/Planet_112_2026.mp4",
        "static/images/games/trailers/Bulldog_Bash_2026.mp4",
        "static/images/games/trailers/Echoes of Eternity Promotional Trailer - Amoriem Labs - Victor Liu (1080p).mp4"
    ];

    var CROSSFADE_MS = 900;      // keep in sync with .hv2-hero__video transition
    var CLIP_MAX_SECONDS = 15;   // each trailer gets a 15s slot, then hands over

    var heroLayers = document.querySelectorAll(".hv2-hero__video");

    if (heroLayers.length === 2 && HERO_TRAILERS.length > 1) {
        var clipIndex = 0;      // matches the src already inline on layer 0
        var activeLayer = 0;
        var advancing = false;
        var failures = 0;

        function playSafely(video) {
            var attempt = video.play();
            if (attempt && attempt.catch) {
                attempt.catch(function () { /* autoplay blocked; poster stays up */ });
            }
        }

        function advanceTrailer() {
            if (advancing) return;
            advancing = true;

            var outgoing = heroLayers[activeLayer];
            var incoming = heroLayers[1 - activeLayer];

            clipIndex = (clipIndex + 1) % HERO_TRAILERS.length;
            incoming.src = encodeURI(HERO_TRAILERS[clipIndex]);
            incoming.load();

            function cleanUp() {
                incoming.removeEventListener("playing", onPlaying);
                incoming.removeEventListener("error", onError);
            }

            function onPlaying() {
                cleanUp();
                failures = 0;

                incoming.classList.add("is-active");
                outgoing.classList.remove("is-active");
                activeLayer = 1 - activeLayer;

                // once the fade has finished, release the clip we just left
                setTimeout(function () {
                    outgoing.pause();
                    outgoing.removeAttribute("src");
                    outgoing.load();
                    advancing = false;
                    armLayer(heroLayers[activeLayer]);
                }, CROSSFADE_MS);
            }

            function onError() {
                cleanUp();
                advancing = false;
                // skip a clip that will not load, but don't spin forever
                failures++;
                if (failures < HERO_TRAILERS.length) advanceTrailer();
            }

            incoming.addEventListener("playing", onPlaying);
            incoming.addEventListener("error", onError);
            playSafely(incoming);
        }

        function armLayer(layer) {
            function onTimeUpdate() {
                var fade = CROSSFADE_MS / 1000;

                // hand over once this clip has used its slot...
                var slotUsed = layer.currentTime >= CLIP_MAX_SECONDS - fade;

                // ...or just before a clip shorter than the cap runs out
                var nearEnd = layer.duration && !isNaN(layer.duration)
                    && layer.duration - layer.currentTime <= fade + 0.15;

                if (slotUsed || nearEnd) {
                    layer.removeEventListener("timeupdate", onTimeUpdate);
                    advanceTrailer();
                }
            }

            function onEnded() {
                layer.removeEventListener("ended", onEnded);
                layer.removeEventListener("timeupdate", onTimeUpdate);
                advanceTrailer();
            }

            layer.addEventListener("timeupdate", onTimeUpdate);
            layer.addEventListener("ended", onEnded);
        }

        armLayer(heroLayers[0]);
        playSafely(heroLayers[0]);
    }

    /* ----- Twinkling starfield + cursor sparkle trail (hand-rolled canvas,
       no dependency -- both share the one rAF loop below). ----- */
    var starCanvas = document.querySelector(".hv2-stars");
    /* Sparkle trail draws on its own top-most canvas (see .hv2-sparkle-layer)
       so it renders over the hero video and every opaque section, not just
       the background gradient behind the star canvas. */
    var sparkleCanvas = document.querySelector(".hv2-sparkle-layer");

    if (starCanvas && starCanvas.getContext) {
        var ctx = starCanvas.getContext("2d");
        var sparkleCtx = sparkleCanvas && sparkleCanvas.getContext ? sparkleCanvas.getContext("2d") : null;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var stars = [];
        var viewW = 0;
        var viewH = 0;
        var rafId = null;

        var canHover = window.matchMedia
            && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        /* Cursor sparkle trail: small 4-point sparkles spawn as the pointer
           moves and fade/drift away, echoing the .hv2-decor sparkle motifs.
           Mouse-only (gated like every other hover effect on this page) and
           skipped entirely under reduced motion -- see the `else` branch
           below where the listener is attached. */
        var trail = [];
        var TRAIL_MAX = 40;
        var lastTrailX = null;
        var lastTrailY = null;
        var MIN_SPAWN_DIST = 14; // px moved before the next sparkle spawns

        function spawnSparkle(x, y) {
            if (trail.length >= TRAIL_MAX) trail.shift();
            trail.push({
                x: x,
                y: y,
                size: Math.random() * 3 + 2,
                rot: Math.random() * Math.PI,
                spin: (Math.random() - 0.5) * 0.05,
                driftX: (Math.random() - 0.5) * 0.3,
                driftY: -Math.random() * 0.4 - 0.1,
                life: 1,
                decay: Math.random() * 0.02 + 0.018,
                warm: Math.random() < 0.6
            });
        }

        function onPointerMove(e) {
            var x = e.clientX;
            var y = e.clientY;

            if (lastTrailX === null) {
                lastTrailX = x;
                lastTrailY = y;
                return;
            }

            var dx = x - lastTrailX;
            var dy = y - lastTrailY;
            if ((dx * dx + dy * dy) < MIN_SPAWN_DIST * MIN_SPAWN_DIST) return;

            lastTrailX = x;
            lastTrailY = y;
            spawnSparkle(x, y);
        }

        function updateTrail() {
            for (var i = trail.length - 1; i >= 0; i--) {
                var s = trail[i];
                s.life -= s.decay;
                if (s.life <= 0) {
                    trail.splice(i, 1);
                    continue;
                }
                s.x += s.driftX;
                s.y += s.driftY;
                s.rot += s.spin;
            }
        }

        function drawSparkle(s) {
            var r = s.size * s.life; // shrinks as it fades
            if (r <= 0 || !sparkleCtx) return;

            sparkleCtx.save();
            sparkleCtx.globalAlpha = s.life;
            sparkleCtx.translate(s.x, s.y);
            sparkleCtx.rotate(s.rot);
            sparkleCtx.fillStyle = s.warm ? "#f37f93" : "#fae5c8";

            // simple 4-point sparkle (diamond cross), matching the decor SVGs
            sparkleCtx.beginPath();
            sparkleCtx.moveTo(0, -r * 2);
            sparkleCtx.lineTo(r * 0.35, -r * 0.35);
            sparkleCtx.lineTo(r * 2, 0);
            sparkleCtx.lineTo(r * 0.35, r * 0.35);
            sparkleCtx.lineTo(0, r * 2);
            sparkleCtx.lineTo(-r * 0.35, r * 0.35);
            sparkleCtx.lineTo(-r * 2, 0);
            sparkleCtx.lineTo(-r * 0.35, -r * 0.35);
            sparkleCtx.closePath();
            sparkleCtx.fill();
            sparkleCtx.restore();
        }

        function seedStars() {
            viewW = window.innerWidth;
            viewH = window.innerHeight;

            starCanvas.width = viewW * dpr;
            starCanvas.height = viewH * dpr;
            starCanvas.style.width = viewW + "px";
            starCanvas.style.height = viewH + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            if (sparkleCtx) {
                sparkleCanvas.width = viewW * dpr;
                sparkleCanvas.height = viewH * dpr;
                sparkleCanvas.style.width = viewW + "px";
                sparkleCanvas.style.height = viewH + "px";
                sparkleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }

            // density follows viewport area, capped so large screens stay cheap
            var count = Math.min(170, Math.round((viewW * viewH) / 11000));
            stars = [];

            for (var i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * viewW,
                    y: Math.random() * viewH,
                    r: Math.random() * 1.2 + 0.35,
                    base: Math.random() * 0.35 + 0.2,
                    amp: Math.random() * 0.35,
                    speed: Math.random() * 0.0012 + 0.0004,
                    phase: Math.random() * Math.PI * 2,
                    warm: i % 6 === 0
                });
            }
        }

        function draw(time) {
            ctx.clearRect(0, 0, viewW, viewH);

            for (var i = 0; i < stars.length; i++) {
                var s = stars[i];
                var alpha = s.base + Math.sin(time * s.speed + s.phase) * s.amp;
                if (alpha <= 0) continue;

                ctx.globalAlpha = alpha > 1 ? 1 : alpha;
                ctx.fillStyle = s.warm ? "#f37f93" : "#fae5c8";
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;

            if (sparkleCtx) {
                sparkleCtx.clearRect(0, 0, viewW, viewH);
                if (trail.length) {
                    updateTrail();
                    for (var t = 0; t < trail.length; t++) drawSparkle(trail[t]);
                    sparkleCtx.globalAlpha = 1;
                }
            }
        }

        function loop(time) {
            draw(time);
            rafId = window.requestAnimationFrame(loop);
        }

        function startStars() {
            if (rafId === null) rafId = window.requestAnimationFrame(loop);
        }

        function stopStars() {
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        seedStars();

        if (reduceMotion) {
            draw(0); // static field, no animation loop, no cursor trail
        } else {
            startStars();
            // don't burn frames while the tab is in the background
            document.addEventListener("visibilitychange", function () {
                if (document.hidden) stopStars();
                else startStars();
            });

            if (canHover) {
                window.addEventListener("pointermove", onPointerMove, { passive: true });
            }
        }

        var resizeTimer = null;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                seedStars();
                if (reduceMotion) draw(0);
            }, 150);
        });
    }
});
