/* eslint-disable max-len */
import * as utils from '../../../src/background/utils/url';

describe('Url utils', () => {
    it('parses url host', () => {
        expect(utils.getHost('https://example.org')).toBe('example.org');
        expect(utils.getHost('https://www.example.org')).toBe('www.example.org');
        expect(utils.getHost('https://www.example.org/path')).toBe('www.example.org');
        expect(utils.getHost('https://www.example.org/path?query')).toBe('www.example.org');
        expect(utils.getHost('stun:example.org')).toBe('example.org');
    });
});
