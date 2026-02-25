# FYRK — API Specification
## RESTful API Contracts

> **Version:** 0.1
> **Source:** [DATA_MODEL.md](./DATA_MODEL.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)
> **Base URL:** `/api`
> **Auth:** All endpoints except `/api/auth/*` require valid Supabase session
> **Consumed by:** Frontend agent, Backend agent

---

## 1. Conventions

- **Content-Type:** `application/json`
- **Dates:** ISO 8601 UTC (`2026-02-20T12:00:00Z`)
- **Amounts:** Integer in minor currency units (1 SEK = 100 öre)
- **IDs:** UUID v4
- **Success response:** `{ data: T }` or `{ data: T[], meta: { cursor, hasMore, total } }`
- **Error response:** `{ error: { code: string, message: string, details?: object } }`
- **Pagination:** Cursor-based: `?cursor=<lastId>&limit=20`
- **Sorting:** `?sort=<field>&order=asc|desc`
- **Filtering:** `?<field>=<value>` (exact match) or `?<field>_gte=<value>` (range)

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `AUTH_REQUIRED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Not authorized for this resource |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `REVIEW_PDF_NOT_READY` | 409 | Quarterly review PDF is not generated yet |
| `INTERNAL_ERROR` | 500 | Server error |
| `AI_GENERATION_FAILED` | 503 | LLM call failed |

---

## 2. Authentication Endpoints

### POST `/api/auth/signup`
Create a new account and send magic link.

```json
// Request
{ "email": "user@example.com" }

// Response 200
{ "data": { "message": "Magic link sent to user@example.com" } }
```

### POST `/api/auth/login`
Send magic link to existing user.

```json
// Request
{ "email": "user@example.com" }

// Response 200
{ "data": { "message": "Magic link sent" } }
```

### GET `/api/auth/session`
Get current session info.

```json
// Response 200
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Isac",
      "baseCurrency": "SEK",
      "onboardingCompleted": true
    },
    "households": [
      {
        "id": "uuid",
        "name": "Andersson Household",
        "role": "owner",
        "memberCount": 2
      }
    ]
  }
}
```

### POST `/api/auth/logout`
End current session.

---

## 3. Household Endpoints

### POST `/api/households`
Create a new household.

```json
// Request
{
  "name": "Andersson Household",
  "baseCurrency": "SEK"
}

// Response 201
{
  "data": {
    "id": "uuid",
    "name": "Andersson Household",
    "type": "household",
    "baseCurrency": "SEK",
    "members": [
      { "userId": "uuid", "role": "owner", "displayName": "Isac", "status": "active" }
    ],
    "createdAt": "2026-02-20T12:00:00Z"
  }
}
```

### GET `/api/households/:id`
Get household details with member list.

### POST `/api/households/:id/invite`
Invite a member to the household.

```json
// Request
{ "email": "partner@example.com", "role": "member" }

// Response 201
{ "data": { "invitationId": "uuid", "email": "partner@example.com", "status": "invited" } }
```

### PATCH `/api/households/:id/members/:memberId`
Update member role or remove member.

```json
// Request
{ "role": "admin" }  // or { "status": "removed" }
```

### POST `/api/households/demo`
Initialize a demo household.

```json
// Request
{ "variant": "standard" }  // standard | fire | fam_family | friendly_family

// Response 201
{
  "data": {
    "id": "uuid",
    "name": "Andersson Household (Demo)",
    "isDemo": true,
    "demoVariant": "standard",
    "memberCount": 2,
    "accountCount": 8,
    "timelineEntries": 20
  }
}
```

---

## 4. Account Endpoints

### POST `/api/accounts`
Create a new account.

```json
// Request
{
  "householdId": "uuid",
  "name": "ISK Avanza",
  "providerId": "avanza",
  "accountType": "investment",
  "wrapperType": "ISK",
  "currency": "SEK",
  "visibility": "full"
}

// Response 201
{ "data": { "id": "uuid", ...account } }
```

### GET `/api/accounts?householdId=uuid`
List all visible accounts for household (respects visibility rules).

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "ISK Avanza",
      "providerId": "avanza",
      "providerName": "Avanza",
      "accountType": "investment",
      "wrapperType": "ISK",
      "currency": "SEK",
      "visibility": "full",
      "ownerDisplayName": "Isac",
      "isOwn": true,
      "totalValue": 35000000,          // 350,000 SEK in öre
      "holdingsCount": 5,
      "lastSynced": "2026-02-19T18:00:00Z",
      "syncSource": "csv"
    }
  ]
}
```

### GET `/api/accounts/:id`
Get account detail with holdings.

### PATCH `/api/accounts/:id`
Update account settings (name, visibility).

### DELETE `/api/accounts/:id`
Soft-delete an account.

---

## 5. Holdings & Transactions

