import {
    AbstractLogger,
    type LogLevel,
    type LogMessage,
    type LoggerOptions,
    type QueryRunner,
} from 'typeorm';
import type { Logger } from 'winston';

/**
 * Custom typeorm logger based on winston logger.
 */
export default class WinstonTypeOrmLogger extends AbstractLogger {
    constructor(
        private readonly winstonLogger: Logger,
        options?: LoggerOptions
    ) {
        super(options);
    }

    /**
     * Write log to specific output.
     */
    protected writeLog(
        level: LogLevel,
        logMessage: LogMessage | LogMessage[],
        queryRunner?: QueryRunner
    ) {
        const messages = this.prepareLogMessages(logMessage, {
            highlightSql: false,
            addColonToPrefix: false,
        });
        for (const message of messages) {
            switch (message.type ?? level) {
                case 'log':
                case 'schema-build':
                case 'migration':
                    this.winstonLogger.info(message.message);
                    break;

                case 'info':
                case 'query':
                    if (message.prefix) {
                        this.winstonLogger.info(
                            message.message.toString(),
                            WinstonTypeOrmLogger.buildMeta(
                                message,
                                level,
                                queryRunner
                            )
                        );
                    } else {
                        this.winstonLogger.info(message.message);
                    }
                    break;

                case 'warn':
                case 'query-slow':
                    if (message.prefix) {
                        this.winstonLogger.warn(
                            message.message.toString(),
                            WinstonTypeOrmLogger.buildMeta(
                                message,
                                level,
                                queryRunner
                            )
                        );
                    } else {
                        this.winstonLogger.warn(message.message);
                    }
                    break;

                case 'error':
                case 'query-error':
                    if (message.prefix) {
                        this.winstonLogger.error(
                            message.message.toString(),
                            WinstonTypeOrmLogger.buildMeta(
                                message,
                                level,
                                queryRunner
                            )
                        );
                    } else {
                        this.winstonLogger.error(message.message);
                    }
                    break;
            }
        }
    }

    private static buildMeta(
        message: LogMessage,
        level: string,
        queryRunner?: QueryRunner
    ) {
        return {
            typeOrmMeta: {
                prefix: message.prefix,
                type: message.type,
                level: level,
                queryRunnerAdditionalData: queryRunner?.data,
            },
        };
    }
}
