export const createTrustedTypesPolicy = (): TrustedTypePolicy => {
    const defaultPolicy = {
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
    (input: string, args: any[]): string;
}

interface CreateScriptCallback {
    (input: string, args: any[]): string;
}

interface CreateScriptURLCallback {
    (input: string, args: any[]): string;
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
    createHTML(input: string, args: any[]): TrustedHTML;
    createScript(input: string, args: any[]): TrustedScript;
    createScriptURL(input: string, args: any[]): TrustedScriptURL;
}

interface TrustedTypePolicyFactory {
    readonly defaultPolicy: TrustedTypePolicy | null;
    readonly emptyHTML: TrustedHTML;
    readonly emptyScript: TrustedScript;
    createPolicy(policyName: string, policyOptions?: TrustedTypePolicyOptions): TrustedTypePolicy;
    getAttributeType(tagName: string, attribute: string, elementNs?: string, attrNs?: string): string | null;
    getPropertyType(tagName: string, property: string, elementNs?: string): string | null;
    isHTML(value: any): boolean;
    isScript(value: any): boolean;
    isScriptURL(value: any): boolean;
}

declare global {
    interface Window {
        trustedTypes: TrustedTypePolicyFactory
    }
}