### GET `/api/accounts/:id/holdings`
List holdings in an account.

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "instrument": {
        "id": "uuid",
        "isin": "SE0011527845",
        "ticker": "AVANZA ZERO",
        "name": "Avanza Zero",
        "assetClass": "fund",
        "currency": "SEK"
      },
      "quantity": 1500.5,
      "averageCost": 12050,             // 120.50 SEK per unit
      "marketValue": 19507650,          // provider-reported/imported value in prototype
      "valueCurrency": "SEK",
      "unrealizedPnl": 1432150,         // +14,321.50 SEK
      "unrealizedPnlPct": 7.93,
      "asOfDate": "2026-02-20"
    }
  ]
}
```

### POST `/api/accounts/:id/holdings`
Add a holding manually.

### GET `/api/accounts/:id/transactions`
List transactions with pagination.

```json
// Query params: ?cursor=uuid&limit=50&type=buy,sell&from=2025-01-01&to=2025-12-31

// Response 200
{
  "data": [...transactions],
  "meta": { "cursor": "uuid", "hasMore": true, "total": 234 }
}
```

### POST `/api/accounts/:id/transactions`
Add a transaction manually.

---

## 6. Import Endpoints

### POST `/api/import/csv`
Upload and parse a CSV file.

```json
// Request: multipart/form-data
// Fields: file (CSV), accountId (UUID), format (avanza | nordnet)

// Response 200
{
  "data": {
    "importId": "uuid",
    "format": "avanza",
    "rowsParsed": 156,
    "holdingsDetected": 8,
    "transactionsDetected": 148,
    "instrumentsResolved": 7,
    "instrumentsUnresolved": 1,
    "preview": {
      "holdings": [...first5],
      "transactions": [...first10]
    },
    "status": "preview"
  }
}
```

### POST `/api/import/:importId/confirm`
Confirm and persist a CSV import.

```json
// Request
{ "importId": "uuid" }

// Response 200
{
  "data": {
    "holdingsCreated": 8,
    "transactionsCreated": 148,
    "accountUpdated": true
  }
}
```

---

## 7. Balance Sheet Endpoints

### GET `/api/balance-sheet?householdId=uuid`
Get household balance sheet with all aggregations.

```json
// Response 200
{
  "data": {
    "totalNetWorth": 243000000,         // 2,430,000 SEK
    "totalAssets": 285000000,
    "totalLiabilities": 42000000,
    "currency": "SEK",
    "asOfDate": "2026-02-20",
    
    "byMember": [
      { "userId": "uuid", "displayName": "Isac", "netWorth": 130000000 },
      { "userId": "uuid", "displayName": "Partner", "netWorth": 113000000 }
    ],
    
    "byAccountType": [
      { "type": "investment", "value": 180000000 },
      { "type": "savings", "value": 45000000 },
      { "type": "pension", "value": 60000000 },
      { "type": "mortgage", "value": -42000000 }
    ],
    
    "allocation": {
      "byAssetClass": [
        { "class": "equity", "value": 120000000, "pct": 49.4 },
        { "class": "fund", "value": 60000000, "pct": 24.7 },
        { "class": "fixed_income", "value": 15000000, "pct": 6.2 },
        { "class": "cash", "value": 48000000, "pct": 19.7 }
      ],
      "byGeography": [...],
      "byCurrency": [...],
      "bySector": [...]
    },
    
    "dataQuality": {
      "coveragePct": 85,
      "staleAccounts": 1,
      "lastFullUpdate": "2026-02-19T18:00:00Z"
    }
  }
}
```

### GET `/api/balance-sheet/history?householdId=uuid&period=12m`
Get net worth over time.

---

## 8. Timeline Endpoints

### GET `/api/timeline?householdId=uuid`
List timeline entries with pagination and filters.

```json
// Query: ?types=life_event,decision&from=2024-01-01&cursor=uuid&limit=20

// Response 200
{
  "data": [
    {
      "id": "uuid",
      "entryType": "life_event",
      "category": "housing",
      "title": "Started apartment search",
      "description": "Looking at 2BR apartments in Södermalm...",
      "entryDate": "2025-09-15",
      "createdBy": { "id": "uuid", "displayName": "Isac" },
      "linkedEvent": { "id": "uuid", "title": "Buying first apartment", "status": "active" },
      "isFuture": false
    }
  ],
  "meta": { "cursor": "uuid", "hasMore": true }
}
```

### POST `/api/timeline`
Add a manual timeline entry.

### PATCH `/api/timeline/:id`
Update a timeline entry.

### DELETE `/api/timeline/:id`
Soft-delete a timeline entry.

---

## 9. Life Event Endpoints

### GET `/api/events/library`
Get available life event types.

```json
// Response 200
{
  "data": [
    {
      "eventType": "buying_apartment",
      "title": "Buying an apartment",
      "description": "Plan your first home purchase with a complete financial playbook",
      "category": "housing",
      "requiredInputs": [
        { "key": "budget", "label": "Budget (SEK)", "type": "currency" },
        { "key": "city", "label": "City", "type": "select", "options": ["Stockholm", "Gothenburg", "Malmö", "Other"] },
        { "key": "targetDate", "label": "Target date", "type": "date" }
      ],
      "available": true
    }
  ]
}
```

### POST `/api/events`
Trigger a life event and generate playbook.

```json
// Request
{
  "householdId": "uuid",
  "eventType": "buying_apartment",
  "title": "Buying our first apartment",
  "inputs": {
    "budget": 350000000,
    "city": "Stockholm",
    "targetDate": "2026-09-01"
  }
}

