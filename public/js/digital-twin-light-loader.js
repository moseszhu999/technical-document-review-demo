(() => {
    const id = 'digital-twin-light-theme';
    let link = document.getElementById(id);

    if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = '/css/digital-twin-light.css?v=20260915-1';
        document.head.appendChild(link);
    }

    const keepLightThemeLast = () => {
        if (document.head.lastElementChild !== link) {
            document.head.appendChild(link);
        }
    };

    const observer = new MutationObserver(() => keepLightThemeLast());
    observer.observe(document.head, {childList: true});

    window.addEventListener('load', keepLightThemeLast, {once: true});
})();
