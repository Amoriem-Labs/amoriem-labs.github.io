document.addEventListener("DOMContentLoaded", function () {
    /* ----- Timeline star pop-in -----
       Same IntersectionObserver + GSAP approach as the games page's
       chromatic anchor stars (games-new.js) -- no ScrollTrigger, see that
       file's comment for why: pixel-offset triggers fighting the user's
       scroll as content shifts document height. These 3 stars are fixed
       timeline markers (not dynamically placed), so they pop to full
       opacity (not the ambient 0.6 used by the games page's background
       stars) once their section scrolls into view. */
    var stars = document.querySelectorAll(".hv2-about-timeline__star");
    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (stars.length && window.gsap) {
        if (reduceMotion) {
            gsap.set(stars, { opacity: 1, scale: 1, y: 0 });
        } else {
            gsap.set(stars, { opacity: 0, scale: 0.5, y: -30 });

            var starObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    gsap.to(entry.target, {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        duration: 0.7,
                        ease: "back.out(1.4)"
                    });
                    starObserver.unobserve(entry.target);
                });
            }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

            stars.forEach(function (star) {
                starObserver.observe(star);
            });
        }
    }

    /* ----- Timeline rail: scroll-scrubbed progress fill -----
       A continuous 0-1 fraction, not a one-time reveal trigger, so this
       reads getBoundingClientRect() fresh on every scroll frame rather
       than caching a pixel offset up front -- there's no stale-trigger
       problem to worry about (the thing that ruled out ScrollTrigger for
       the star pop-ins above), since the fraction is always recomputed
       live against the timeline's actual current position. rAF-throttled
       so it costs at most one layout read per frame while scrolling. */
    var timeline = document.querySelector(".hv2-about-timeline");
    if (timeline) {
        var ticking = false;

        var updateProgress = function () {
            var rect = timeline.getBoundingClientRect();
            var progress = (window.innerHeight * 0.5 - rect.top) / rect.height;
            progress = Math.min(1, Math.max(0, progress));
            timeline.style.setProperty("--hv2-about-progress", progress.toFixed(4));
            ticking = false;
        };

        var onScroll = function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(updateProgress);
        };

        updateProgress();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", updateProgress);
    }
});
