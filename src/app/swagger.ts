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
    { name: 'Loans' },
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
    '/loans': {
      post: {
        tags: ['Loans'],
        summary: 'Create a loan application',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateLoanApplicationRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Loan application created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/LoanApplication' } } },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Loans'],
        summary: 'List loan applications',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/LoanStatusValue' },
          },
        ],
        responses: {
          '200': {
            description: 'Loan applications',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/LoanApplication' } } } },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/loans/{id}': {
      get: {
        tags: ['Loans'],
        summary: 'Get loan application detail',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Loan application detail',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/LoanApplication' } } },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/loans/{id}/history': {
      get: {
        tags: ['Loans'],
        summary: 'Get loan audit history (secondary_admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': {
            description: 'Loan audit history with suspicious flags',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/LoanHistoryResult' } } },
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
    '/loans/{id}/recommendation': {
      post: {
        tags: ['Loans'],
        summary: 'Generate loan recommendation',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Loan recommendation',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/LoanRecommendation' } } },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/loans/{id}/approve': {
      patch: {
        tags: ['Loans'],
        summary: 'Approve a loan application (secondary_admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoanDecisionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Approved loan application',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/LoanApplication' } } },
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
    '/loans/{id}/reject': {
      patch: {
        tags: ['Loans'],
        summary: 'Reject a loan application (secondary_admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoanDecisionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Rejected loan application',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/LoanApplication' } } },
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
          name: { type: 'string', example: 'Pak Hendra' },
          email: { type: 'string', format: 'email', example: 'pak.hendra@example.com' },
          password: { type: 'string', minLength: 6, example: 'secret123' },
          device_id: { type: 'string', example: 'flutter-device' },
        },
        required: ['name', 'email', 'password'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          identifier: { type: 'string', example: 'pak.hendra@example.com' },
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
          role: { $ref: '#/components/schemas/UserRoleValue' },
          tenantId: { type: 'string', nullable: true },
          koperasiName: { type: 'string', nullable: true },
          koperasiType: { type: 'string', nullable: true },
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
          role: { $ref: '#/components/schemas/UserRoleValue' },
          tenant_id: { type: 'string', nullable: true },
          koperasi_name: { type: 'string', nullable: true },
          koperasi_type: { type: 'string', nullable: true },
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
      UserRoleValue: {
        type: 'string',
        enum: ['member', 'primary_admin', 'secondary_admin'],
      },
      LoanStatusValue: {
        type: 'string',
        enum: ['draft', 'pending_review', 'approved', 'rejected'],
      },
      LoanRiskLevelValue: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
      },
      CreateLoanApplicationRequest: {
        type: 'object',
        properties: {
          applicant_name: { type: 'string', example: 'Pak Acep' },
          applicant_member_id: { type: 'string', example: 'Acep-001' },
          target_koperasi: { type: 'string', example: 'Melati Jaya' },
          requested_amount: { type: 'number', example: 3000000 },
          purpose: { type: 'string', example: 'Modal usaha sayuran dan cold storage' },
          tenure_months: { type: 'integer', example: 6 },
        },
        required: ['applicant_name', 'target_koperasi', 'requested_amount', 'tenure_months'],
      },
      LoanDecisionRequest: {
        type: 'object',
        properties: {
          review_note: { type: 'string', example: 'Approved conditionally.' },
        },
      },
      LoanRecommendation: {
        type: 'object',
        properties: {
          loan_application_id: { type: 'string' },
          risk_level: { $ref: '#/components/schemas/LoanRiskLevelValue' },
          recommendation: { type: 'string', enum: ['approve', 'manual_review', 'reject_or_require_clearance'] },
          summary: { type: 'string' },
          key_stats: { type: 'object', additionalProperties: true },
          chart_data: { type: 'object', additionalProperties: true },
          evidence: { type: 'array', items: { type: 'object', additionalProperties: true } },
          model_provider: { type: 'string', example: 'gemini' },
        },
      },
      LoanHistoryEntryMetadata: {
        type: 'object',
        properties: {
          applicant_name: { type: 'string' },
          applicant_member_id: { type: 'string', nullable: true },
          target_koperasi: { type: 'string' },
          requested_amount: { type: 'number' },
          previous_status: { type: 'string', nullable: true },
          new_status: { type: 'string', nullable: true },
          risk_level: { type: 'string', nullable: true },
          recommendation: { type: 'string', nullable: true },
          review_note: { type: 'string', nullable: true },
        },
      },
      LoanHistoryEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          action: { type: 'string' },
          actor_user_id: { type: 'string' },
          result_status: { type: 'string' },
          metadata: { $ref: '#/components/schemas/LoanHistoryEntryMetadata' },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'action', 'actor_user_id', 'result_status', 'metadata', 'created_at'],
      },
      LoanHistoryResult: {
        type: 'object',
        properties: {
          loan_application_id: { type: 'string' },
          generated_at: { type: 'string', format: 'date-time' },
          flags: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['HIGH_RISK_APPROVED', 'MISSING_REVIEW_NOTE', 'FAST_DECISION', 'RECOMMENDATION_SKIPPED'],
            },
          },
          timeline: {
            type: 'array',
            items: { $ref: '#/components/schemas/LoanHistoryEntry' },
          },
        },
        required: ['loan_application_id', 'generated_at', 'flags', 'timeline'],
      },
      LoanApplication: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          applicant_name: { type: 'string' },
          applicant_member_id: { type: 'string', nullable: true },
          target_koperasi: { type: 'string' },
          requested_amount: { type: 'number' },
          purpose: { type: 'string', nullable: true },
          tenure_months: { type: 'integer' },
          status: { $ref: '#/components/schemas/LoanStatusValue' },
          submitted_by: { type: 'string' },
          reviewed_by: { type: 'string', nullable: true },
          reviewed_at: { type: 'string', format: 'date-time', nullable: true },
          review_note: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          recommendation: { $ref: '#/components/schemas/LoanRecommendation', nullable: true },
        },
      },
    },
  },
} as const;
