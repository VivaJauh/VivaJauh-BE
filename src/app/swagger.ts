export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'VivaJauh API',
    version: '1.0.0',
    description: 'API documentation for VivaJauh backend services.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current host',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Sync' },
    { name: 'Reports' },
    { name: 'Verification' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        servers: [{ url: '/' }],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Health' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a field officer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/AuthSession' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with username or email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated session',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/AuthSession' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user claims',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Authenticated user',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/JwtUser' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/sync/batch': {
      post: {
        tags: ['Sync'],
        summary: 'Upload local records in a batch',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SyncBatchRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sync results',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            results: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/SyncResult' },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/sync/status': {
      get: {
        tags: ['Sync'],
        summary: 'Get sync counters',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Sync status',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SyncStatus' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/sync/items': {
      get: {
        tags: ['Sync'],
        summary: 'List synced records',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Synced records',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/SyncedRecord' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/reports/summary': {
      get: {
        tags: ['Reports'],
        summary: 'Get report summary',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Report summary',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ReportSummary' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/reports/summary/export.csv': {
      get: {
        tags: ['Reports'],
        summary: 'Export report summary as CSV',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { $ref: '#/components/responses/CsvExport' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/summary/export.pdf': {
      get: {
        tags: ['Reports'],
        summary: 'Export report summary as PDF',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { $ref: '#/components/responses/PdfExport' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/summary/export.xls': {
      get: {
        tags: ['Reports'],
        summary: 'Export report summary as XLSX',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { $ref: '#/components/responses/XlsxExport' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/portfolio': {
      get: {
        tags: ['Reports'],
        summary: 'Get portfolio pack',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Portfolio pack',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/PortfolioPack' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/reports/portfolio/export.csv': {
      get: {
        tags: ['Reports'],
        summary: 'Export portfolio pack as CSV',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { $ref: '#/components/responses/CsvExport' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/portfolio/export.pdf': {
      get: {
        tags: ['Reports'],
        summary: 'Export portfolio pack as PDF',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { $ref: '#/components/responses/PdfExport' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/portfolio/export.xlsx': {
      get: {
        tags: ['Reports'],
        summary: 'Export portfolio pack as XLSX',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { $ref: '#/components/responses/XlsxExport' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/conflicts': {
      get: {
        tags: ['Reports'],
        summary: 'Get conflict summary',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Conflict summary',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ConflictSummary' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/audit': {
      get: {
        tags: ['Reports'],
        summary: 'Get audit logs',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Audit logs',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/AuditLog' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/verification/queue': {
      get: {
        tags: ['Verification'],
        summary: 'List records waiting for verification',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Verification queue',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/SyncedRecord' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/verification/records/{id}': {
      patch: {
        tags: ['Verification'],
        summary: 'Update record verification status',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyRecordRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated record',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SyncedRecord' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      CsvExport: {
        description: 'CSV file',
        content: {
          'text/csv': {
            schema: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
      PdfExport: {
        description: 'PDF file',
        content: {
          'application/pdf': {
            schema: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
      XlsxExport: {
        description: 'Excel file',
        content: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
            schema: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
        },
        required: ['success', 'data'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          code: { type: 'string', example: 'BAD_REQUEST' },
          message: { type: 'string' },
        },
        required: ['success', 'code', 'message'],
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          service: { type: 'string', example: 'VivaJauh API' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['status', 'service', 'timestamp'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Field Officer' },
          email: { type: 'string', format: 'email', example: 'officer@example.com' },
          password: { type: 'string', minLength: 6, example: 'secret123' },
          device_id: { type: 'string', example: 'flutter-device' },
        },
        required: ['name', 'email', 'password'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          identifier: { type: 'string', example: 'officer@example.com' },
          password: { type: 'string', example: 'secret123' },
          device_id: { type: 'string', example: 'flutter-device' },
        },
        required: ['identifier', 'password'],
      },
      AuthSession: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          userId: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string' },
          deviceId: { type: 'string' },
        },
        required: ['token', 'userId', 'name', 'email', 'role', 'deviceId'],
      },
      JwtUser: {
        type: 'object',
        properties: {
          sub: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string' },
          device_id: { type: 'string' },
        },
        required: ['sub', 'name', 'email', 'role'],
      },
      SyncBatchRequest: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/IncomingSyncItem' },
          },
        },
        required: ['items'],
      },
      IncomingSyncItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'local-001' },
          user_id: { type: 'string' },
          device_id: { type: 'string' },
          record_type: { type: 'string', example: 'daily_report' },
          payload_json: { type: 'object', additionalProperties: true },
          idempotency_key: { type: 'string', example: 'local-001-2026-06-12' },
          recorded_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'record_type', 'idempotency_key', 'recorded_at'],
      },
      SyncResult: {
        type: 'object',
        properties: {
          local_id: { type: 'string' },
          server_id: { type: 'string' },
          idempotency_key: { type: 'string' },
          status: { $ref: '#/components/schemas/SyncStatusValue' },
          verification_status: { $ref: '#/components/schemas/VerificationStatusValue' },
          uploaded_at: { type: 'string', format: 'date-time', nullable: true },
          error_code: { type: 'string' },
        },
      },
      SyncStatus: {
        type: 'object',
        properties: {
          pending: { type: 'integer' },
          synced: { type: 'integer' },
          failed: { type: 'integer' },
          conflict: { type: 'integer' },
          unverified: { type: 'integer' },
          verified: { type: 'integer' },
          lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['pending', 'synced', 'failed', 'conflict', 'unverified', 'verified', 'lastSyncAt'],
      },
      SyncedRecord: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          _id: { type: 'string' },
          local_id: { type: 'string' },
          user_id: { type: 'string' },
          device_id: { type: 'string' },
          record_type: { type: 'string' },
          payload_json: { type: 'object', additionalProperties: true },
          sync_status: { $ref: '#/components/schemas/SyncStatusValue' },
          verification_status: { $ref: '#/components/schemas/VerificationStatusValue' },
          idempotency_key: { type: 'string' },
          recorded_at: { type: 'string', format: 'date-time' },
          uploaded_at: { type: 'string', format: 'date-time', nullable: true },
          error_message: { type: 'string', nullable: true },
        },
        required: ['id', '_id', 'local_id', 'user_id', 'device_id', 'record_type', 'payload_json', 'sync_status', 'verification_status', 'idempotency_key', 'recorded_at', 'uploaded_at', 'error_message'],
      },
      ReportSummary: {
        type: 'object',
        properties: {
          generated_at: { type: 'string', format: 'date-time' },
          total_records: { type: 'integer' },
          verified_records: { type: 'integer' },
          unverified_records: { type: 'integer' },
          feed_transactions: { type: 'integer' },
          livestock_events: { type: 'integer' },
          seller_credit: { type: 'integer' },
          savings_transactions: { type: 'integer' },
          loan_repayments: { type: 'integer' },
          daily_reports: { type: 'integer' },
        },
      },
      PortfolioPack: {
        type: 'object',
        properties: {
          generated_at: { type: 'string', format: 'date-time' },
          active_members_estimate: { type: 'integer' },
          verified_records: { type: 'integer' },
          seller_credit_total: { type: 'number' },
          savings_total: { type: 'number' },
          loan_repayment_total: { type: 'number' },
          feed_movement_kg: { type: 'number' },
          report_consistency_score: { type: 'number' },
        },
      },
      ConflictSummary: {
        type: 'object',
        properties: {
          generated_at: { type: 'string', format: 'date-time' },
          conflicts: {
            type: 'array',
            items: { $ref: '#/components/schemas/SyncedRecord' },
          },
          needs_correction: {
            type: 'array',
            items: { $ref: '#/components/schemas/SyncedRecord' },
          },
        },
      },
      AuditLog: {
        type: 'object',
        additionalProperties: true,
      },
      VerifyRecordRequest: {
        type: 'object',
        properties: {
          verification_status: { $ref: '#/components/schemas/VerificationStatusValue' },
        },
        required: ['verification_status'],
      },
      SyncStatusValue: {
        type: 'string',
        enum: ['pending', 'syncing', 'synced', 'failed', 'conflict'],
      },
      VerificationStatusValue: {
        type: 'string',
        enum: ['unverified', 'verified', 'rejected', 'needs_correction'],
      },
    },
  },
} as const;
