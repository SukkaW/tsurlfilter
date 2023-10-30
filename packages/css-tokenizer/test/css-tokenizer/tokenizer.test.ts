import { type TokenizerContext } from '../../src/common/context';
import { ErrorMessage } from '../../src/common/enums/error-messages';
import { TokenType } from '../../src/common/enums/token-types';
import { tokenize } from '../../src/css-tokenizer';
import { getStringHash } from '../../src/utils/djb2';
import type { ErrorData, TokenData } from '../helpers/test-interfaces';

describe('tokenizer', () => {
    // Sometimes the source code contains BOM (Byte Order Mark) at the beginning of the file, it should be skipped.
    test('should skip leading BOM in the regular tokenizer', () => {
        const tokens: TokenData[] = [];
        tokenize('\uFEFF ', (...args) => tokens.push(args));
        expect(tokens).toEqual([
            [TokenType.Whitespace, 1, 2],
        ]);
    });

    test('should merge custom handlers in the regular tokenizer', () => {
        const tokens: TokenData[] = [];
        tokenize(':custom(a)', (...args) => tokens.push(args), () => {}, new Map([
            [getStringHash('custom'), (context: TokenizerContext) => {
                const start = context.offset;
                // this is a simple handler that just consumes one single code point - just for testing purposes
                context.consumeCodePoint();
                context.onToken(TokenType.Delim, start, context.offset);
            }],
        ]));
        expect(tokens).toEqual([
            [TokenType.Colon, 0, 1],
            [TokenType.Function, 1, 8],
            [TokenType.Delim, 8, 9],
            [TokenType.CloseParenthesis, 9, 10],
        ]);
    });

    test('should handle errors in the regular tokenizer', () => {
        // runs without errors if no error callback function is provided
        tokenize('"str', () => {});

        // callback function is called with the error
        const errors: ErrorData[] = [];
        tokenize('"str', () => {}, (...args) => errors.push(args));
        expect(errors).toEqual([
            [ErrorMessage.UnexpectedEofInString, 0, 4],
        ]);
    });
});
