/**
 * Convert given string to snake case.
 * @param str
 */
export const snakeCase = (str: string): string =>
    str
        // ABc -> a_bc
        .replace(/([A-Z])([A-Z])([a-z])/g, '$1_$2$3')
        // aC -> a_c
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase();
