import { CosmeticRule } from '@adguard/tsurlfilter';

// TODO: Move to common
/**
 * CosmeticApi contains logic about building css for hiding elements.
 */
export class CosmeticApi {
    private static readonly LINE_BREAK = '\r\n';

    /*
     * Number of selectors in grouped selector list.
     */
    private static readonly CSS_SELECTORS_PER_LINE = 50;

    /**
     * Builds stylesheet from rules.
     *
     * @param elemhideRules List of cosmetic hiding rules.
     * @param injectRules List of cosmetic inject rules.
     * @param groupElemhideSelectors Whether Elemhide selector grouping
     * is necessary.
     *
     * @returns List of string rules.
     */
    public static buildStyleSheet(
        elemhideRules: CosmeticRule[],
        injectRules: CosmeticRule[],
        groupElemhideSelectors: boolean,
    ): string[] {
        const styles = [];

        const elemHideStyles = CosmeticApi.buildElemhideStyles(elemhideRules, groupElemhideSelectors);
        if (elemHideStyles.length > 0) {
            if (groupElemhideSelectors) {
                styles.push(elemHideStyles.join(CosmeticApi.LINE_BREAK));
            } else {
                styles.push(...elemHideStyles);
            }
        }

        const cssStyles = injectRules.map((x: CosmeticRule) => x.getContent());
        if (cssStyles.length > 0) {
            if (groupElemhideSelectors) {
                styles.push(cssStyles.join(CosmeticApi.LINE_BREAK));
            } else {
                styles.push(...cssStyles);
            }
        }

        return styles;
    }

    /**
     * Builds element hiding stylesheet from rules.
     * If `groupElemhideSelectors` is set,
     * selector are to be combined into selector lists of {@link CosmeticApi.CSS_SELECTORS_PER_LINE}.
     *
     * @param elemhideRules List of elemhide rules.
     * @param groupElemhideSelectors Flag for elemhide selectors grouping.
     *
     * @returns Array of styles.
     */
    private static buildElemhideStyles(
        elemhideRules: CosmeticRule[],
        groupElemhideSelectors: boolean,
    ): string[] {
        // TODO: refactor constants as ELEMHIDE_CSS_STYLE and ELEMHIDE_HIT_START are duplicates partly
        const ELEMHIDE_CSS_STYLE = ' { display: none !important; }';

        const elemhideSelectors = [];

        for (const selector of elemhideRules) {
            elemhideSelectors.push(selector.getContent());
        }

        // if selector should not be grouped,
        // add element hiding style to each of them
        if (!groupElemhideSelectors) {
            return elemhideSelectors.map((selector) => {
                return `${selector}${ELEMHIDE_CSS_STYLE}`;
            });
        }

        // otherwise selectors should be grouped into selector lists
        const elemhideStyles = [];
        for (let i = 0; i < elemhideSelectors.length; i += CosmeticApi.CSS_SELECTORS_PER_LINE) {
            const selectorList = elemhideSelectors
                .slice(i, i + CosmeticApi.CSS_SELECTORS_PER_LINE)
                .join(', ');
            elemhideStyles.push(`${selectorList}${ELEMHIDE_CSS_STYLE}`);
        }
        return elemhideStyles;
    }
}