// Response 201 (playbook generated async — may take 5-15 seconds)
{
  "data": {
    "id": "uuid",
    "eventType": "buying_apartment",
    "status": "active",
    "playbook": {
      "actions": [
        {
          "id": "uuid",
          "title": "Calculate maximum mortgage capacity",
          "description": "Based on your combined income and existing debts...",
          "category": "financial",
          "priority": "critical",
          "assignedTo": null,
          "status": "pending",
          "estimatedImpactDescription": "Determines your realistic price range"
        }
      ],
      "totalActions": 12
    },
    "impactSummary": "Based on a 3.5M SEK apartment purchase...",
    "impactData": {
      "downPaymentRequired": 52500000,
      "monthlyMortgageCost": 1200000,
      "netWorthImpactPct": -15.2,
      "fitnessScoreImpact": -45
    }
  }
}
```

### PATCH `/api/events/:id/actions/:actionId`
Update a playbook action (assign, complete, skip).

---

## 10. Quarterly Review Endpoints

### POST `/api/reviews/generate`
Generate a new quarterly review (async — background job).

```json
// Request
{ "householdId": "uuid" }

// Response 202
{ "data": { "reviewId": "uuid", "status": "generating", "estimatedSeconds": 30 } }
```

### GET `/api/reviews/:id`
Get a quarterly review.

### GET `/api/reviews?householdId=uuid`
List all reviews for a household.

### GET `/api/reviews/:id/pdf`
Get a downloadable PDF export for a quarterly review.

```json
// Response 200
{
  "data": {
    "reviewId": "uuid",
    "downloadUrl": "https://storage.example.com/reviews/q1-2026.pdf?token=...",
    "expiresAt": "2026-02-20T12:30:00Z",
    "fileName": "fyrk-quarterly-review-q1-2026.pdf",
    "status": "ready"
  }
}
```

Notes:
- If a PDF is not generated yet, return `409` with `error.code = "REVIEW_PDF_NOT_READY"`.
- `downloadUrl` should be a short-lived signed URL from storage.

---

## 11. Financial Fitness Endpoints

### GET `/api/fitness?householdId=uuid`
Get current fitness score and history.

```json
// Response 200
{
  "data": {
    "current": {
      "totalScore": 720,
      "bufferScore": 160,
      "growthScore": 140,
      "protectionScore": 100,
      "efficiencyScore": 160,
      "trajectoryScore": 160,
      "explanation": "Your household financial fitness is strong at 720...",
      "suggestedActions": [
        {
          "component": "protection",
          "title": "Review life insurance coverage",
          "impact": "+20 points",
          "description": "Your household has a 1.2M SEK coverage gap..."
        }
      ],
      "calculatedAt": "2026-02-20"
    },
    "history": [
      { "date": "2026-02-20", "score": 720 },
      { "date": "2026-01-20", "score": 700 },
      { "date": "2025-12-20", "score": 680 }
    ]
  }
}
```

---

## 12. Proposal Endpoints

### POST `/api/proposals`
Create a financial proposal.

```json
// Request
{
  "householdId": "uuid",
  "title": "Invest 50K in Nordic REIT ETF",
  "description": "I think we should diversify into Nordic real estate...",
  "category": "investment"
}

// Response 201 (impact analysis auto-computed)
{
  "data": {
    "id": "uuid",
    "title": "Invest 50K in Nordic REIT ETF",
    "status": "pending",
    "impactAnalysis": {
      "allocationChange": { "realEstate": { "from": 0, "to": 2.1 } },
      "fitnessImpact": "+5 (growth component)",
      "riskAssessment": "Adds real estate diversification; moderate currency risk"
    },
    "requiresApprovalFrom": ["partner-uuid"],
    "createdBy": { "id": "uuid", "displayName": "Isac" }
  }
}
```

### GET `/api/proposals?householdId=uuid&status=pending`
List proposals.

### POST `/api/proposals/:id/approve`
Approve a proposal.

### POST `/api/proposals/:id/reject`
Reject a proposal (with reason).

### POST `/api/proposals/:id/comments`
Add a comment to a proposal discussion.

---

## 13. AI Generation Endpoints

### POST `/api/ai/narrative`
Generate "What Changed This Week" narrative.

```json
// Request
{ "householdId": "uuid" }

// Response 200
{
  "data": {
    "narrative": "This week your household net worth grew by 12,400 SEK...",
    "highlights": [
      { "type": "positive", "text": "ISK Avanza up 2.3% on strong Nordic markets" },
      { "type": "neutral", "text": "No new transactions this week" },
      { "type": "action", "text": "Your mortgage fixed rate expires in 8 months" }
    ],
    "generatedAt": "2026-02-20T12:00:00Z"
  }
}
```

---

## 14. User Data Endpoints (GDPR)

### GET `/api/user/data-export`
Export all user data as JSON.

### DELETE `/api/user/account`
Delete user account and all associated data.
