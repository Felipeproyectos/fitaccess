export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export function toTitleCase(str: string): string {
    if (!str) return str;
    return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}