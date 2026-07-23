document.addEventListener("DOMContentLoaded", function () {
    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ----- Sticky nav: reveal Games/About/Events/Team once the hero scrolls out of view ----- */
    var nav = document.querySelector(".hv2-nav");
    var hero = document.querySelector(".hv2-hero");

    if (nav && hero) {
        var navObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                nav.classList.toggle("is-expanded", !entry.isIntersecting);
            });
        }, { rootMargin: "-90% 0px 0px 0px" });

        navObserver.observe(hero);
    }

    /* ----- Scroll reveal for content sections ----- */
    var revealTargets = document.querySelectorAll(".hv2-reveal");

    if (revealTargets.length) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });
    }

    /* ----- Club Games gallery: 4 / 4 / 3 pages, cross-fading both directions ----- */
    var pages = document.querySelectorAll(".hv2-games__page");
    var prevBtn = document.querySelector(".hv2-games__pager--prev");
    var nextBtn = document.querySelector(".hv2-games__pager--next");

    if (pages.length) {
        var currentPage = 0;
        var swapping = false;
        var PAGE_FADE_MS = 220;

        function goToPage(target) {
            if (swapping || pages.length < 2) return;
            swapping = true;

            var outgoing = pages[currentPage];
            outgoing.classList.add("is-leaving");

            setTimeout(function () {
                outgoing.hidden = true;
                outgoing.classList.remove("is-leaving");

                currentPage = (target + pages.length) % pages.length;

                var incoming = pages[currentPage];
                incoming.hidden = false;
                incoming.classList.add("is-leaving"); // start transparent
                void incoming.offsetWidth;            // force a reflow so the fade runs
                incoming.classList.remove("is-leaving");

                setTimeout(function () { swapping = false; }, PAGE_FADE_MS);
            }, PAGE_FADE_MS);
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", function () { goToPage(currentPage + 1); });
        }
        if (prevBtn) {
            prevBtn.addEventListener("click", function () { goToPage(currentPage - 1); });
        }
    }

    /* ----- Hero trailer reel: cycles every clip in static/images/games/trailers/,
       cross-fading between two stacked <video> layers. Only one clip is buffered
       at a time -- the outgoing layer's src is released after each fade. ----- */
    var HERO_TRAILERS = [
        "static/images/games/trailers/Encore_Demo_Clipped.mp4",
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

    /* ----- Twinkling starfield (hand-rolled canvas, no dependency) ----- */
    var starCanvas = document.querySelector(".hv2-stars");

    if (starCanvas && starCanvas.getContext) {
        var ctx = starCanvas.getContext("2d");
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var stars = [];
        var viewW = 0;
        var viewH = 0;
        var rafId = null;

        function seedStars() {
            viewW = window.innerWidth;
            viewH = window.innerHeight;

            starCanvas.width = viewW * dpr;
            starCanvas.height = viewH * dpr;
            starCanvas.style.width = viewW + "px";
            starCanvas.style.height = viewH + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
            draw(0); // static field, no animation loop
        } else {
            startStars();
            // don't burn frames while the tab is in the background
            document.addEventListener("visibilitychange", function () {
                if (document.hidden) stopStars();
                else startStars();
            });
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
