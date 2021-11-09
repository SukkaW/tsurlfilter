import { findHeaderByName } from '../../src/utils/headers';

describe('Headers utils', () => {
    it('finds header by name', () => {
        let result = findHeaderByName([], 'test_name');
        expect(result).toBeNull();

        result = findHeaderByName([
            {
                name: 'an_other_name',
                value: 'an_other_value',
            },
        ], 'test_name');
        expect(result).toBeNull();

        result = findHeaderByName([
            {
                name: 'test_name',
                value: 'test_value',
            },
            {
                name: 'an_other_name',
                value: 'an_other_value',
            },
        ], 'test_name');
        expect(result).not.toBeNull();
        expect(result!.name).toBe('test_name');
    });
});
