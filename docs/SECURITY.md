# FYRK — Security & Privacy
## Authentication, Authorization, Data Protection, and Compliance

> **Version:** 0.1
> **Source:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA_MODEL.md](./DATA_MODEL.md)
> **Consumed by:** All agents (security is cross-cutting)

---

## 1. Authentication

### Supabase Auth configuration

| Setting | Value | Rationale |
|---|---|---|
| Primary method | Magic link (email) | Passwordless = simpler + more secure for household context |
| Session duration | 7 days | Financial app = reasonable session length |
| Refresh token | 30 days | Auto-refresh if user returns within 30 days |
| MFA | Deferred to v1 | Add TOTP before public launch |
| OAuth providers | Deferred to v1 | Google/BankID after prototype |
| Email confirmation | Required | Prevent spam accounts |

### Session management

```typescript
// Middleware: every protected route checks session
// src/lib/auth/middleware.ts

export async function requireAuth(request: Request) {
  const supabase = createServerClient(cookies())
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/login')
  }
  
  return session
}

// Household context: most routes also need household membership
export async function requireHouseholdAccess(
  request: Request, 
  householdId: string
) {
  const session = await requireAuth(request)
  const membership = await getMembership(session.user.id, householdId)
  
  if (!membership || membership.status !== 'active') {
    throw new ForbiddenError('Not a member of this household')
  }
  
  return { session, membership }
}
```

### Invitation flow

```
1. Owner creates household → becomes "owner" role member
2. Owner enters partner's email → system creates HouseholdMember with status="invited"
3. System sends magic link to partner's email via Resend
4. Partner clicks link → creates account (or logs in if exists) → status changes to "active"
5. Partner sees household dashboard
```

---

## 2. Authorization (Role-Based Access)

### Household roles

| Role | Can view | Can edit | Can propose | Can approve | Can manage members |
|---|---|---|---|---|---|
| **Owner** | All visible accounts | Own accounts | ✅ | ✅ | ✅ |
| **Admin** | All visible accounts | Own accounts | ✅ | ✅ | ✅ |
| **Member** | All visible accounts | Own accounts | ✅ | ✅ | ❌ |
| **Viewer** | All visible accounts | ❌ | ❌ | ❌ | ❌ |

### Account visibility rules

Each account has a `visibility` setting controlled by its owner:
- `full` — visible to all household members with full details
- `amount_hidden` — account exists and type is visible, but amounts are redacted
- `private` — completely invisible to other household members

**Enforcement:** Service layer filters accounts based on requesting user + visibility setting. Never rely on frontend hiding.

---

## 3. Row-Level Security (RLS)

All tables have RLS enabled. Users can only access data connected to their households.

### Core RLS policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profile: users can only read/update their own
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Households: members can read their households
CREATE POLICY "Members can read household"
  ON public.households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Accounts: household members can read (filtered by visibility in service layer)
CREATE POLICY "Household members can read accounts"
  ON public.accounts FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND deleted_at IS NULL
  );

-- Accounts: only owner can modify
CREATE POLICY "Account owners can update"
  ON public.accounts FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Account owners can insert"
  ON public.accounts FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Holdings, Transactions: same household membership check
CREATE POLICY "Household members can read holdings"
  ON public.holdings FOR SELECT
  USING (
    account_id IN (
      SELECT a.id FROM public.accounts a
      JOIN public.household_members hm ON hm.household_id = a.household_id
      WHERE hm.user_id = auth.uid() AND hm.status = 'active'
      AND a.deleted_at IS NULL
    )
  );

