document.addEventListener("DOMContentLoaded", function () {
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

    /* ----- Club Games gallery pager (4 / 4 / 3 across 11 games) ----- */
    var pages = document.querySelectorAll(".hv2-games__page");
    var pagerBtn = document.querySelector(".hv2-games__pager");

    if (pages.length && pagerBtn) {
        var currentPage = 0;

        pagerBtn.addEventListener("click", function () {
            pages[currentPage].hidden = true;
            currentPage = (currentPage + 1) % pages.length;
            pages[currentPage].hidden = false;
        });
    }

    /* ----- Hero video: single trailer for now, scaffolding for a future rotating loop ----- */
    var ROTATE_TRAILERS = false; // flip to true once multi-trailer rotation is ready to ship

    var HERO_TRAILERS = [
        "static/images/games/trailers/Encore_Demo_Clipped.mp4",
        "static/images/games/trailers/27_Trailer_Clipped.mp4",
        "static/images/games/trailers/Boola_Dash_2026.mp4",
        "static/images/games/trailers/Bulldog_Bash_2026.mp4",
        "static/images/games/trailers/Dungeon_Barista_2026.mp4",
        "static/images/games/trailers/Glyphbound_2026.mp4",
        "static/images/games/trailers/Planet_112_2026.mp4",
        "static/images/games/trailers/Echoes of Eternity Promotional Trailer - Amoriem Labs - Victor Liu (1080p).mp4",
        "static/images/games/trailers/Encore - FreePlayClip 9-2.mp4"
    ];

    var heroVideo = document.querySelector(".hv2-hero__video");

    function cycleHeroTrailer(index) {
        if (!heroVideo) return;
        var next = HERO_TRAILERS[index % HERO_TRAILERS.length];
        heroVideo.src = encodeURI(next);
        heroVideo.load();
        heroVideo.play();
    }

    if (ROTATE_TRAILERS && heroVideo) {
        var trailerIndex = 0;
        heroVideo.addEventListener("ended", function () {
            trailerIndex++;
            cycleHeroTrailer(trailerIndex);
        });
    }
});
