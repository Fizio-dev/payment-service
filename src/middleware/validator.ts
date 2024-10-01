import * as OpenApiValidator from 'express-openapi-validator';

export const openAPIValidator = OpenApiValidator.middleware({
    apiSpec: './openapi.yaml',
    validateSecurity: false,
    validateRequests: true, // (default)
    validateResponses: false, // false by default
});
