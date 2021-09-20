/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import TSUrlFilterContentScript from '@adguard/tsurlfilter/dist/TSUrlFilterContentScript';

function initCssHitsCounter() {
    const { CssHitsCounter } = TSUrlFilterContentScript;

    const cssHitsCounter = new CssHitsCounter((stats) => {
        console.log('Css stats ready');
        console.log(stats);

        chrome.runtime.sendMessage({ type: 'saveCssHitStats', stats: JSON.stringify(stats) });
    });

    console.log('CssHitsCounter initialized');

    return cssHitsCounter;
}

export function applyExtendedCss(extendedCssStylesheets) {
    const cssHitsCounter = initCssHitsCounter();

    if (extendedCssStylesheets) {
        // Apply extended css stylesheets
        const { ExtendedCss } = TSUrlFilterContentScript;
        const extendedCssContent = `${extendedCssStylesheets}`;

        const extendedCss = new ExtendedCss({
            styleSheet: extendedCssContent,
            beforeStyleApplied: (el) => {
                return cssHitsCounter.countAffectedByExtendedCss(el);
            },
        });
        extendedCss.apply();

        console.log('Extended css applied');
    }
}
