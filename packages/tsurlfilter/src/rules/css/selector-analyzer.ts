/**
 * @file CSS selector analyzer functions
 */

import { CssTree, CssTreeNodeType, CssTreeParserContext } from '@adguard/agtree';
import {
    List,
    SelectorList,
    SelectorListPlain,
    toPlainObject,
    walk,
} from '@adguard/ecss-tree';
import { isString } from '../../utils/string-utils';
import {
    EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX,
    SUPPORTED_CSS_PSEUDO_CLASSES,
    SUPPORTED_EXT_CSS_ATTRIBUTE_SELECTORS,
    SUPPORTED_EXT_CSS_PSEUDO_CLASSES,
} from './supported-elements';

/**
 * Result of selector analysis
 */
export interface SelectorAnalysis {
    isExtendedCss: boolean;
    unsupportedPseudoClasses: string[];
    unsupportedAttributeSelectors: string[];
}

/**
 * Helper function to get a plain selector AST from any selector format
 *
 * @param selector Selector in any format
 * @returns Selector AST
 * @throws {Error} If the provided input is not a selector
 * @todo Need to improve CSSTree typings to avoid type casting
 */
export function getSelectorListAst(selectorList: string | SelectorList | SelectorListPlain): SelectorListPlain {
    // If selector is a string, parse it
    if (isString(selectorList)) {
        return CssTree.parsePlain(selectorList, CssTreeParserContext.selectorList) as SelectorListPlain;
    }

    if (selectorList.type !== CssTreeNodeType.SelectorList) {
        throw new Error('It seems that provided input is not a selector');
    }

    // Convert SelectorList to SelectorListPlain
    if (selectorList.children instanceof List) {
        return toPlainObject(selectorList as SelectorList) as SelectorListPlain;
    }

    // If selector is already in SelectorPlain format, just return it
    return selectorList as SelectorListPlain;
}

/**
 * Analyze selector to determine if it is Extended CSS selector and if it contains unsupported pseudo-classes
 * or attribute selectors.
 *
 * @param selector Selector to analyze
 * @returns Selector analysis result object
 */
export function analyzeSelector(selectorList: string | SelectorList | SelectorListPlain): SelectorAnalysis {
    // Prepare a result object with the default analysis state
    const result: SelectorAnalysis = {
        isExtendedCss: false,
        unsupportedPseudoClasses: [],
        unsupportedAttributeSelectors: [],
    };

    const selectorListAst = getSelectorListAst(selectorList);

    // TODO: CSSTree types should be improved, as a workaround we use `any` here
    walk(selectorListAst as any, (node) => {
        if (node.type === CssTreeNodeType.PseudoClassSelector) {
            if (SUPPORTED_EXT_CSS_PSEUDO_CLASSES.has(node.name)) {
                result.isExtendedCss = true;
                return;
            }

            if (!SUPPORTED_CSS_PSEUDO_CLASSES.has(node.name)) {
                result.unsupportedPseudoClasses.push(node.name);
            }
        } else if (node.type === CssTreeNodeType.AttributeSelector) {
            if (node.name.name.startsWith(EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX)) {
                if (!result.isExtendedCss) {
                    result.isExtendedCss = true;
                }

                if (!SUPPORTED_EXT_CSS_ATTRIBUTE_SELECTORS.has(node.name.name)) {
                    result.unsupportedAttributeSelectors.push(node.name.name);
                }
            }
        }
    });

    return result;
}

/**
 * Analyze selector to determine if it is Extended CSS selector and if it contains unsupported pseudo-classes
 * or attribute selectors. The difference from `analyzeSelector` is that this function stops analysis as soon as
 * it finds the first unsupported pseudo-class or attribute selector.
 *
 * @param selector Selector to analyze
 * @returns `true` if selector is Extended CSS selector, `false` otherwise
 * @throws {Error} if selector contains unsupported pseudo-classes or attribute selectors
 */
export function fastAnalyzeSelector(selector: string | SelectorList | SelectorListPlain): boolean {
    let isExtendedCss = false;
    const selectorListAst = getSelectorListAst(selector);

    // TODO: CSSTree types should be improved, as a workaround we use `any` here
    walk(selectorListAst as any, (node) => {
        if (node.type === CssTreeNodeType.PseudoClassSelector) {
            if (SUPPORTED_EXT_CSS_PSEUDO_CLASSES.has(node.name)) {
                isExtendedCss = true;
                return;
            }

            if (!SUPPORTED_CSS_PSEUDO_CLASSES.has(node.name)) {
                throw new Error(`Unsupported pseudo-class: ${node.name}`);
            }
        } else if (node.type === CssTreeNodeType.AttributeSelector) {
            if (node.name.name.startsWith(EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX)) {
                if (!isExtendedCss) {
                    isExtendedCss = true;
                }

                if (!SUPPORTED_EXT_CSS_ATTRIBUTE_SELECTORS.has(node.name.name)) {
                    throw new Error(`Unsupported Extended CSS attribute selector: ${node.name.name}`);
                }
            }
        }
    });

    return isExtendedCss;
}
