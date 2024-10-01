import camelcaseKeys from 'camelcase-keys';

/**
 * Convert all keys of given object to camel case.
 * Needed to map typeOrm raw data to entities
 * @param obj
 */
export function transformKeysToCamelCase<T extends Record<string, unknown>>(
    obj: T
): T;
export function transformKeysToCamelCase<T extends Record<string, unknown>>(
    obj: T[]
): T[];
export function transformKeysToCamelCase<T extends Record<string, unknown>>(
    obj: T | T[]
): T | T[] {
    if (Array.isArray(obj)) {
        return camelcaseKeys(obj, { deep: true }) as T[];
    } else if (typeof obj === 'object' && obj !== null) {
        return camelcaseKeys(obj, { deep: true }) as T;
    } else {
        return obj;
    }
}

// TODO rename
export function filterKeysGetFirst(
    obj: Record<string, unknown>,
    exclude: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    return Object.keys(obj)
        .filter((key) => !(key in exclude))
        .reduce((acc, key) => {
            acc[key] = obj[key];
            return acc;
        }, result);
}
