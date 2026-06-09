/* js/adsterra-banner.js — responsive Adsterra banner (mobile 320x50 / desktop 300x250) */
(function () {
    'use strict';

    // Mobile ≤600px → 320x50 ; larger → 300x250
    var isMobile = window.matchMedia('(max-width: 600px)').matches;

    var unit = isMobile
        ? { key: 'aa09b9d4f5c2baa63c013eef40d9102f', w: 320, h: 50  }
        : { key: '2cfb78acae893bb5a22b234735d002ba', w: 300, h: 250 };

    var INVOKE_HOST = 'www.highperformanceformat.com'; // confirmed from your code

    var mount = document.getElementById('adsterra-slot');
    if (!mount) return;

    mount.style.width  = unit.w + 'px';
    mount.style.height = unit.h + 'px';

    // Isolate the banner in its own iframe so the global `atOptions` of one
    // unit can never clash with the other. srcdoc runs Adsterra in a clean scope.
    var iframe = document.createElement('iframe');
    iframe.width = unit.w;
    iframe.height = unit.h;
    iframe.scrolling = 'no';
    iframe.frameBorder = '0';
    iframe.style.border = '0';
    iframe.style.display = 'block';
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
})();