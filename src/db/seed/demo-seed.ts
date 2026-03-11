import postgres from "postgres";

import {
  buildDemoSeedDataset,
  demoVariants,
  type DemoSeedDataset,
  type DemoVariant,
  type DemoVariantSummary,
} from "@/db/seed/demo-dataset";

interface SeedMode {
  shouldReset: boolean;
  shouldSeed: boolean;
}

interface VariantCountRow {
  demo_variant: DemoVariant;
  count: number;
}

const insertChunkSize = 250;
type DbClient = ReturnType<typeof postgres>;

function toChunks<T>(items: T[], size: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function parseMode(argv: string[]): SeedMode {
  const args = new Set(argv);
  const seedOnly = args.has("--seed-only");
  const resetOnly = args.has("--reset-only");

  if (seedOnly && resetOnly) {
    throw new Error("Cannot combine --seed-only and --reset-only.");
  }

  return {
    shouldReset: !seedOnly,
    shouldSeed: !resetOnly,
  };
}

function resolveDatabaseUrl(): string {
  const value = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!value) {
    throw new Error("Missing DATABASE_URL (or SUPABASE_DB_URL).");
  }

  return value;
}

function resolveSslSetting(databaseUrl: string): "require" | false {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    return "require";
  }

  const sslMode = parsed.searchParams.get("sslmode");
  if (sslMode === "disable") {
    return false;
  }

  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    return false;
  }

  return "require";
}

function createEmptySummary(): DemoVariantSummary {
  return {
    households: 0,
    accounts: 0,
    holdings: 0,
    transactions: 0,
    timelineEntries: 0,
    lifeEvents: 0,
    accountSnapshots: 0,
    householdSnapshots: 0,
    fitnessScores: 0,
    weeklyNarratives: 0,
    quarterlyReviews: 0,
  };
}

function createSummaryByVariant(): Record<DemoVariant, DemoVariantSummary> {
  return {
    standard: createEmptySummary(),
    fire: createEmptySummary(),
    fam_family: createEmptySummary(),
    friendly_family: createEmptySummary(),
  };
}

function printSummary(
  title: string,
  summary: Record<DemoVariant, DemoVariantSummary>,
  totals: DemoVariantSummary,
): void {
  console.log(title);
  for (const variant of demoVariants) {
    const row = summary[variant];
    console.log(
      [
        `  ${variant}`,
        `households=${row.households}`,
        `accounts=${row.accounts}`,
        `holdings=${row.holdings}`,
        `transactions=${row.transactions}`,
        `timeline=${row.timelineEntries}`,
        `lifeEvents=${row.lifeEvents}`,
        `accountSnapshots=${row.accountSnapshots}`,
        `householdSnapshots=${row.householdSnapshots}`,
        `fitness=${row.fitnessScores}`,
        `narratives=${row.weeklyNarratives}`,
        `reviews=${row.quarterlyReviews}`,
      ].join(" | "),
    );
  }

  console.log(
    [
      "  totals",
      `households=${totals.households}`,
      `accounts=${totals.accounts}`,
      `holdings=${totals.holdings}`,
      `transactions=${totals.transactions}`,
      `timeline=${totals.timelineEntries}`,
      `lifeEvents=${totals.lifeEvents}`,
      `accountSnapshots=${totals.accountSnapshots}`,
      `householdSnapshots=${totals.householdSnapshots}`,
      `fitness=${totals.fitnessScores}`,
      `narratives=${totals.weeklyNarratives}`,
      `reviews=${totals.quarterlyReviews}`,
    ].join(" | "),
  );
}

function sumSummary(summary: Record<DemoVariant, DemoVariantSummary>): DemoVariantSummary {
  const totals = createEmptySummary();

  for (const variant of demoVariants) {
    const row = summary[variant];
    totals.households += row.households;
    totals.accounts += row.accounts;
    totals.holdings += row.holdings;
    totals.transactions += row.transactions;
    totals.timelineEntries += row.timelineEntries;
    totals.lifeEvents += row.lifeEvents;
    totals.accountSnapshots += row.accountSnapshots;
    totals.householdSnapshots += row.householdSnapshots;
    totals.fitnessScores += row.fitnessScores;
    totals.weeklyNarratives += row.weeklyNarratives;
    totals.quarterlyReviews += row.quarterlyReviews;
  }

  return totals;
}

