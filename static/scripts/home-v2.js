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

    /* ----- Mobile hamburger: toggle the dropdown panel (.hv2-nav__menu) ----- */
    var navToggle = document.querySelector(".hv2-nav__toggle");

    if (nav && navToggle) {
        function setNavOpen(open) {
            nav.classList.toggle("is-open", open);
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        }

        navToggle.addEventListener("click", function (e) {
            e.stopPropagation();
            setNavOpen(!nav.classList.contains("is-open"));
        });

        // close after choosing a destination, tapping outside, or pressing Esc
        nav.querySelectorAll(".hv2-nav__link, .hv2-nav__socials a").forEach(function (link) {
            link.addEventListener("click", function () { setNavOpen(false); });
        });

        document.addEventListener("click", function (e) {
            if (nav.classList.contains("is-open") && !nav.contains(e.target)) {
                setNavOpen(false);
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") setNavOpen(false);
        });

        // returning to desktop width: drop the open state so the panel can't
        // stay stuck across a resize/orientation change
        window.addEventListener("resize", function () {
            if (window.innerWidth > 800) setNavOpen(false);
        });
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

    /* ----- Club Games showcase: dual mode -----
       Wide screens: the track holds three .hv2-games__page grids (2x2 each) and
       the arrows / ticker page 4 / 4 / 3 games at a time -- manual only.
       Below 620px: the page wrappers collapse (CSS display: contents) so every
       .hv2-game-card is a full-width slide, and it runs as a one-at-a-time
       carousel that auto-advances. The (max-width: 620px) media query flips
       between the two -- rebuild() re-reads the slide set and ticker on change.
       Auto-advance (narrow mode only) pauses on hover/focus, while the tab is
       hidden, and while the section is off screen; arrows / swipe reset it. --- */
    var gamesGallery = document.querySelector(".hv2-games__gallery");
    var gamesTrack = document.querySelector(".hv2-games__track");
    var gamesPages = gamesTrack ? gamesTrack.querySelectorAll(".hv2-games__page") : [];
    var gamesCards = gamesTrack ? gamesTrack.querySelectorAll(".hv2-game-card") : [];
    var gamesTicker = document.querySelector(".hv2-games__ticker");
    var prevBtn = document.querySelector(".hv2-games__pager--prev");
    var nextBtn = document.querySelector(".hv2-games__pager--next");

    if (gamesTrack && gamesCards.length > 1) {
        var CARDS_PER_PAGE = 4;
        var AUTO_ADVANCE_MS = 4500;
        var narrowMQ = window.matchMedia("(max-width: 620px)");
        var slideIndex = 0;
        var slides = [];
        var oneAtATime = false;
        var autoTimer = null;
        var gameDots = [];

        function showSlide(target) {
            slideIndex = (target + slides.length) % slides.length;
            gamesTrack.style.transform = "translateX(-" + (slideIndex * 100) + "%)";
            for (var i = 0; i < gameDots.length; i++) {
                gameDots[i].classList.toggle("is-active", i === slideIndex);
                gameDots[i].setAttribute("aria-current", i === slideIndex ? "true" : "false");
            }
        }

        function buildTicker() {
            gamesTicker.textContent = "";
            gameDots = [];
            for (var g = 0; g < slides.length; g++) {
                (function (i) {
                    var dot = document.createElement("button");
                    dot.type = "button";
                    dot.className = "hv2-games__dot";
                    if (oneAtATime) {
                        var name = slides[i].querySelector(".hv2-game-card__name");
                        dot.setAttribute("aria-label",
                            "Show " + (name ? name.textContent.trim() : "game " + (i + 1)));
                    } else {
                        dot.setAttribute("aria-label", "Go to games page " + (i + 1));
                    }
                    dot.addEventListener("click", function () {
                        showSlide(i);
                        restartAuto();
                    });
                    gamesTicker.appendChild(dot);
                    gameDots.push(dot);
                })(g);
            }
        }

        function rebuild() {
            var wasOneAtATime = oneAtATime;
            oneAtATime = narrowMQ.matches;

            // keep roughly the same game in view across a mode switch
            if (oneAtATime && !wasOneAtATime) {
                slideIndex = slideIndex * CARDS_PER_PAGE;
            } else if (!oneAtATime && wasOneAtATime) {
                slideIndex = Math.floor(slideIndex / CARDS_PER_PAGE);
            }

            slides = Array.prototype.slice.call(oneAtATime ? gamesCards : gamesPages);
            buildTicker();
            showSlide(Math.min(slideIndex, slides.length - 1));
            restartAuto();
        }

        function startAuto() {
            if (autoTimer || reduceMotion || !oneAtATime) return;
            autoTimer = window.setInterval(function () {
                showSlide(slideIndex + 1);
            }, AUTO_ADVANCE_MS);
        }

        function stopAuto() {
            if (autoTimer) {
                window.clearInterval(autoTimer);
                autoTimer = null;
            }
        }

        function restartAuto() {
            stopAuto();
            startAuto();
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", function () { showSlide(slideIndex + 1); restartAuto(); });
        }
        if (prevBtn) {
            prevBtn.addEventListener("click", function () { showSlide(slideIndex - 1); restartAuto(); });
        }

        if (gamesGallery) {
            gamesGallery.addEventListener("mouseenter", stopAuto);
            gamesGallery.addEventListener("mouseleave", startAuto);
            gamesGallery.addEventListener("focusin", stopAuto);
            gamesGallery.addEventListener("focusout", startAuto);
        }

        document.addEventListener("visibilitychange", function () {
            if (document.hidden) stopAuto();
            else startAuto();
        });

        var touchX = null;
        gamesTrack.addEventListener("touchstart", function (e) {
            touchX = e.touches[0].clientX;
            stopAuto();
        }, { passive: true });
        gamesTrack.addEventListener("touchend", function (e) {
            if (touchX === null) return;
            var dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 40) showSlide(slideIndex + (dx < 0 ? 1 : -1));
            touchX = null;
            restartAuto();
        });

        if ("IntersectionObserver" in window) {
            var carouselObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) startAuto();
                    else stopAuto();
                });
            }, { threshold: 0.2 });
            carouselObserver.observe(gamesTrack);
        }

        if (narrowMQ.addEventListener) narrowMQ.addEventListener("change", rebuild);
        else if (narrowMQ.addListener) narrowMQ.addListener(rebuild);

        rebuild();
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

    /* ----- Page-transition veil: intercepts internal link clicks and raises
       the starfield-blur curtain (.hv2-transition-veil, styles.css) before
       navigating, so leaving a page dissolves through the same stars instead
       of a hard cut. The arriving page's reveal is separate, plain CSS (see
       styles.css) -- this half only ever drives the exit, and only when GSAP
       actually loaded, same guarded posture as the constellation layer in
       games-new.js. Skipped entirely under reduced motion: links just
       navigate normally. ----- */
    var transitionVeil = document.querySelector(".hv2-transition-veil");

    if (transitionVeil && window.gsap && !reduceMotion) {
        var navigating = false;

        document.addEventListener("click", function (e) {
            if (navigating || e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            var link = e.target.closest("a[href]");
            if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
            if (link.origin !== window.location.origin) return;

            // in-page anchor jump (e.g. "#section") -- let the browser scroll normally
            if (link.pathname === window.location.pathname && link.hash) return;
            // link back to the exact page already showing
            if (link.href === window.location.href) return;

            navigating = true;
            e.preventDefault();

            gsap.to(transitionVeil, {
                opacity: 1,
                duration: 0.46,
                ease: "power2.in",
                onComplete: function () {
                    window.location.href = link.href;
                }
            });
        });
    }
});
