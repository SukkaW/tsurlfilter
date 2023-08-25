import console from 'console';
import fs from 'fs';
import {
    Engine,
    RuleStorage,
    setLogger,
    StringRuleList,
} from '../../src';

describe('Start Engine Benchmark', () => {
    beforeAll(() => {
        setLogger({
            error(): void {
            },
            info(): void {
            },
            debug(): void {
            },
            warn(): void {
            },
        });
    });

    afterAll(() => {
        setLogger(console);
    });

    it('starts network-engine', async () => {
        const rulesFilePath = './test/resources/adguard_base_filter.txt';

        const ruleText = await fs.promises.readFile(rulesFilePath, 'utf8');

        console.log('Starting engine..');
        const startParse = Date.now();

        // Start Engine Benchmark 20 times
        // ✓ starts network-engine (7100ms)

        let count = 0;
        while (count < 20) {
            count += 1;

            const list = new StringRuleList(1, ruleText, false);
            const ruleStorage = new RuleStorage([list]);

            const engine = new Engine(ruleStorage, false);
            expect(engine).toBeTruthy();
            expect(engine.getRulesCount()).toEqual(91686);

            // expect(engine.getRulesCount()).toEqual(91694);

            /* eslint-disable max-len */
            // FIXME: AGTree considers the following rule as invalid:

            // !+ NOT_PLATFORM (windows, mac, android)
            // !+ NOT_PLATFORM (windows, mac, android)
            // vipboxes.eu#?#.ui-accordion-content > .linkGroup:has(> .linkRow > .gameLinks > a[title][href]:not([href*="vipboxes"])
            // 2conv.com,flvto.biz,flv2mp3.by#?#div[class*="ads"] {visibility: hidden !important; display: block !important; height: 0 !important; }
            // 123tvnow.com##.123tv-ads
        }

        console.log(`Elapsed on parsing rules: ${Date.now() - startParse}`);
    });
});
