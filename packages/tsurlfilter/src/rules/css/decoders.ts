/**
 * @file CSS identifier decoder
 * @todo Move to @adguard/css-tokenizer
 */

const MAX_HEX_DIGITS = 6;

const EMPTY_STRING = '';

const ESCAPED_CODE_POINT = 0x5c; // \
const CHARACTER_TABULATION = 0x09; // tab
const SPACE = 0x20; // space
const LINE_FEED = 0x0a; // line feed
const FORM_FEED = 0x0c; // form feed
const CARRIAGE_RETURN = 0x0d; // carriage return
const NUMBER_0 = 0x30; // 0
const NUMBER_9 = 0x39; // 9
const LATIN_CAPITAL_A = 0x41; // A
const LATIN_CAPITAL_F = 0x46; // F
const LATIN_SMALL_A = 0x61; // a
const LATIN_SMALL_F = 0x66; // f
const REPLACEMENT_CHARACTER = 0xfffd; // �
const MAXIMUM_ALLOWED_CODE_POINT = 0x10ffff; // Maximum allowed code point
const HIGH_SURROGATE_START = 0xd800; // high surrogate start
const LOW_SURROGATE_END = 0xdfff; // low surrogate end

/**
 * Check if character code is a hex digit.
 *
 * @param code Character code.
 * @returns `true` if character code is a hex digit, `false` otherwise.
 * @see {@link https://www.w3.org/TR/css-syntax-3/#hex-digit}
 */
const isHexDigit = (code: number): boolean => {
    return (
        (code >= NUMBER_0 && code <= NUMBER_9)
        || (code >= LATIN_CAPITAL_A && code <= LATIN_CAPITAL_F)
        || (code >= LATIN_SMALL_A && code <= LATIN_SMALL_F)
    );
};

/**
 * Check if character code is a newline.
 *
 * @param code Character code.
 * @returns `true` if character code is a newline, `false` otherwise.
 * @see {@link https://www.w3.org/TR/css-syntax-3/#newline}
 */
const isNewline = (code: number): boolean => {
    return code === LINE_FEED || code === FORM_FEED || code === CARRIAGE_RETURN;
};

/**
 * Check if character code is a whitespace
 *
 * @param code Character code
 * @returns `true` if character code is a whitespace, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#whitespace}
 */
const isWhitespace = (code: number): boolean => {
    return code === SPACE || code === CHARACTER_TABULATION || isNewline(code);
};

/**
 * Decodes a CSS identifier according to the CSS Syntax Module Level 3 specification.
 *
 * @param identifier CSS identifier to decode.
 * @returns Decoded CSS identifier.
 */
export const decodeCSSIdentifier = (identifier: string): string => {
    let decodedIdentifier = EMPTY_STRING;

    for (let i = 0; i < identifier.length; i += 1) {
        const codePoint = identifier.charCodeAt(i);

        // 4.3.7. Consume an escaped code point
        // https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point
        if (codePoint === ESCAPED_CODE_POINT) {
            if (isHexDigit(identifier.charCodeAt(i + 1))) {
                let hex = 0;
                let j = 0; // consumed hex digits

                while (j < MAX_HEX_DIGITS && isHexDigit(identifier.charCodeAt(i + j + 1))) {
                    hex = hex * 16 + parseInt(identifier[i + j + 1], 16);
                    j += 1;
                }

                decodedIdentifier += String.fromCodePoint(
                    (
                        hex === 0
                        || (hex >= HIGH_SURROGATE_START && hex <= LOW_SURROGATE_END)
                        || hex > MAXIMUM_ALLOWED_CODE_POINT
                    )
                        ? REPLACEMENT_CHARACTER
                        : hex,
                );

                i += j;

                // according to the spec, if the next code point after the escape sequence is whitespace,
                // it should be consumed too
                const nextCodePoint = identifier.charCodeAt(i + 1);
                if (isWhitespace(nextCodePoint)) {
                    // consume 2 code points for CRLF sequence and 1 code point for any other whitespace character
                    i += nextCodePoint === CARRIAGE_RETURN && identifier.charCodeAt(i + 2) === LINE_FEED ? 2 : 1;
                }
            }

            // do nothing for EOF
        } else {
            decodedIdentifier += identifier[i];
        }
    }

    return decodedIdentifier;
};
