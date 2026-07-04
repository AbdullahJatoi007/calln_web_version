/* js/adsterra-banner.js — responsive Adsterra banners (auto-fit to viewport) */
(function () {
    'use strict';

    var isMobile = window.matchMedia('(max-width: 600px)').matches;
    var INVOKE_HOST = 'www.highperformanceformat.com';

    var SLOTS = [
        {
            mountId: 'adsterra-slot',        // footer banner
            mobileKey: 'aa09b9d4f5c2baa63c013eef40d9102f',
            mobileW: 320,
            mobileH: 50,
            desktopKey: '2cfb78acae893bb5a22b234735d002ba',
            desktopW: 300,
            desktopH: 250
        },
        {
            mountId: 'adsterra-slot-mid',     // below "Everything Calln Offers"
            mobileKey: 'a7c16f559664197b9f4f0051d6ba01ed',
            mobileW: 468,
            mobileH: 60,
            desktopKey: '7b54505bbb7cfe54722207c2c94f83a7',
            desktopW: 728,
            desktopH: 90
        },
        {
            mountId: 'adsterra-slot-bottom',  // above the footer
            mobileKey: '60d6f315d75f035f78032ddeb43af65c',
            mobileW: 160,
            mobileH: 300,
            desktopKey: '60d6f315d75f035f78032ddeb43af65c', // same key/size for both
            desktopW: 160,
            desktopH: 300
        }
    ];

    function mountAd(slot) {
        var mount = document.getElementById(slot.mountId);
        if (!mount) return;

        var unit;
        if (isMobile) {
            if (!slot.mobileKey) return;
            unit = { key: slot.mobileKey, w: slot.mobileW || 320, h: slot.mobileH || 50 };
        } else {
            unit = { key: slot.desktopKey, w: slot.desktopW || 300, h: slot.desktopH || 250 };
        }

        var available = Math.min(unit.w, window.innerWidth - 32);
        var scale = available / unit.w;
        var scaledH = unit.h * scale;

        mount.style.width  = available + 'px';
        mount.style.height = scaledH + 'px';
        mount.style.overflow = 'hidden';
        mount.style.margin = '0 auto';

        var iframe = document.createElement('iframe');
        iframe.width = unit.w;
        iframe.height = unit.h;
        iframe.scrolling = 'no';
        iframe.frameBorder = '0';
        iframe.style.border = '0';
        iframe.style.display = 'block';
        iframe.style.transform = 'scale(' + scale + ')';
        iframe.style.transformOrigin = 'top left';
        iframe.setAttribute('aria-label', 'Advertisement');

        iframe.srcdoc =
            '<!DOCTYPE html><html><head><meta charset="utf-8">' +
            '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style>' +
            '</head><body>' +
            '<script type="text/javascript">' +
                'atOptions = {' +
                    '"key":"' + unit.key + '",' +
                    '"format":"iframe",' +
                    '"height":' + unit.h + ',' +
                    '"width":' + unit.w + ',' +
                    '"params":{}' +
                '};' +
            '<\/script>' +
            '<script type="text/javascript" src="//' + INVOKE_HOST + '/' + unit.key + '/invoke.js"><\/script>' +
            '</body></html>';

        mount.appendChild(iframe);
    }

    SLOTS.forEach(mountAd);
})();