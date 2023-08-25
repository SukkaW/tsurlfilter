/**
 * @file CSS selector analyzer functions
 */

import { CssTreeNodeType } from '@adguard/agtree';
import {
    CssNode,
    CssNodePlain,
    SelectorList,
    SelectorListPlain,
    find,
    fromPlainObject,
    walk,
} from '@adguard/ecss-tree';
import { isString } from '../../utils/string-utils';
import {
    EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX,
    SUPPORTED_CSS_PSEUDO_CLASSES,
    SUPPORTED_EXT_CSS_ATTRIBUTE_SELECTORS,
    SUPPORTED_EXT_CSS_PSEUDO_CLASSES,
} from './supported-elements';
import { BACKSLASH } from '../../common/constants';
import { getErrorMessage } from '../../common/error';

/**
 * Result of selector analysis
 */
export interface SelectorValidationResult {
    /**
     * `true` if selector is valid, `false` otherwise
     */
    isValid: boolean;

    /**
     * `true` if selector is Extended CSS selector, `false` otherwise
     */
    isExtendedCss: boolean;

    /**
     * Error message if selector is not valid
     */
    errorMessage?: string;
}

/**
 * Converts a CSSTree node to a linked list based CSSTree node,
 * if it is not already in this format.
 *
 * @param node Node to convert
 * @returns Linked list based CSSTree node
 */
function getCssNode(node: CssNode | CssNodePlain): CssNode {
    // Convert the node from plain object to a linked list based node
    // We need to clone the node, because fromPlainObject mutates the object
    return fromPlainObject({ ...node } as CssNodePlain) as CssNode;
}

/**
 * Validates a CSS selector list. Checks for unsupported pseudo-classes and attribute selectors,
 * and determines if the selector is an Extended CSS selector.
 *
 * @param selectorList Selector list to validate
 * @returns Validation result, see {@link SelectorValidationResult}
 */
export function validateSelectorList(selectorList: SelectorListPlain): SelectorValidationResult {
    // Prepare result object
    const result: SelectorValidationResult = {
        isValid: true,
        isExtendedCss: false,
    };

    try {
        const selectorListAst = getCssNode(selectorList) as SelectorList;

        // TODO: CSSTree types should be improved, as a workaround we use `any` here
        walk(selectorListAst as any, (node) => {
            if (node.type === CssTreeNodeType.PseudoClassSelector) {
                if (SUPPORTED_EXT_CSS_PSEUDO_CLASSES.has(node.name)) {
                    result.isExtendedCss = true;
                    return;
                }

                if (!SUPPORTED_CSS_PSEUDO_CLASSES.has(node.name)) {
                    throw new Error(`Unsupported pseudo-class: ':${node.name}'`);
                }
            } else if (node.type === CssTreeNodeType.AttributeSelector) {
                if (node.name.name.startsWith(EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX)) {
                    if (!result.isExtendedCss) {
                        result.isExtendedCss = true;
                    }

                    if (!SUPPORTED_EXT_CSS_ATTRIBUTE_SELECTORS.has(node.name.name)) {
                        throw new Error(`Unsupported Extended CSS attribute selector: '${node.name.name}'`);
                    }
                }
            }
        });
    } catch (error: unknown) {
        result.isValid = false;
        result.errorMessage = getErrorMessage(error);
    }

    return result;
}

/**
 * Check if a CSSTree node contains any string value that contains backslash.
 * We need this function to omit CSS injection rules which contain backslash
 * in the declaration block.
 *
 * @param nodeToCheck CSSTree node to check
 * @returns `true` if node contains any string value that contains backslash, `false` otherwise
 * @see {@link https://github.com/csstree/csstree/blob/master/docs/ast.md}
 */
export function hasValueWithBackslash(nodeToCheck: CssNode | CssNodePlain): boolean {
    return find(getCssNode(nodeToCheck), (node) => {
        for (const value of Object.values(node)) {
            if (isString(value) && value.includes(BACKSLASH)) {
                return true;
            }
        }

        return false;
    }) !== null;
}
