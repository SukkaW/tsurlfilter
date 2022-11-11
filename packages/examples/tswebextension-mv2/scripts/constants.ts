import path from 'path';
import { ConfigurationMV2 } from '@adguard/tswebextension';

export const BUILD_PATH = path.join(__dirname, '../build');

export const BACKGROUND_PATH = path.join(__dirname, '../extension/pages/background');

export const CONTENT_SCRIPT = path.join(__dirname, '../extension/pages/content-script');

export const POPUP_PATH = path.join(__dirname, '../extension/pages/popup');

export const DOCUMENT_BLOCKING_PATH = path.join(__dirname, '../extension/pages/document-blocking');

export const USER_DATA_PATH = path.join(__dirname, '../tmp');

export const TESTCASES_BASE_URL = 'https://testcases.adguard.com';

export const TESTCASES_DATA_PATH = '/data.json';

export const DEFAULT_EXTENSION_CONFIG: ConfigurationMV2 = {
    filters: [],
    allowlist: [],
    trustedDomains: [],
    userrules: [],
    verbose: false,
    settings: {
        collectStats: true,
        allowlistInverted: false,
        allowlistEnabled: false,
        stealthModeEnabled: true,
        filteringEnabled: true,
        stealth: {
            blockChromeClientData: true,
            hideReferrer: true,
            hideSearchQueries: true,
            sendDoNotTrack: true,
            blockWebRTC: true,
            selfDestructThirdPartyCookies: true,
            selfDestructThirdPartyCookiesTime: 3600,
            selfDestructFirstPartyCookies: true,
            selfDestructFirstPartyCookiesTime: 3600,
        },
    },
};
