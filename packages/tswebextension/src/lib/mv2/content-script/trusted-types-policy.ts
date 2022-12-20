export const createTrustedTypesPolicy = (): TrustedTypePolicy => {
    const defaultPolicy = {
        // The name for the trusted-types policy should only be 'AGPolicy',because corelibs can
        // allow our policy if the server has restricted the creation of a trusted-types policy with
        // the directive 'Content-Security-Policy: trusted-types <policyName>;`.
        // If such a header is presented in the server response, corelibs adds permission to create
        // the 'AGPolicy' policy with the 'allow-duplicates' option to prevent errors.
        // See AG-18204 for details.
        name: 'AGPolicy',
        createHTML: (input: string): TrustedHTML => {
            return {
                toJSON: () => JSON.stringify(input),
                toString: () => input,
            };
        },
        createScript: (input: string): TrustedScript => {
            return {
                toJSON: () => JSON.stringify(input),
                toString: () => input,
            };
        },
        createScriptURL: (input: string): TrustedScriptURL => {
            return {
                toJSON: () => JSON.stringify(input),
                toString: () => input,
            };
        },
    };

    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        return window.trustedTypes.createPolicy(defaultPolicy.name, {
            createHTML: (input: string): string => {
                return input;
            },
            createScript: (input: string): string => {
                return input;
            },
            createScriptURL: (input: string): string => {
                return input;
            },
        });
    }

    return defaultPolicy;
};

interface CreateHTMLCallback {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input: string, ...args: any[]): string;
}

interface CreateScriptCallback {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input: string, ...args: any[]): string;
}

interface CreateScriptURLCallback {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input: string, ...args: any[]): string;
}

interface TrustedTypePolicyOptions {
    createHTML?: CreateHTMLCallback | null;
    createScript?: CreateScriptCallback | null;
    createScriptURL?: CreateScriptURLCallback | null;
}

interface TrustedScript {
    toJSON(): string;
    toString(): string;
}

interface TrustedScriptURL {
    toJSON(): string;
    toString(): string;
}

interface TrustedHTML {
    toJSON(): string;
    toString(): string;
}

interface TrustedTypePolicy {
    readonly name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createHTML(input: string, ...args: any[]): TrustedHTML;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createScript(input: string, ...args: any[]): TrustedScript;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createScriptURL(input: string, ...args: any[]): TrustedScriptURL;
}

interface TrustedTypePolicyFactory {
    readonly defaultPolicy: TrustedTypePolicy | null;
    readonly emptyHTML: TrustedHTML;
    readonly emptyScript: TrustedScript;
    createPolicy(policyName: string, policyOptions?: TrustedTypePolicyOptions): TrustedTypePolicy;
    getAttributeType(tagName: string, attribute: string, elementNs?: string, attrNs?: string): string | null;
    getPropertyType(tagName: string, property: string, elementNs?: string): string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isHTML(value: any): boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isScript(value: any): boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isScriptURL(value: any): boolean;
}

declare global {
    interface Window {
        trustedTypes: TrustedTypePolicyFactory
    }
}
