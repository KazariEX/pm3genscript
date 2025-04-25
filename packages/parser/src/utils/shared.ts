export function toArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

export function joinWords(strs: string[], wrapper = quotes) {
    return strs.map(wrapper).join(", ");
}

export function joinWordsOr(strs: string[], wrapper = quotes) {
    return strs.length > 1
        ? strs.slice(0, -1).map(wrapper).join(", ") + " or " + wrapper(strs.at(-1)!)
        : wrapper(strs[0]);
}

export function quotes(value: string) {
    return `"${value}"`;
}