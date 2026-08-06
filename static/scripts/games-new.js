document.addEventListener("DOMContentLoaded", function () {
    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var canHover = window.matchMedia
        && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ----- Left-edge year-jump rail: reveal once scrolled past the hero -----
       home-v2.js's own .hv2-nav expand-on-scroll observer uses a
       "-90% 0px 0px 0px" rootMargin, which works there because .hv2-hero is
       a full 100vh tall (so "90% scrolled through the hero" lands right as
       the next section arrives). .hv2-gp-hero is a short title block, not
       full-height, so that same heuristic would flag it as "scrolled past"
       almost immediately (even at the very top of the page, before any
       scrolling) -- instead, reveal once the hero has fully left the
       viewport (default rootMargin, isIntersecting flips false only once
       zero pixels of it remain visible). Runs as its own observer rather
       than folding into home-v2.js, since this rail has zero reuse value
       on the homepage. */
    var yearNav = document.querySelector(".hv2-gp-yearnav");
    var gpHero = document.querySelector(".hv2-gp-hero");

    if (yearNav && gpHero) {
        var yearNavObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                yearNav.classList.toggle("is-visible", !entry.isIntersecting);
            });
        });

        yearNavObserver.observe(gpHero);
    }

    /* ----- Footer reveal fallback -----
       home-v2.js's shared .hv2-reveal observer uses a "-40% 0px -40% 0px"
       rootMargin -- elements reveal only on crossing the dead-center band of
       the viewport. That's unreachable for an element resting at the very
       end of a page short enough that its final scroll position never puts
       it that high up the viewport: the footer's rect.top bottoms out well
       below the trigger band with nowhere further to scroll, so it can
       never fire, on any scroll speed (confirmed this is a pre-existing
       issue, not new here -- index-new.html's footer has the identical
       geometry problem). Rather than retune the shared observer used across
       pages, add a second, more forgiving one scoped to just this page's
       footer: reveal as soon as any part of it enters the viewport. */
    var gpFooter = document.querySelector(".hv2-footer");

    if (gpFooter) {
        var footerObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    gpFooter.classList.add("is-visible");
                    footerObserver.unobserve(gpFooter);
                }
            });
        }, { rootMargin: "0px 0px -5% 0px", threshold: 0 });

        footerObserver.observe(gpFooter);
    }

    /* ----- Year-jump smooth scroll: both the side rail and the decorative
       hero list target the same 4 #year-* ids ----- */
    var yearLinks = document.querySelectorAll(".hv2-gp-yearjump__link, .hv2-gp-yearnav__link");

    yearLinks.forEach(function (link) {
        link.addEventListener("click", function (e) {
            var targetId = link.getAttribute("href");
            var target = targetId && document.querySelector(targetId);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: "start"
            });
        });
    });

    /* ----- Hover/tap-to-play video -----
       Each .hv2-gp-video starts with no <video src> at all -- zero network
       cost until interaction, same intent as the homepage hero reel's idle
       layer. At most one plays at a time: arming a new one tears down
       whichever was previously playing (pause, drop src, .load()) exactly
       like home-v2.js's hero trailer reel does when swapping clips. This is
       user-initiated playback, so unlike the ambient starfield/hero reel it
       is deliberately NOT gated behind reduceMotion. */
    var videoZones = document.querySelectorAll(".hv2-gp-video");

    if (videoZones.length) {
        var currentZone = null;

        function playSafely(video) {
            var attempt = video.play();
            if (attempt && attempt.catch) {
                attempt.catch(function () { /* autoplay blocked; poster stays up */ });
            }
        }

        function teardown(zone) {
            var video = zone.querySelector(".hv2-gp-video__clip");
            zone.classList.remove("is-playing");
            if (!video) return;
            video.pause();
            video.removeAttribute("src");
            video.load();
        }

        function armAndPlay(zone) {
            if (zone === currentZone) return;
            if (currentZone) teardown(currentZone);

            var video = zone.querySelector(".hv2-gp-video__clip");
            var src = zone.getAttribute("data-video-src");
            if (!video || !src) return;

            video.src = src;
            video.load();
            playSafely(video);
            zone.classList.add("is-playing");
            currentZone = zone;
        }

        function stop(zone) {
            if (zone !== currentZone) return;
            teardown(zone);
            currentZone = null;
        }

        videoZones.forEach(function (zone) {
            if (canHover) {
                zone.addEventListener("pointerenter", function () { armAndPlay(zone); });
                zone.addEventListener("pointerleave", function () { stop(zone); });
            } else {
                zone.addEventListener("click", function () {
                    if (zone === currentZone) {
                        stop(zone);
                    } else {
                        armAndPlay(zone);
                    }
                });
            }
        });

        /* Safety net: tear down playback if the user scrolls away without a
           pointerleave (e.g. wheel/keyboard scroll while the cursor stays put) */
        var videoVisibilityObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting && entry.target === currentZone) {
                    stop(entry.target);
                }
            });
        }, { threshold: 0 });

        videoZones.forEach(function (zone) { videoVisibilityObserver.observe(zone); });
    }

    /* ----- tsParticles: chromatic constellation layer threading between
       game sections. Guarded against the vendor scripts failing to load.
       Scoped to #hv2-gp-particles, a position:absolute div spanning the
       full-height .hv2-gp-particles-field wrapper (NOT position:fixed --
       that would pin it to one viewport-height slice instead of threading
       across all ~11 entries as the page scrolls). Reuses the existing
       hand-rolled sparkle SVGs as tintable particle images, so this layer
       stays visually consistent with the rest of the site's decor rather
       than introducing a generic 5-point star look. ----- */
    var particlesEl = document.getElementById("hv2-gp-particles");

    if (particlesEl && window.tsParticles && window.loadAll) {
        var fieldHeight = particlesEl.offsetHeight || 4000;
        // density scales with actual content height rather than trusting
        // tsParticles' own viewport-calibrated density heuristic, mirroring
        // the hand-rolled starfield's own Math.min(170, ...) density cap
        var particleCount = Math.max(40, Math.min(120, Math.round(fieldHeight / 90)));

        // deliberately distinct from the ambient starfield's #fae5c8/#f37f93
        // (home-v2.js lines ~299, ~361) so this layer reads as its own thing
        var chromaColors = ["#ed1395", "#ffc4d6", "#af4474", "#7c5cff", "#ff9a56"];

        window.loadAll(window.tsParticles).then(function () {
            return window.tsParticles.load({
                id: "hv2-gp-particles",
                options: {
                    fullScreen: { enable: false },
                    detectRetina: true,
                    fpsLimit: 60,
                    pauseOnBlur: true,
                    pauseOnOutsideViewport: true,
                    background: { color: "transparent" },
                    particles: {
                        number: {
                            value: particleCount,
                            density: { enable: false }
                        },
                        color: { value: chromaColors },
                        shape: {
                            // NOTE: if replaceColor tinting doesn't render correctly
                            // (a known flaky option in some tsParticles configs),
                            // fall back to type: "star" with the same color array.
                            type: "images",
                            options: {
                                images: [
                                    { src: "static/images/decor/star-glow.svg", width: 48, height: 48, replaceColor: true },
                                    { src: "static/images/decor/sparkle-a.svg", width: 32, height: 32, replaceColor: true },
                                    { src: "static/images/decor/sparkle-b.svg", width: 28, height: 42, replaceColor: true },
                                    { src: "static/images/decor/sparkle-c.svg", width: 32, height: 33, replaceColor: true }
                                ]
                            }
                        },
                        opacity: { value: { min: 0.3, max: 0.75 } },
                        size: { value: { min: 7, max: 20 } },
                        links: {
                            enable: true,
                            distance: 180,
                            color: "#af4474",
                            opacity: 0.25,
                            width: 1
                        },
                        move: {
                            enable: !reduceMotion,
                            speed: 0.35,
                            direction: "none",
                            random: true,
                            straight: false,
                            outModes: { default: "out" }
                        }
                    },
                    interactivity: {
                        events: {
                            onHover: { enable: false },
                            onClick: { enable: false },
                            resize: { enable: true }
                        }
                    }
                }
            });
        }).then(function (container) {
            if (!container) return;
            // explicit visibilitychange handling, mirroring home-v2.js's own
            // stopStars()/startStars() pattern -- pauseOnBlur above is
            // window-blur-based, not tab-visibility-based, so this covers
            // the tab-switch case pauseOnBlur may not catch
            document.addEventListener("visibilitychange", function () {
                if (document.hidden) {
                    container.pause();
                } else {
                    container.play();
                }
            });
        }).catch(function () {
            // vendor scripts failed to load or config rejected -- ambient
            // decoration only, the rest of the page works fine without it
        });
    }
});
