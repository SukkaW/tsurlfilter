/**
 * Prefix tree implementation
 */
export class TrieNode {
    /**
     * This node's children is a map where key is a character code
     * and value is it's trie node.
    */
    private children: Map<number, TrieNode>;

    /**
     * Character code of this TrieNode.
     */
    private code: number;

    /**
     * Data, attached to this trie node. When trie traversal is being done,
     * data from all trie nodes is collected.
     */
    private data: number[] | undefined;

    /**
     * Creates an instance of a TrieNode with the specified char code.
     *
     * @param code
     */
    constructor(code: number) {
        this.code = code;
        this.children = new Map();
    }

    /**
     * Attaches data to this TrieNode.
     *
     * @param data
     */
    attach(data: number): void {
        if (!this.data) {
            this.data = [];
        }

        this.data.push(data);
    }

    /**
     * Adds the specified string to the Trie and attaches data to it.
     *
     * @param str string to add.
     * @param data data to attach to the leaf node.
     */
    public add(str: string, data: number): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let root: TrieNode = this;
        for (let i = 0; i < str.length; i += 1) {
            const c = str.charCodeAt(i);
            let next = root.children.get(c);
            if (!next) {
                next = new TrieNode(c);
                root.children.set(c, next);
            }
            root = next;
        }
        root.attach(data);
    }

    /**
     * Traverses this TrieNode and it's children using the specified search string.
     * This method collects all the data that's attached on the way and returns as
     * a result.
     *
     * @param str string to check.
     * @param start index in str where to start traversing from.
     */
    traverse(str: string, start: number): number[] {
        const result: number[] = [];

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let current: TrieNode = this;
        for (let i = start; i < str.length; i += 1) {
            const c = str.charCodeAt(i);
            const next = current.children.get(c);
            if (!next) {
                break;
            }
            if (next.data) {
                result.push(...next.data);
            }
            current = next;
        }

        return result;
    }

    /**
     * Traverses this TrieNode and it's children using the specified search string and all substrings.
     *
     * @param str string to check
     * @param len max length to check
     */
    public traverseAll(str: string, len: number): number[] {
        const data: number[] = [];
        for (let i = 0; i <= len; i += 1) {
            const result = this.traverse(str, i);
            if (result) {
                data.push(...result);
            }
        }

        return data;
    }

    /**
     * Debug only
     */
    public stats(): Map<number, number> {
        const result = new Map<number, number>();

        const childrenSize = this.children.size;
        const countOfNodes = result.get(childrenSize) ? result.get(childrenSize)! + 1 : 1;
        result.set(childrenSize, countOfNodes);

        this.children.forEach((child: TrieNode) => {
            const childStats = child.stats();
            childStats.forEach((value: number, key: number) => {
                const count = result.get(key) ? result.get(key)! + value : value;
                result.set(key, count);
            });
        });

        return result;
    }
}
