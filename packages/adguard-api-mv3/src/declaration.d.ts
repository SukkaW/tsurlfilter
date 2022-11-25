// TODO: Remove when chrome will update @types (last checked in @types/chrome v0.0.193:)
declare module chrome.declarativeNetRequest {
    // The maximum number of static Rulesets an extension can enable at any one time.
    export const MAX_NUMBER_OF_ENABLED_STATIC_RULESETS: number;
}
