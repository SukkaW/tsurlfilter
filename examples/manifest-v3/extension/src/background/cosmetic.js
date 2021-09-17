/* eslint-disable no-console, no-undef, import/extensions */
/**
 * Applies scripts from cosmetic result
 *
 * @param tabId
 * @param cosmeticResult
 */
export const applyScripts = (tabId, cosmeticResult) => {
    const cosmeticRules = cosmeticResult.getScriptRules();
    if (cosmeticRules.length === 0) {
        return;
    }

    const scriptsCode = cosmeticRules.map((x) => x.script).join('\r\n');
    console.log(scriptsCode);

    chrome.tabs.sendMessage(tabId, {
        type: 'injectPageScript',
        payload: scriptsCode,
    });
};

/**
 * Urlencodes rule text.
 *
 * @param ruleText
 * @return {string}
 */
const escapeRule = (ruleText) => encodeURIComponent(ruleText)
    .replace(/['()]/g, (match) => ({
        "'": '%27',
        '(': '%28',
        ')': '%29',
    }[match]));

/**
 * Creates rules style string
 *
 * @param rule
 * @param addMarker
 * @return {string}
 */
const createRuleStyle = (rule, addMarker) => {
    let contentMarker = '';
    if (addMarker) {
        // eslint-disable-next-line max-len
        contentMarker = ` content: 'adguard${rule.getFilterListId()}${encodeURIComponent(';')}${escapeRule(rule.getText())}' !important;`;
    }

    return `${rule.getContent()} { display: none!important;${contentMarker}}`;
};

/**
 * Creates rules style string
 *
 * @param rule
 * @param addMarker
 * @return {string}
 */
const createInjectRuleStyle = (rule, addMarker) => {
    let contentMarker = '';
    if (addMarker) {
        // eslint-disable-next-line max-len
        contentMarker = ` content: 'adguard${rule.getFilterListId()}${encodeURIComponent(';')}${escapeRule(rule.getText())}' !important;`;
    }

    const content = rule.getContent()
        .trim();
    if (content.endsWith('}')) {
        return `${content.substr(0, content.length - 1)}${contentMarker}}`;
    }

    return content;
};

/**
 * Applies css from cosmetic result
 *
 * Patches rule selector adding adguard mark rule info in the content attribute
 * Example:
 * .selector -> .selector { content: 'adguard{filterId};{ruleText} !important;}
 *
 * @param tabId
 * @param cosmeticResult
 */
export const applyCss = (tabId, cosmeticResult) => {
    const ADD_CSS_HITS_MARKER = true;

    const elemhideCss = [...cosmeticResult.elementHiding.generic, ...cosmeticResult.elementHiding.specific]
        .map((x) => createRuleStyle(x, ADD_CSS_HITS_MARKER));

    const injectCss = [...cosmeticResult.CSS.generic, ...cosmeticResult.CSS.specific]
        .map((x) => createInjectRuleStyle(x, ADD_CSS_HITS_MARKER));

    const elemhideExtendedCssStylesheets = [
        ...cosmeticResult.elementHiding.genericExtCss,
        ...cosmeticResult.elementHiding.specificExtCss,
    ]
        .map((x) => createRuleStyle(x, ADD_CSS_HITS_MARKER)
            .replace('\\', '\\\\'));

    const injectExtendedCssStylesheets = [
        ...cosmeticResult.CSS.genericExtCss,
        ...cosmeticResult.CSS.specificExtCss,
    ]
        .map((x) => createInjectRuleStyle(x, ADD_CSS_HITS_MARKER)
            .replace('\\', '\\\\'));

    const extendedCssStylesheets = [...elemhideExtendedCssStylesheets, ...injectExtendedCssStylesheets].join('\n');

    chrome.tabs.sendMessage(tabId, {
        type: 'initCssHitsCounter',
        payload: extendedCssStylesheets,
    });

    // Apply css
    const styleText = [...elemhideCss, ...injectCss].join('\n');
    chrome.scripting.insertCSS(
        {
            target: { tabId },
            css: styleText,
        },
    );
};
