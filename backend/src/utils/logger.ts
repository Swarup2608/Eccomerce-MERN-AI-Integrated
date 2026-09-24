type LogContext = Record <string, unknown>;

function formatLog(level: string, message: string, context?: LogContext): string {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context
    });
}

export const logger = {
    info(message: string, context?: LogContext) {
        console.log(formatLog('INFO', message, context));
    },

    warn(message: string, context?: LogContext) {
        console.log(formatLog('WARN', message, context));
    },

    error(message: string, context?: LogContext) {
        console.log(formatLog('ERROR', message, context));
    },

    debug(message: string, context?: LogContext) {
        console.log(formatLog('DEBUG', message, context));
    }
}