document.addEventListener("DOMContentLoaded", function () {
    var tabs = document.querySelectorAll(".hv2-events-tab");
    var grids = document.querySelectorAll(".hv2-events-grid");
    if (!tabs.length || !grids.length) return;

    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hasGSAP = !!window.gsap && !reduceMotion;

    var CROSSFADE_S = 0.22;
    var ENTRANCE_S = 0.32;
    var STAGGER_S = 0.05;
    var ENTER_Y = 16;
    var EASE_OUT = "power3.out"; // built-in approximation of the site's --ease-out cubic-bezier(0.23,1,0.32,1)

    function gridFor(filter) {
        return document.querySelector('.hv2-events-grid[data-category="' + filter + '"]');
    }

    function revealCards(grid) {
        if (!hasGSAP) return;
        var cards = grid.querySelectorAll(".hv2-events-card");
        gsap.fromTo(
            cards,
            { opacity: 0, y: ENTER_Y },
            { opacity: 1, y: 0, duration: ENTRANCE_S, ease: EASE_OUT, stagger: STAGGER_S }
        );
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            if (tab.classList.contains("is-active")) return;

            var nextGrid = gridFor(tab.dataset.filter);
            var currentGrid = document.querySelector(".hv2-events-grid:not([hidden])");
            if (!nextGrid || nextGrid === currentGrid) return;

            tabs.forEach(function (b) {
                b.classList.remove("is-active");
                b.setAttribute("aria-selected", "false");
            });
            tab.classList.add("is-active");
            tab.setAttribute("aria-selected", "true");

            if (!hasGSAP || !currentGrid) {
                if (currentGrid) currentGrid.hidden = true;
                nextGrid.hidden = false;
                revealCards(nextGrid);
                return;
            }

            gsap.to(currentGrid, {
                opacity: 0,
                duration: CROSSFADE_S,
                ease: "power1.out",
                onComplete: function () {
                    currentGrid.hidden = true;
                    gsap.set(currentGrid, { opacity: 1 });
                    nextGrid.hidden = false;
                    revealCards(nextGrid);
                },
            });
        });
    });
});
