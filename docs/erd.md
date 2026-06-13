# VivaJauh Backend ERD

Dokumen ini merangkum pembagian tabel backend VivaJauh berdasarkan domain koperasi.

## Domain Groups

- `Identity & Tenant`: user, koperasi, dan device.
- `Offline Sync`: record mentah dari mobile sebelum diproyeksikan ke tabel transaksi.
- `Operational Records`: transaksi pakan, event ternak, simpanan, cicilan, dan kredit seller.
- `Funds`: dana pokok dan iuran bulanan.
- `Loan Approval`: pengajuan pinjaman dan rekomendasi risiko.
- `Audit`: jejak aksi penting.

## Mermaid

```mermaid
erDiagram
    MS_USER {
        string id PK
        string username UK
        string password
        string name
        string email UK
        string role
        string tenantId FK
        string status
        datetime createdAt
        datetime updatedAt
    }

    MS_TENANT {
        string id PK
        string userId FK
        string koperasiName UK
        string koperasiType
        string focusArea
        datetime createdAt
        datetime updatedAt
    }

    MS_DEVICE {
        string id PK
        string userId FK
        string deviceIdentifier UK
        string deviceName
        string platform
        string status
        datetime lastSeenAt
        datetime createdAt
        datetime updatedAt
    }

    TR_SYNC_RECORD {
        string id PK
        string localId
        string userId FK
        string deviceId FK
        string recordType
        json payloadJson
        string syncStatus
        string verificationStatus
        string idempotencyKey UK
        datetime recordedAt
        datetime uploadedAt
        string errorMessage
        datetime createdAt
        datetime updatedAt
    }

    TR_FEED_TRANSACTION {
        string id PK
        string recordId FK_UK
        string userId FK
        string feedType
        string direction
        float quantityKg
        int adjustmentSign
        string warehouse
        datetime recordedAt
        datetime createdAt
    }

    TR_LIVESTOCK_EVENT {
        string id PK
        string recordId FK_UK
        string userId FK
        string livestockType
        string eventType
        float quantity
        string pen
        string healthNote
        datetime recordedAt
        datetime createdAt
    }

    TR_SAVINGS_TRANSACTION {
        string id PK
        string recordId FK_UK
        string userId FK
        string memberName
        string memberId
        string direction
        float amount
        datetime recordedAt
        datetime createdAt
    }

    TR_LOAN_REPAYMENT {
        string id PK
        string recordId FK_UK
        string userId FK
        string memberName
        string memberId
        string loanRef
        float amount
        datetime recordedAt
        datetime createdAt
    }

    TR_SELLER_CREDIT {
        string id PK
        string recordId FK_UK
        string userId FK
        string sellerName
        string items
        float amount
        datetime recordedAt
        datetime createdAt
    }

    TR_FUND_LEDGER {
        string id PK
        string tenantId FK
        string memberId FK
        string fundType
        string periodKey
        float amountDue
        float amountPaid
        string status
        datetime dueDate
        datetime paidAt
        string recordedBy FK
        string note
        datetime createdAt
        datetime updatedAt
    }

    TR_LOAN_APPLICATION {
        string id PK
        string applicantName
        string applicantMemberId
        string targetKoperasi
        float requestedAmount
        string purpose
        int tenureMonths
        string status
        string submittedBy FK
        string reviewedBy
        datetime reviewedAt
        string reviewNote
        datetime createdAt
        datetime updatedAt
    }

    TR_LOAN_RECOMMENDATION {
        string id PK
        string loanApplicationId FK_UK
        string riskLevel
        string recommendation
        string summary
        json keyStatsJson
        json chartDataJson
        json evidenceJson
        string modelProvider
        json modelRawResponse
        datetime createdAt
    }

    TR_AUDIT_LOG {
        string id PK
        string userId
        string action
        string targetType
        string targetId
        string resultStatus
        json metadataJson
        string prevHash
        string selfHash
        datetime createdAt
    }

    MS_TENANT ||--o{ MS_USER : has_members
    MS_USER ||--o{ MS_TENANT : owns_tenant
    MS_USER ||--o{ MS_DEVICE : uses_device

    MS_USER ||--o{ TR_SYNC_RECORD : creates_record
    MS_DEVICE ||--o{ TR_SYNC_RECORD : uploads_record

    TR_SYNC_RECORD ||--o| TR_FEED_TRANSACTION : projects_to
    TR_SYNC_RECORD ||--o| TR_LIVESTOCK_EVENT : projects_to
    TR_SYNC_RECORD ||--o| TR_SAVINGS_TRANSACTION : projects_to
    TR_SYNC_RECORD ||--o| TR_LOAN_REPAYMENT : projects_to
    TR_SYNC_RECORD ||--o| TR_SELLER_CREDIT : projects_to

    MS_USER ||--o{ TR_FEED_TRANSACTION : records_feed
    MS_USER ||--o{ TR_LIVESTOCK_EVENT : records_livestock
    MS_USER ||--o{ TR_SAVINGS_TRANSACTION : records_savings
    MS_USER ||--o{ TR_LOAN_REPAYMENT : records_repayment
    MS_USER ||--o{ TR_SELLER_CREDIT : records_credit

    MS_TENANT ||--o{ TR_FUND_LEDGER : has_fund_ledger
    MS_USER ||--o{ TR_FUND_LEDGER : fund_member
    MS_USER ||--o{ TR_FUND_LEDGER : fund_recorder

    MS_USER ||--o{ TR_LOAN_APPLICATION : submits_application
    TR_LOAN_APPLICATION ||--o| TR_LOAN_RECOMMENDATION : has_recommendation
```

Note: `TR_AUDIT_LOG.userId` is currently a logical actor reference and is not declared as a Prisma foreign key.
