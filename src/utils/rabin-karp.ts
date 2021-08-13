export const PRIME_BASE = 31;

function matchesAtIndex(index: number, str: string, needle: string): boolean {
    for (let j = 0; j < needle.length; j += 1) {
        if (str[index + j] !== needle[j]) {
            return false;
        }
    }
    return true;
}

function rabinKarpHash(str: string, start: number, end: number): number {
    let hash = 0;
    for (let i = start; i < end; i += 1) {
        hash = PRIME_BASE * hash + str.charCodeAt(i);
    }
    return hash;
}

export function calculateHash(str: string): number {
    return rabinKarpHash(str, 0, str.length);
}

export function calculateHashBetween(str: string, start: number, end: number): number {
    return rabinKarpHash(str, start, end);
}

export function calculateNextHash(prevHash: number,
    str: string,
    primeToPower: number,
    idx: number,
    len: number): number {
    return prevHash * PRIME_BASE - primeToPower * str.charCodeAt(idx) + str.charCodeAt(idx + len);
}

export function stringContains(str: string, needle: string, needleHash: number): boolean {
    let strHash = calculateHashBetween(str, 0, needle.length);
    const primeToPower = PRIME_BASE ** needle.length;

    for (let i = 0; i <= str.length - needle.length; i += 1) {
        if (strHash === needleHash && matchesAtIndex(i, str, needle)) {
            return true;
        }

        strHash = calculateNextHash(strHash, str, primeToPower, i, needle.length);
    }
    return false;
}