function assertMatchesExpected(
  expected: Record<DemoVariant, DemoVariantSummary>,
  actual: Record<DemoVariant, DemoVariantSummary>,
): void {
  const metrics: Array<keyof DemoVariantSummary> = [
    "households",
    "accounts",
    "holdings",
    "transactions",
    "timelineEntries",
    "lifeEvents",
    "accountSnapshots",
    "householdSnapshots",
    "fitnessScores",
    "weeklyNarratives",
    "quarterlyReviews",
  ];

  const mismatches: string[] = [];

  for (const variant of demoVariants) {
    for (const metric of metrics) {
      if (expected[variant][metric] !== actual[variant][metric]) {
        mismatches.push(
          `${variant}.${metric}: expected=${expected[variant][metric]} actual=${actual[variant][metric]}`,
        );
      }
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Seed verification mismatch:\n${mismatches.join("\n")}`);
  }
}

async function resetDemoData(sql: DbClient, dataset: DemoSeedDataset): Promise<void> {
  const householdIds = dataset.households.map((row) => row.id);
  const accountIds = dataset.accounts.map((row) => row.id);
  const userIds = dataset.users.map((row) => row.id);
  const userEmails = dataset.users.map((row) => row.email);
  const instrumentIds = dataset.instruments.map((row) => row.id);

  await sql.begin(async (trx) => {
    const tx = trx as unknown as DbClient;
    const householdArray = tx.array(householdIds);
    const accountArray = tx.array(accountIds);
    const userArray = tx.array(userIds);
    const emailArray = tx.array(userEmails);
    const instrumentArray = tx.array(instrumentIds);

    await tx`delete from public.audit_log where household_id = any(${householdArray}::uuid[])`;

    await tx`
      delete from public.proposal_comments
      where proposal_id in (
        select id from public.proposals where household_id = any(${householdArray}::uuid[])
      )
    `;

    await tx`
      delete from public.proposal_approvals
      where proposal_id in (
        select id from public.proposals where household_id = any(${householdArray}::uuid[])
      )
    `;

    await tx`delete from public.proposals where household_id = any(${householdArray}::uuid[])`;
    await tx`delete from public.quarterly_reviews where household_id = any(${householdArray}::uuid[])`;
    await tx`delete from public.fitness_scores where household_id = any(${householdArray}::uuid[])`;

    await tx`
      delete from public.playbook_actions
      where life_event_id in (
        select id from public.life_events where household_id = any(${householdArray}::uuid[])
      )
    `;

    await tx`delete from public.life_events where household_id = any(${householdArray}::uuid[])`;
    await tx`delete from public.timeline_entries where household_id = any(${householdArray}::uuid[])`;
    await tx`delete from public.weekly_narrative_cache where household_id = any(${householdArray}::uuid[])`;
    await tx`delete from public.household_snapshots where household_id = any(${householdArray}::uuid[])`;

    await tx`delete from public.account_snapshots where account_id = any(${accountArray}::uuid[])`;
    await tx`delete from public.transactions where account_id = any(${accountArray}::uuid[])`;
    await tx`delete from public.holdings where account_id = any(${accountArray}::uuid[])`;

    await tx`
      delete from public.import_rows
      where import_job_id in (
        select id from public.import_jobs where account_id = any(${accountArray}::uuid[])
      )
    `;

    await tx`delete from public.import_jobs where account_id = any(${accountArray}::uuid[])`;
    await tx`delete from public.accounts where id = any(${accountArray}::uuid[])`;
    await tx`delete from public.household_members where household_id = any(${householdArray}::uuid[])`;
    await tx`delete from public.households where id = any(${householdArray}::uuid[])`;

    await tx`delete from public.profiles where id = any(${userArray}::uuid[])`;
    await tx`delete from auth.users where id = any(${userArray}::uuid[]) or email = any(${emailArray}::text[])`;

    await tx`delete from public.instruments where id = any(${instrumentArray}::uuid[])`;
  });
}

async function insertDemoData(sql: DbClient, dataset: DemoSeedDataset): Promise<void> {
  await sql.begin(async (trx) => {
    const tx = trx as unknown as DbClient;
    for (const batch of toChunks(dataset.authUsers, insertChunkSize)) {
      await tx`
        insert into auth.users ${tx(batch, [
          "id",
          "aud",
          "role",
          "email",
          "encrypted_password",
          "email_confirmed_at",
          "raw_app_meta_data",
          "raw_user_meta_data",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          email = excluded.email,
          raw_app_meta_data = excluded.raw_app_meta_data,
          raw_user_meta_data = excluded.raw_user_meta_data,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.profiles, insertChunkSize)) {
      await tx`
        insert into public.profiles ${tx(batch, [
          "id",
          "email",
          "display_name",
          "base_currency",
          "locale",
          "onboarding_completed",
          "is_demo_user",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          email = excluded.email,
          display_name = excluded.display_name,
          base_currency = excluded.base_currency,
          locale = excluded.locale,
          onboarding_completed = excluded.onboarding_completed,
          is_demo_user = excluded.is_demo_user,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.households, insertChunkSize)) {
      await tx`
        insert into public.households ${tx(batch, [
          "id",
          "name",
          "type",
          "base_currency",
          "is_demo",
          "demo_variant",
          "created_by",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          name = excluded.name,
          type = excluded.type,
          base_currency = excluded.base_currency,
          is_demo = excluded.is_demo,
          demo_variant = excluded.demo_variant,
          created_by = excluded.created_by,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.householdMembers, insertChunkSize)) {
      await tx`
        insert into public.household_members ${tx(batch, [
          "id",
          "household_id",
          "user_id",
          "role",
          "status",
          "invited_email",
          "invited_at",
          "joined_at",
          "created_at",
          "updated_at",
        ])}
        on conflict (household_id, user_id) do update
        set
          role = excluded.role,
          status = excluded.status,
          invited_email = excluded.invited_email,
          invited_at = excluded.invited_at,
          joined_at = excluded.joined_at,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.instruments, insertChunkSize)) {
      await tx`
        insert into public.instruments ${tx(batch, [
          "id",
          "isin",
          "ticker",
          "name",
          "asset_class",
          "currency",
          "exchange",
          "country",
          "sector",
          "last_price",
          "last_price_at",
          "price_source",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          isin = excluded.isin,
          ticker = excluded.ticker,
          name = excluded.name,
          asset_class = excluded.asset_class,
          currency = excluded.currency,
          exchange = excluded.exchange,
          country = excluded.country,
          sector = excluded.sector,
          last_price = excluded.last_price,
          last_price_at = excluded.last_price_at,
          price_source = excluded.price_source,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.accounts, insertChunkSize)) {
      await tx`
        insert into public.accounts ${tx(batch, [
          "id",
          "household_id",
          "owner_user_id",
          "provider_id",
          "provider_name",
          "name",
          "account_type",
          "wrapper_type",
          "currency",
          "visibility",
          "external_id",
          "last_synced",
          "sync_source",
          "is_active",
          "notes",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          household_id = excluded.household_id,
          owner_user_id = excluded.owner_user_id,
          provider_id = excluded.provider_id,
          provider_name = excluded.provider_name,
          name = excluded.name,
          account_type = excluded.account_type,
          wrapper_type = excluded.wrapper_type,
          currency = excluded.currency,
          visibility = excluded.visibility,
          external_id = excluded.external_id,
          last_synced = excluded.last_synced,
          sync_source = excluded.sync_source,
          is_active = excluded.is_active,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.holdings, insertChunkSize)) {
      await tx`
        insert into public.holdings ${tx(batch, [
          "id",
          "account_id",
          "instrument_id",
          "quantity",
          "average_cost",
          "cost_currency",
          "market_value",
          "value_currency",
          "as_of_date",
          "source",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          account_id = excluded.account_id,
          instrument_id = excluded.instrument_id,
          quantity = excluded.quantity,
          average_cost = excluded.average_cost,
          cost_currency = excluded.cost_currency,
          market_value = excluded.market_value,
          value_currency = excluded.value_currency,
          as_of_date = excluded.as_of_date,
          source = excluded.source,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.transactions, insertChunkSize)) {
      await tx`
        insert into public.transactions ${tx(batch, [
          "id",
          "account_id",
          "instrument_id",
          "type",
          "quantity",
          "price",
          "amount",
          "currency",
          "fee_amount",
          "fee_currency",
          "fx_rate",
          "fx_amount",
          "fx_currency",
          "transaction_date",
          "settlement_date",
          "description",
          "external_ref",
          "source",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          account_id = excluded.account_id,
          instrument_id = excluded.instrument_id,
          type = excluded.type,
          quantity = excluded.quantity,
          price = excluded.price,
          amount = excluded.amount,
          currency = excluded.currency,
          fee_amount = excluded.fee_amount,
          fee_currency = excluded.fee_currency,
          fx_rate = excluded.fx_rate,
          fx_amount = excluded.fx_amount,
          fx_currency = excluded.fx_currency,
          transaction_date = excluded.transaction_date,
          settlement_date = excluded.settlement_date,
          description = excluded.description,
          external_ref = excluded.external_ref,
          source = excluded.source,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.accountSnapshots, insertChunkSize)) {
      await tx`
        insert into public.account_snapshots ${tx(batch, [
          "id",
          "account_id",
          "snapshot_date",
          "total_value",
          "cash_balance",
          "currency",
          "created_at",
        ])}
        on conflict (account_id, snapshot_date) do update
        set
          total_value = excluded.total_value,
          cash_balance = excluded.cash_balance,
          currency = excluded.currency,
          created_at = excluded.created_at
      `;
    }

    for (const batch of toChunks(dataset.householdSnapshots, insertChunkSize)) {
      await tx`
        insert into public.household_snapshots ${tx(batch, [
          "id",
          "household_id",
          "snapshot_date",
          "total_net_worth",
          "total_assets",
          "total_liabilities",
          "currency",
          "created_at",
        ])}
        on conflict (household_id, snapshot_date) do update
        set
          total_net_worth = excluded.total_net_worth,
          total_assets = excluded.total_assets,
          total_liabilities = excluded.total_liabilities,
          currency = excluded.currency,
          created_at = excluded.created_at
      `;
    }

    for (const batch of toChunks(dataset.timelineEntries, insertChunkSize)) {
      await tx`
        insert into public.timeline_entries ${tx(batch, [
          "id",
          "household_id",
          "created_by",
          "entry_type",
          "category",
          "title",
          "description",
          "reasoning",
          "expected_outcome",
          "linked_account_ids",
          "linked_proposal_id",
          "linked_review_id",
          "linked_event_id",
          "entry_date",
          "is_future",
          "metadata",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          household_id = excluded.household_id,
          created_by = excluded.created_by,
          entry_type = excluded.entry_type,
          category = excluded.category,
          title = excluded.title,
          description = excluded.description,
          reasoning = excluded.reasoning,
          expected_outcome = excluded.expected_outcome,
          linked_account_ids = excluded.linked_account_ids,
          linked_proposal_id = excluded.linked_proposal_id,
          linked_review_id = excluded.linked_review_id,
          linked_event_id = excluded.linked_event_id,
          entry_date = excluded.entry_date,
          is_future = excluded.is_future,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.lifeEvents, insertChunkSize)) {
      await tx`
        insert into public.life_events ${tx(batch, [
          "id",
          "household_id",
          "triggered_by",
          "event_type",
          "title",
          "status",
          "inputs",
          "impact_summary",
          "impact_data",
          "target_date",
          "completed_at",
          "timeline_entry_id",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          household_id = excluded.household_id,
          triggered_by = excluded.triggered_by,
          event_type = excluded.event_type,
          title = excluded.title,
          status = excluded.status,
          inputs = excluded.inputs,
          impact_summary = excluded.impact_summary,
          impact_data = excluded.impact_data,
          target_date = excluded.target_date,
          completed_at = excluded.completed_at,
          timeline_entry_id = excluded.timeline_entry_id,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.playbookActions, insertChunkSize)) {
      await tx`
        insert into public.playbook_actions ${tx(batch, [
          "id",
          "life_event_id",
          "title",
          "description",
          "category",
          "priority",
          "sort_order",
          "assigned_to",
          "status",
          "estimated_impact_amount",
          "estimated_impact_description",
          "completed_at",
          "completion_notes",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          life_event_id = excluded.life_event_id,
          title = excluded.title,
          description = excluded.description,
          category = excluded.category,
          priority = excluded.priority,
          sort_order = excluded.sort_order,
          assigned_to = excluded.assigned_to,
          status = excluded.status,
          estimated_impact_amount = excluded.estimated_impact_amount,
          estimated_impact_description = excluded.estimated_impact_description,
          completed_at = excluded.completed_at,
          completion_notes = excluded.completion_notes,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.fitnessScores, insertChunkSize)) {
      await tx`
        insert into public.fitness_scores ${tx(batch, [
          "id",
          "household_id",
          "total_score",
          "buffer_score",
          "growth_score",
          "protection_score",
          "efficiency_score",
          "trajectory_score",
          "component_details",
          "explanation",
          "suggested_actions",
          "calculated_at",
          "created_at",
        ])}
        on conflict (id) do update
        set
          household_id = excluded.household_id,
          total_score = excluded.total_score,
          buffer_score = excluded.buffer_score,
          growth_score = excluded.growth_score,
          protection_score = excluded.protection_score,
          efficiency_score = excluded.efficiency_score,
          trajectory_score = excluded.trajectory_score,
          component_details = excluded.component_details,
          explanation = excluded.explanation,
          suggested_actions = excluded.suggested_actions,
          calculated_at = excluded.calculated_at,
          created_at = excluded.created_at
      `;
    }

    for (const batch of toChunks(dataset.weeklyNarratives, insertChunkSize)) {
      await tx`
        insert into public.weekly_narrative_cache ${tx(batch, [
          "id",
          "household_id",
          "as_of_week",
          "context_hash",
          "narrative",
          "highlights",
          "source",
          "generated_at",
          "created_at",
          "updated_at",
        ])}
        on conflict (household_id, as_of_week) do update
        set
          context_hash = excluded.context_hash,
          narrative = excluded.narrative,
          highlights = excluded.highlights,
          source = excluded.source,
          generated_at = excluded.generated_at,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `;
    }

    for (const batch of toChunks(dataset.quarterlyReviews, insertChunkSize)) {
      await tx`
        insert into public.quarterly_reviews ${tx(batch, [
          "id",
          "household_id",
          "period_start",
          "period_end",
          "quarter_label",
          "net_worth_start",
          "net_worth_end",
          "net_worth_change",
          "market_returns_amount",
          "net_savings_amount",
          "debt_reduction_amount",
          "fees_drag_amount",
          "narrative",
          "recommendations",
          "fitness_score",
          "fitness_components",
          "upcoming_events",
          "status",
          "generated_at",
          "published_at",
          "timeline_entry_id",
          "created_at",
          "updated_at",
        ])}
        on conflict (id) do update
        set
          household_id = excluded.household_id,
          period_start = excluded.period_start,
          period_end = excluded.period_end,
          quarter_label = excluded.quarter_label,
          net_worth_start = excluded.net_worth_start,
          net_worth_end = excluded.net_worth_end,
          net_worth_change = excluded.net_worth_change,
          market_returns_amount = excluded.market_returns_amount,
          net_savings_amount = excluded.net_savings_amount,
          debt_reduction_amount = excluded.debt_reduction_amount,
          fees_drag_amount = excluded.fees_drag_amount,
          narrative = excluded.narrative,
          recommendations = excluded.recommendations,
          fitness_score = excluded.fitness_score,
          fitness_components = excluded.fitness_components,
          upcoming_events = excluded.upcoming_events,
          status = excluded.status,
          generated_at = excluded.generated_at,
          published_at = excluded.published_at,
          timeline_entry_id = excluded.timeline_entry_id,
          updated_at = excluded.updated_at
      `;
    }
  });
}

function applyCountRows(
  summary: Record<DemoVariant, DemoVariantSummary>,
  rows: VariantCountRow[],
  field: keyof DemoVariantSummary,
): void {
  for (const row of rows) {
    summary[row.demo_variant][field] = Number(row.count);
  }
}

async function loadActualSummary(
  sql: DbClient,
  dataset: DemoSeedDataset,
): Promise<Record<DemoVariant, DemoVariantSummary>> {
  const summary = createSummaryByVariant();
  const householdIds = dataset.households.map((row) => row.id);

  if (householdIds.length === 0) {
    return summary;
  }

  const householdArray = sql.array(householdIds);

  const householdRows = await sql<VariantCountRow[]>`
    select demo_variant, count(*)::int as count
    from public.households
    where id = any(${householdArray}::uuid[])
    group by demo_variant
  `;
  applyCountRows(summary, householdRows, "households");

  const accountRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(a.id)::int as count
    from public.accounts a
    join public.households h on h.id = a.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, accountRows, "accounts");

  const holdingRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(ho.id)::int as count
    from public.holdings ho
    join public.accounts a on a.id = ho.account_id
    join public.households h on h.id = a.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, holdingRows, "holdings");

  const transactionRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(t.id)::int as count
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    join public.households h on h.id = a.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, transactionRows, "transactions");

  const timelineRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(te.id)::int as count
    from public.timeline_entries te
    join public.households h on h.id = te.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, timelineRows, "timelineEntries");

  const lifeEventRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(le.id)::int as count
    from public.life_events le
    join public.households h on h.id = le.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, lifeEventRows, "lifeEvents");

  const accountSnapshotRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(s.id)::int as count
    from public.account_snapshots s
    join public.accounts a on a.id = s.account_id
    join public.households h on h.id = a.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, accountSnapshotRows, "accountSnapshots");

  const householdSnapshotRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(s.id)::int as count
    from public.household_snapshots s
    join public.households h on h.id = s.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, householdSnapshotRows, "householdSnapshots");

  const fitnessRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(f.id)::int as count
    from public.fitness_scores f
    join public.households h on h.id = f.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, fitnessRows, "fitnessScores");

  const narrativeRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(n.id)::int as count
    from public.weekly_narrative_cache n
    join public.households h on h.id = n.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, narrativeRows, "weeklyNarratives");

  const reviewRows = await sql<VariantCountRow[]>`
    select h.demo_variant, count(r.id)::int as count
    from public.quarterly_reviews r
    join public.households h on h.id = r.household_id
    where h.id = any(${householdArray}::uuid[])
    group by h.demo_variant
  `;
  applyCountRows(summary, reviewRows, "quarterlyReviews");

  return summary;
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const dataset = buildDemoSeedDataset();

  console.log("Demo seed mode:", mode.shouldReset && mode.shouldSeed ? "reseed" : mode.shouldReset ? "reset-only" : "seed-only");

  const databaseUrl = resolveDatabaseUrl();
  const ssl = resolveSslSetting(databaseUrl);
  const sql = postgres(databaseUrl, {
    ssl,
    max: 1,
    prepare: false,
  });

  try {
    if (mode.shouldReset) {
      await resetDemoData(sql, dataset);
      console.log("Reset complete.");
    }

    if (mode.shouldSeed) {
      await insertDemoData(sql, dataset);
      console.log("Insert complete.");
    }

    const actual = await loadActualSummary(sql, dataset);
    const actualTotals = sumSummary(actual);

    if (mode.shouldSeed) {
      assertMatchesExpected(dataset.expectedByVariant, actual);
    }

    printSummary("Demo seed verification:", actual, actualTotals);

    if (mode.shouldSeed) {
      console.log("Seed verification matched expected deterministic counts.");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Demo seed failed:", message);
  process.exitCode = 1;
});
