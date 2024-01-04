/**
 * @file CSS identifier decoder.
 */

import { MAX_HEX_DIGITS } from '../algorithms/consumers/escaped-code-point';
import { isHexDigit, isWhitespace } from '../algorithms/definitions';
import { CodePoint } from '../common/enums/code-points';

const EMPTY_STRING = '';

/**
 * Decodes a CSS identifier according to the CSS Syntax Module Level 3 specification.
 *
 * @param ident CSS identifier to decode.
 * @returns Decoded CSS identifier.
 */
export const decodeIdent = (ident: string): string => {
    const decodedIdent: string[] = [];

    for (let i = 0; i < ident.length; i += 1) {
        const codePoint = ident.charCodeAt(i);

        // 4.3.7. Consume an escaped code point
        // https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point
        if (codePoint === CodePoint.ReverseSolidus) {
            if (isHexDigit(ident.charCodeAt(i + 1))) {
                let hex = 0;
                let j = 0; // consumed hex digits

                while (j < MAX_HEX_DIGITS && isHexDigit(ident.charCodeAt(i + j + 1))) {
                    hex = hex * 16 + parseInt(ident[i + j + 1], 16);
                    j += 1;
                }

                decodedIdent.push(
                    String.fromCodePoint(
                        hex === 0
                            || (hex >= CodePoint.HighSurrogateStart && hex <= CodePoint.HighSurrogateEnd)
                            || hex > CodePoint.MaxCodePoint
                            ? CodePoint.ReplacementCharacter
                            : hex,
                    ),
                );

                i += j;

                // according to the spec, if the next code point after the escape sequence is whitespace,
                // it should be consumed too
                const nextCodePoint = ident.charCodeAt(i + 1);
                if (isWhitespace(nextCodePoint)) {
                    // consume 2 code points for CRLF sequence and 1 code point for any other whitespace character
                    i += nextCodePoint === CodePoint.CarriageReturn
                        && ident.charCodeAt(i + 2) === CodePoint.LineFeed
                        ? 2
                        : 1;
                }
            }

            // do nothing for EOF
        } else {
            decodedIdent.push(ident[i]);
        }
    }

    return decodedIdent.join(EMPTY_STRING);
};
