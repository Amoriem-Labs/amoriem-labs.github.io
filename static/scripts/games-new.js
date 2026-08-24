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

    /* ----- Smooth-scroll for both year navs (hero pills + fixed side rail) -----
       Anchors already jump without this; a smooth scroll just keeps that
       jump from feeling like a hard cut. Respects reduceMotion like every
       other animated bit on this page. */
    var yearLinks = document.querySelectorAll(".hv2-gp-yearjump__link, .hv2-gp-yearnav__link");
    yearLinks.forEach(function (link) {
        link.addEventListener("click", function (e) {
            var target = document.querySelector(link.getAttribute("href"));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        });
    });

    /* ----- Hover/tap-to-play video -----
       Each .hv2-gp-video starts with no <video src> at all -- zero network
       cost until interaction, same intent as the homepage hero reel's idle
       layer. At most one plays at a time: arming a new one tears down
       whichever was previously playing (pause, drop src, .load()) exactly
       like home-v2.js's hero trailer reel does when swapping clips. This is
       user-initiated playback, so unlike the ambient starfield/hero reel it
       is deliberately NOT gated behind reduceMotion. Scoped to [data-video-src]
       so the YouTube-backed zones below (which have no local clip to hover-
       preview) don't get wired into this hover machinery. */
    var videoZones = document.querySelectorAll(".hv2-gp-video[data-video-src]");

    if (videoZones.length) {
        var currentZone = null;

        /* Tracks how recently the page scrolled, independent of the pointer.
           A 150ms dwell alone still isn't enough: trackpad momentum
           scrolling decelerates smoothly rather than stopping dead, so it's
           common for a video zone to sit under an already-stationary cursor
           for well over 150ms while the page is still gliding to a stop --
           the exact moment the user is trying to keep scrolling past it.
           armAndPlay checks this and re-defers itself until scrolling has
           been quiet, so playback only ever starts once the page is
           genuinely at rest, not mid-glide. */
        var lastScrollAt = 0;
        window.addEventListener("scroll", function () {
            lastScrollAt = Date.now();
            /* A playing trailer is actively decoding video every frame,
               competing with the scroll compositor for the same thread --
               that's the drag once you try to move past a game you paused
               on. The IntersectionObserver below only tears it down once the
               zone has fully left the viewport, so the decode cost is still
               there fighting you for the entire scroll-away transition.
               Scrolling at all means the user is moving on, not watching
               anymore, so kill playback on the very first scroll event
               instead of waiting for it to scroll out of view. */
            if (currentZone) stop(currentZone);
        }, { passive: true });

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
                /* Hover-intent delay: browsers fire pointerenter/pointerleave
                   when page content scrolls underneath a stationary cursor,
                   not just when the cursor itself moves -- without this delay,
                   scrolling past any trailer zone kicks off a video load+play
                   mid-scroll, causing a stutter at each one. Requiring the
                   pointer to stay put for 150ms filters out the fleeting
                   enter/leave pair a fast scroll produces while staying
                   imperceptible for a real, stationary hover. */
                var hoverTimer = null;
                zone.addEventListener("pointerenter", function () {
                    hoverTimer = window.setTimeout(function armIfSettled() {
                        // still gliding from momentum scroll -- wait for it
                        // to actually stop before committing to playback
                        if (Date.now() - lastScrollAt < 150) {
                            hoverTimer = window.setTimeout(armIfSettled, 100);
                            return;
                        }
                        hoverTimer = null;
                        armAndPlay(zone);
                    }, 150);
                });
                zone.addEventListener("pointerleave", function () {
                    if (hoverTimer) {
                        window.clearTimeout(hoverTimer);
                        hoverTimer = null;
                        return;
                    }
                    stop(zone);
                });
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

    /* ----- Click-to-play YouTube trailers -----
       A couple of entries link out to a YouTube trailer instead of a locally
       hosted clip. Hover-preview doesn't fit those: reloading a fresh iframe
       on every hover-in is heavy compared to swapping a <video> src, and a
       music-driven trailer deserves audible playback rather than the local
       clips' muted loop -- so these are click-to-play instead. The poster
       stays a static image (zero iframe, zero request) until clicked, at
       which point it's swapped for a youtube-nocookie iframe that autoplays;
       the click itself is the user gesture browsers require to allow
       autoplay with sound. */
    var youtubeZones = document.querySelectorAll(".hv2-gp-video[data-youtube-id]");

    youtubeZones.forEach(function (zone) {
        zone.addEventListener("click", function () {
            if (zone.classList.contains("is-playing")) return;

            var id = zone.getAttribute("data-youtube-id");
            var iframe = document.createElement("iframe");
            iframe.className = "hv2-gp-video__frame";
            iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
            iframe.title = "YouTube trailer";
            iframe.frameBorder = "0";
            iframe.allow = "autoplay; encrypted-media; picture-in-picture";
            iframe.allowFullscreen = true;

            zone.appendChild(iframe);
            zone.classList.add("is-playing");
        });
    });

    /* ----- Chromatic star placement: one small star in the gap between
       each pair of .hv2-gp-entry cards, plus a large star bookending the
       top/bottom of every .hv2-gp-year section. Shapes are picked at
       random from a curated pool of hand-authored SVGs (static/images/
       decor/) rather than generated procedurally -- a JS star-path
       generator was prototyped and compared side-by-side against these by
       hand first; the hand-authored shapes read as deliberate, irregular
       gestures where the generator read as "a" spiky star rather than
       "this" spiky star, so the curated pool won out. Ambient spin is
       driven by GSAP, vendored in specifically for this feature. Pop-in on
       scroll is IntersectionObserver-driven (each star fades/scales in the
       first time it enters the viewport), NOT GSAP ScrollTrigger -- an
       earlier ScrollTrigger-based version of this same pop-in recalculated
       pixel-offset triggers as the ~40 dynamically-inserted stars and
       lazy-loading media shifted document height, which made the page's
       scroll feel like it was fighting the user. IO has no pixel-offset
       state to go stale, so it doesn't share that failure mode. Guarded
       against the vendor script failing to load, same posture as the
       tsParticles block below. */
    var SMALL_STARS = [
        "sparkle-chroma-b.svg",
        "sparkle-chroma-c.svg",
        "sparkle-chroma-e.svg",
        "sparkle-chroma-i.svg"
    ];
    var LARGE_STARS = [
        "star-glow-chroma-a.svg",
        "star-glow-chroma-d.svg",
        "star-glow-chroma-f.svg",
        "star-glow-chroma-g.svg",
        "star-glow-chroma-h.svg"
    ];
    // natural width/height per curated file, so each <img> keeps its true
    // silhouette instead of being squashed by the --small/--large clamp
    // Ratios reflect each file's padded viewBox (extra transparent margin
    // added around the artwork so its Gaussian-blur glow has room to fade
    // out before hitting the SVG's edge -- <img>-embedded SVGs are always
    // clipped to their viewBox, regardless of the internal filter's own
    // overflow="visible", so that padding has to live in the viewBox itself).
    var STAR_ASPECT = {
        "star-glow-chroma-a.svg": 384.104 / 542.93,
        "sparkle-chroma-b.svg": 125.14 / 125.15,
        "sparkle-chroma-c.svg": 188.845 / 192.233,
        "star-glow-chroma-d.svg": 605 / 529,
        "sparkle-chroma-e.svg": 1,
        "star-glow-chroma-f.svg": 505.37 / 714.31,
        "star-glow-chroma-g.svg": 462.02 / 629.62,
        "star-glow-chroma-h.svg": 553.507 / 629.62,
        "sparkle-chroma-i.svg": 1
    };

    if (window.gsap) {
        var starRevealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                gsap.to(entry.target, {
                    opacity: 0.6,
                    scale: 1,
                    y: 0,
                    duration: 0.6,
                    delay: parseFloat(entry.target.dataset.fallDelay) || 0,
                    ease: "back.out(1.2)"
                });
                starRevealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });

        var pickRandom = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

        var makeStar = function (sizeClass, side, topPct) {
            var pool = sizeClass === "small" ? SMALL_STARS : LARGE_STARS;
            var file = pickRandom(pool);
            var img = document.createElement("img");
            img.className = "hv2-gp-anchor hv2-gp-anchor--" + sizeClass;
            img.src = "static/images/decor/" + file;
            img.alt = "";
            img.setAttribute("aria-hidden", "true");
            img.style.aspectRatio = String(STAR_ASPECT[file]);
            img.style.top = topPct + "%";
            // random small jitter off the chosen edge so repeated instances
            // down a long section don't all line up at the same inset
            img.style[side] = (Math.random() * 6 - 2).toFixed(1) + "%";
            return img;
        };

        var placeStars = function () {
            document.querySelectorAll(".hv2-gp-year").forEach(function (section) {
                var entries = section.querySelectorAll(".hv2-gp-entry");
                if (!entries.length) return;

                var stars = [];

                // bookend: one large star just above the first entry, one
                // just past the last -- anchored to the entries themselves
                // rather than a fixed % of the section, since the section
                // also contains the year heading up top (a fixed -4% landed
                // squarely on top of the heading text on short sections)
                var firstEntry = entries[0];
                var lastEntry = entries[entries.length - 1];
                var firstTopPct = (firstEntry.offsetTop / section.offsetHeight) * 100;
                var lastBottomPct = ((lastEntry.offsetTop + lastEntry.offsetHeight) / section.offsetHeight) * 100;

                var topStar = makeStar("large", Math.random() < 0.5 ? "left" : "right", Math.max(2, firstTopPct - 14));
                // always the right side: the next section's heading sits at
                // the top-left immediately below, so anchoring here on the
                // left risks landing right on top of that text
                var bottomStar = makeStar("large", "right", Math.min(lastBottomPct - 12, 88));
                section.appendChild(topStar);
                section.appendChild(bottomStar);
                stars.push(topStar, bottomStar);

                // one small star in the gap after every entry but the last,
                // on whichever side isn't occupied by that card's media
                // block (.hv2-gp-entry--reverse flips which side that is)
                entries.forEach(function (entry, i) {
                    if (i === entries.length - 1) return;
                    var side = entry.classList.contains("hv2-gp-entry--reverse") ? "left" : "right";
                    var entryBottomPct = ((entry.offsetTop + entry.offsetHeight) / section.offsetHeight) * 100;
                    var star = makeStar("small", side, entryBottomPct - 3 + (Math.random() * 4 - 2));
                    section.appendChild(star);
                    stars.push(star);
                });

                // sort top-to-bottom by placed position so the cascade
                // delay below reads as real visual order, not creation
                // order (bottomStar is pushed right after topStar, ahead
                // of the in-between gap stars)
                stars.sort(function (a, b) {
                    return parseFloat(a.style.top) - parseFloat(b.style.top);
                });

                stars.forEach(function (star, i) {
                    if (reduceMotion) {
                        gsap.set(star, { opacity: 0.6, scale: 1, y: 0 });
                        return;
                    }

                    star.dataset.fallDelay = Math.min(i, 5) * 0.08;

                    gsap.set(star, { opacity: 0, scale: 0.5, y: -40 });
                    starRevealObserver.observe(star);
                });
            });
        };

        placeStars();
    }

    /* ----- Scroll-appear entrance reveals: game entries, year headings, and
       museum pieces fade + rise into place the first time they enter the
       viewport. IntersectionObserver-driven for the same reason as the star
       pop-in above (see that comment) -- nothing here depends on a
       precomputed pixel offset, so there's no trigger-position state that
       can go stale as content loads in and shifts document height. Reduced
       motion: skip straight to the final state, no observer, no animation. */
    if (window.gsap) {
        var revealOnScroll = function (el, opts) {
            opts = opts || {};
            var y = opts.y || 24;
            var duration = opts.duration || 0.7;
            var delay = opts.delay || 0;

            if (reduceMotion) {
                gsap.set(el, { opacity: 1, y: 0 });
                return;
            }

            gsap.set(el, { opacity: 0, y: y });

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    gsap.to(entry.target, {
                        opacity: 1,
                        y: 0,
                        duration: duration,
                        delay: delay,
                        ease: "power3.out"
                    });
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

            observer.observe(el);
        };

        document.querySelectorAll(".hv2-gp-entry").forEach(function (entry) {
            revealOnScroll(entry, { y: 28, duration: 0.7 });
        });

        document.querySelectorAll(".hv2-gp-year__heading").forEach(function (heading) {
            revealOnScroll(heading, { y: 16, duration: 0.6 });
        });

        // light stagger, capped so a long row of museum pieces doesn't push
        // the last few items' reveal delay out too far
        document.querySelectorAll(".hv2-gp-museum__piece").forEach(function (piece, i) {
            revealOnScroll(piece, { y: 20, duration: 0.6, delay: Math.min(i, 6) * 0.05 });
        });
    }

    /* ----- Hero entrance: fades/rises in once on load, not scroll-triggered
       -- it's the first thing visible when the page opens, not something
       scrolled to. */
    if (window.gsap && !reduceMotion) {
        var heroReveal = [
            document.querySelector(".hv2-gp-hero__title"),
            document.querySelector(".hv2-gp-hero__intro")
        ].filter(Boolean);

        if (heroReveal.length) {
            gsap.set(heroReveal, { opacity: 0, y: 16 });
            gsap.to(heroReveal, {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: "power3.out",
                stagger: 0.08
            });
        }
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
