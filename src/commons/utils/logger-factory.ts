// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import winston, { createLogger, format, transports } from 'winston';

import { filterKeysGetFirst } from '@/commons/helpers/objects';
import { config } from '@/config';

export default class LoggerFactory {
    public static getLogger(moduleName: string) {
        return createLogger({
            level: 'debug',
            levels: winston.config.npm.levels,
            format: LoggerFactory.getConsoleFormat(moduleName),
            transports: [new transports.Console()],
            defaultMeta: {
                serviceName: config.serviceName, // can probably include more from env in future
            },
            exitOnError: false,
        });
    }

    private static getConsoleFormat(moduleName: string) {
        return format.combine(
            format.timestamp(),
            format.metadata({ fillExcept: ['timestamp', 'message', 'level'] }), // Include all properties except timestamp, label, and message in metadata
            format.label({ label: moduleName }),
            format.printf((info) => {
                const logObject = {
                    timestamp: info['timestamp'],
                    label: info['label'],
                    level: info.level,
                    message: `${info['timestamp']}  [${info.level}] -- [${info['label']}] :  ${info.message}`,
                    args: [],
                    metadata: {},
                };

                // Check if additional arguments are present
                const splatProperties: symbol = Symbol.for('splat');
                const additionalArgs = info[splatProperties] || [];

                if (additionalArgs.length > 0) {
                    // Add additional arguments to the log object
                    if (additionalArgs.length > 0) {
                        logObject.args = additionalArgs.map((arg: unknown) => {
                            if (arg instanceof Error) {
                                return JSON.stringify(
                                    arg,
                                    Object.getOwnPropertyNames(arg)
                                );
                            }
                            return arg;
                        });
                    }
                }

                // metadata includes arg[0] by default if it's an object, filter it out.
                if (
                    logObject.args.length > 0 &&
                    typeof logObject.args[0]! === 'object'
                ) {
                    logObject.metadata = filterKeysGetFirst(
                        info['metadata'],
                        logObject['args'][0]!
                    );
                }

                return JSON.stringify(logObject);
            })
        );
    }
}
