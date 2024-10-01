import { DefaultNamingStrategy } from 'typeorm';

import { snakeCase } from '@/commons/helpers/strings';

/**
 * Snake case naming strategy for typeorm.
 */
export default class SnakeCaseNamingStrategy extends DefaultNamingStrategy {
    override tableName(className: string, customName: string): string {
        return customName || snakeCase(className);
    }

    override columnName(
        propertyName: string,
        customName: string,
        embeddedPrefixes: string[]
    ): string {
        return (
            snakeCase(embeddedPrefixes.join('_')) +
            (customName || snakeCase(propertyName))
        );
    }

    override relationName(propertyName: string): string {
        return snakeCase(propertyName);
    }
}
