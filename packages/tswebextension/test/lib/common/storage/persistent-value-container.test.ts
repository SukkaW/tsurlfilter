import browser from 'webextension-polyfill';
import { PersistentValueContainer } from '@lib/common/storage/persistent-value-container';

describe('PersistentValueContainer', () => {
    const key = 'test-key';
    const value = 'test-value';
    const api = browser.storage.local;

    it('should initialize the value', async () => {
        const container = new PersistentValueContainer(key, api);
        await container.init(value);

        expect(container.get()).toBe(value);
    });

    it('should set the value', async () => {
        const container = new PersistentValueContainer(key, api);
        await container.init(value);

        const newValue = 'new-value';
        container.set(newValue);

        expect(container.get()).toBe(newValue);
    });

    it('should throw an error if storage is not initialized', () => {
        const container = new PersistentValueContainer(key, browser.storage.local);

        expect(() => container.get()).toThrow('Storage not initialized');
        expect(() => container.set(value)).toThrow('Storage not initialized');
    });

    it('should throw an error if storage is already initialized', async () => {
        const container = new PersistentValueContainer(key, browser.storage.local);
        await container.init(value);

        await expect(container.init(value)).rejects.toThrow('Storage already initialized');
    });
});