-- Similar policies for: transactions, timeline_entries, life_events,
-- playbook_actions, quarterly_reviews, fitness_scores, proposals,
-- proposal_comments, audit_log
-- Pattern: user must be active member of the entity's household
```

---

## 4. Data Encryption

| Layer | Mechanism | Notes |
|---|---|---|
| **In transit** | TLS 1.3 (Vercel + Supabase) | All connections encrypted |
| **At rest** | AES-256 (Supabase managed) | Automatic for all Supabase databases |
| **Backups** | Encrypted (Supabase managed) | Point-in-time recovery |
| **File uploads (CSV)** | Supabase Storage (encrypted) | Files deleted after processing (retention: 24h) |
| **API keys** | Environment variables | Never committed to git; Vercel env management |
| **Sensitive fields** | Application-level encryption for notes/descriptions | Deferred to v1; RLS sufficient for prototype |

---

## 5. GDPR Compliance

### Data processing basis

| Data | Legal basis | Justification |
|---|---|---|
| Account/name/email | Contract (Article 6(1)(b)) | Required to provide the service |
| Financial data | Consent (Article 6(1)(a)) | User explicitly imports/enters data |
| AI-processed data | Legitimate interest (Article 6(1)(f)) | Core service functionality |
| Analytics data | Legitimate interest (Article 6(1)(f)) | Service improvement |

### User rights implementation

| Right | Implementation | Priority |
|---|---|---|
| **Right to access** | `GET /api/user/data-export` — export all user data as JSON | P0 |
| **Right to erasure** | `DELETE /api/user/account` — cascade delete all data | P0 |
| **Right to rectification** | Standard edit functionality across all entities | P0 |
| **Right to portability** | JSON export of all structured data | P1 |
| **Right to withdraw consent** | Remove specific accounts/data sources | P0 |
| **Right to restrict processing** | Pause AI processing flag | P1 |

### Consent management

```typescript
// Each external data connection requires explicit consent
// Persisted in: public.data_consents (see DATA_MODEL.md)
interface DataConsent {
  id: string
  userId: string
  provider: string           // "avanza" | "nordnet" | etc.
  consentType: 'manual' | 'csv' | 'psd2' | 'fida'
  dataTypes: string[]        // ["accounts", "holdings", "transactions"]
  consentedAt: Date
  revokedAt?: Date
  expiresAt?: Date           // FiDA may require time-limited consent
}
```

### Data retention policy

| Data type | Retention | After deletion |
|---|---|---|
| Active account data | While account exists | Soft-deleted → 30 days → hard delete |
| CSV uploads | 24 hours after processing | Auto-deleted |
| AI-generated content | While household exists | Deleted with household |
| Audit logs | 2 years | Anonymized after 2 years |
| Fitness score history | While household exists | Deleted with household |
| Demo data | Persistent (system data) | Not user data |

---

## 6. API Security

### Rate limiting

| Endpoint category | Limit | Window |
|---|---|---|
| Auth (login/signup) | 10 requests | 15 minutes |
| AI generation endpoints | 5 requests | 1 minute |
| CSV import | 3 requests | 5 minutes |
| Read endpoints | 100 requests | 1 minute |
| Write endpoints | 30 requests | 1 minute |

### Input validation

Every API endpoint validates input with Zod schemas before processing:

```typescript
// Pattern: validate at the route handler level
const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  providerId: z.string().min(1),
  accountType: z.enum(['investment', 'savings', 'pension', 'loan', 'mortgage', 'insurance']),
  wrapperType: z.enum(['ISK', 'KF', 'depa', 'PPM', 'tjanstepension', 'private_pension']).nullable(),
  currency: z.string().length(3),
  visibility: z.enum(['full', 'amount_hidden', 'private']).default('full'),
})
```

### Security headers (Vercel / Next.js)

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]
```

---

## 7. Audit Logging

Every mutation is logged:

```typescript
// Service layer pattern
async function createAccount(userId: string, householdId: string, data: CreateAccountInput) {
  const account = await db.insert(accounts).values({ ...data, householdId, ownerUserId: userId })
  
  await db.insert(auditLog).values({
    householdId,
    userId,
    action: 'account.created',
    entityType: 'account',
    entityId: account.id,
    changes: { new: data },
  })
  
  return account
}
```

Audited actions: all creates, updates, deletes on accounts, holdings, proposals (approval/rejection), household member changes, privacy setting changes, data exports.
