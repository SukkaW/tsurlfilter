import { analyzeSelector, fastAnalyzeSelector } from '../../../src/rules/css/selector-analyzer';

/**
 * Helper function to check the result of selector analysis
 *
 * @param selector Selector to analyze
 * @param isExtendedCss Is selector Extended CSS selector
 * @param unsupportedPseudoClasses Which pseudo-classes are unsupported
 * @param unsupportedAttributeSelectors Which attribute selectors are unsupported
 */
const check = (
    selector: string,
    isExtendedCss: boolean,
    unsupportedPseudoClasses: string[],
    unsupportedAttributeSelectors: string[],
) => {
    // Test full-fledged selector analysis
    const result = analyzeSelector(selector);

    expect(result.isExtendedCss).toBe(isExtendedCss);
    expect(result.unsupportedPseudoClasses).toEqual(unsupportedPseudoClasses);
    expect(result.unsupportedAttributeSelectors).toEqual(unsupportedAttributeSelectors);

    // Test "fast" selector analysis
    if (unsupportedAttributeSelectors.length > 0 || unsupportedPseudoClasses.length > 0) {
        expect(() => fastAnalyzeSelector(selector)).toThrow(/^Unsupported/);
    } else {
        expect(fastAnalyzeSelector(selector)).toBe(isExtendedCss);
    }
};

describe('CSS selector analyzer', () => {
    describe('should work for supported selectors', () => {
        test.each([
            // Should handle regular CSS selectors
            ['div', false, [], []],
            ['div + p', false, [], []],
            ['div > p', false, [], []],
            ['div ~ p', false, [], []],

            ['a:active', false, [], []],
            ['a:focus', false, [], []],
            ['a:hover', false, [], []],
            ['a:link', false, [], []],
            ['a:visited', false, [], []],

            ['input:checked', false, [], []],
            ['input:disabled', false, [], []],
            ['input:enabled', false, [], []],
            ['input:in-range', false, [], []],
            ['input:optional', false, [], []],
            ['input:out-of-range', false, [], []],
            ['input:read-only', false, [], []],
            ['input:read-write', false, [], []],
            ['input:required', false, [], []],

            [':empty', false, [], []],
            [':lang(en)', false, [], []],
            [':root', false, [], []],
            [':target', false, [], []],

            ['.target:first-child', false, [], []],
            ['.target:last-child', false, [], []],
            ['.target:nth-child(1)', false, [], []],
            ['.target:nth-child(2n+1)', false, [], []],
            ['.target:nth-last-child(1)', false, [], []],
            ['.target:nth-last-child(2n+1)', false, [], []],
            ['.target:only-child', false, [], []],

            ['.target:first-of-type', false, [], []],
            ['.target:last-of-type', false, [], []],
            ['.target:nth-last-of-type(1)', false, [], []],
            ['.target:nth-last-of-type(2n+1)', false, [], []],
            ['.target:nth-of-type(1)', false, [], []],
            ['.target:nth-of-type(2n+1)', false, [], []],
            ['.target:only-of-type', false, [], []],

            ['.target:not(a)', false, [], []],
            ['.target:where(a)', false, [], []],

            // Should handle Extended CSS selectors
            ['.target:-abp-contains(a)', true, [], []],
            ['.target:-abp-has(a)', true, [], []],
            ['.target:contains(a)', true, [], []],
            ['.target:has(a)', true, [], []],
            ['.target:has-text(a)', true, [], []],
            ['.target:if(a)', true, [], []],
            ['.target:if-not(a)', true, [], []],
            ['.target:matches-attr("a-*"="b")', true, [], []],
            ['.target:matches-css(before, a: /b/)', true, [], []],
            ['.target:matches-property(a.b)', true, [], []],
            ['.target:nth-ancestor(1)', true, [], []],
            ['.target:remove()', true, [], []],
            ['.target:upward(1)', true, [], []],
            ['.target:upward(a[b])', true, [], []],
            ['.target:xpath(//*[@class="inner"]/..)', true, [], []],

            // Should handle legacy Extended CSS selectors
            ['.target[-ext-contains="a"]', true, [], []],
            ['.target[-ext-has-text="a"]', true, [], []],
            ['.target[-ext-has="a"]', true, [], []],
            ['.target[-ext-matches-css-after="a: b"]', true, [], []],
            ['.target[-ext-matches-css-before="a: b"]', true, [], []],
            ['.target[-ext-matches-css="a: b"]', true, [], []],

            // Should handle combined Extended CSS elements
            ['.target:-abp-contains(a):-abp-has(a)', true, [], []],
            ['.target:contains(a):has(a)', true, [], []],
            ['.target:if(a):if-not(b)', true, [], []],

            // Should handle regular CSS selector lists
            ['div, a:hover', false, [], []],

            // Should handle Extended CSS selector lists
            ['[a="b"], a:contains(a)', true, [], []],
            ['[a="b"], a:has(a)', true, [], []],
            ['[a="b"], a[-ext-contains="a"]', true, [], []],
        ])('should work for %s', check);
    });

    describe('should detect unsupported selectors', () => {
        test.each([
            // Should detect unsupported pseudo-classes
            ['div:foo', false, ['foo'], []],
            ['div:foo():bar(a)', false, ['foo', 'bar'], []],
            ['div:foo(a)', false, ['foo'], []],
            ['div:foo(a):bar', false, ['foo', 'bar'], []],
            ['div:foo:bar', false, ['foo', 'bar'], []],
            ['div:foo:bar(a)', false, ['foo', 'bar'], []],

            // Should detect unsupported legacy Extended CSS selectors
            ['[-ext-foo="bar"]', true, [], ['-ext-foo']],
            ['[-ext-foo="bar"][b=c]', true, [], ['-ext-foo']],

            // Should detect combined case
            ['div:foo(a):bar, [-ext-foo="bar"]', true, ['foo', 'bar'], ['-ext-foo']],
        ])('should work for %s', check);
    });
});
