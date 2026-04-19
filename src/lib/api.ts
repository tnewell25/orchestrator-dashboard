import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://orchestrator-production-302b.up.railway.app";

// --- Types (match backend dashboard_api.py responses exactly) ---

export interface PipelineDeal {
  id: string;
  name: string;
  stage: string;
  value_usd: number;
  company: string;
  next_step: string;
  close_date: string | null;
  updated_at: string;
}

export interface PipelineResponse {
  stages: Record<string, PipelineDeal[]>;
  total_deals: number;
}

export interface MeddicData {
  metrics: string;
  economic_buyer: string;
  champion: string;
  decision_criteria: string;
  decision_process: string;
  paper_process: string;
  pain: string;
}

export interface Stakeholder {
  id: string;
  contact_id: string;
  role: string;
  sentiment: string;
  influence: string;
  name: string;
  title: string;
}

export interface Meeting {
  id: string;
  date: string;
  summary: string;
  attendees: string;
  decisions: string;
}

export interface ActionItemData {
  id: string;
  description: string;
  status: string;
  due_date: string | null;
  source: string;
}

export interface BidData {
  id: string;
  name: string;
  stage: string;
  value_usd: number;
  submission_deadline: string | null;
}

export interface DealDetailResponse {
  deal: {
    id: string;
    name: string;
    stage: string;
    value_usd: number;
    close_date: string | null;
    next_step: string;
    notes: string;
    competitors: string;
    company: string;
  };
  meddic: MeddicData;
  meddic_gaps: string[];
  stakeholders: Stakeholder[];
  meetings: Meeting[];
  action_items: ActionItemData[];
  bids: BidData[];
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  company: string;
  personal_notes: string;
  last_touch: string | null;
}

export interface ActivityEvent {
  type: string;
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  deal_id: string | null;
}

export interface AnalyticsResponse {
  total_deals: number;
  active_deals: number;
  total_pipeline_value: number;
  active_pipeline_value: number;
  won_value: number;
  win_rate: number;
  open_actions: number;
  by_stage: Record<string, { count: number; value: number }>;
}

export interface UsageModelData {
  turns: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  cache_hit_ratio: number;
  estimated_cost_usd: number;
}

export interface UsageResponse {
  window_hours: number | string;
  total_turns: number;
  total_estimated_cost_usd: number;
  cache_savings_vs_uncached_usd: number;
  by_model: Record<string, UsageModelData>;
}

// --- Fetch helpers ---

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function apiWrite<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = new URL(path, BASE_URL);
  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {}
    throw new Error(`API ${method} ${path} ${res.status}: ${detail}`);
  }
  return res.json();
}

export function fetchPipeline(): Promise<PipelineResponse> {
  return apiFetch<PipelineResponse>("/api/dashboard/pipeline");
}

export function fetchDealDetail(id: string): Promise<DealDetailResponse> {
  return apiFetch<DealDetailResponse>(`/api/dashboard/deals/${id}`);
}

export async function fetchContacts(query?: string): Promise<Contact[]> {
  const params = query ? { q: query } : undefined;
  const resp = await apiFetch<{ contacts: Contact[] }>("/api/dashboard/contacts", params);
  return resp.contacts;
}

export async function fetchActivity(hours: number = 72): Promise<ActivityEvent[]> {
  const resp = await apiFetch<{ events: ActivityEvent[] }>("/api/dashboard/activity", {
    hours: String(hours),
  });
  return resp.events;
}

export function fetchAnalytics(): Promise<AnalyticsResponse> {
  return apiFetch<AnalyticsResponse>("/api/dashboard/analytics");
}

export function fetchUsage(hours: number = 24): Promise<UsageResponse> {
  return apiFetch<UsageResponse>("/usage", { hours: String(hours) });
}

// --- React Query hooks ---

export function usePipeline() {
  return useQuery({
    queryKey: ["pipeline"],
    queryFn: fetchPipeline,
    // Tight refresh so writes from the Telegram bot show up in the kanban
    // within ~10s without a manual reload.
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useDealDetail(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDealDetail(id),
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useContacts(query?: string) {
  return useQuery({
    queryKey: ["contacts", query],
    queryFn: () => fetchContacts(query),
    staleTime: 15_000,
  });
}

export function useActivity(hours: number = 72) {
  return useQuery({
    queryKey: ["activity", hours],
    queryFn: () => fetchActivity(hours),
    staleTime: 10_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    staleTime: 30_000,
  });
}

export function useUsage(hours: number = 24) {
  return useQuery({
    queryKey: ["usage", hours],
    queryFn: () => fetchUsage(hours),
    staleTime: 60_000,
  });
}

// =====================================================================
// Mutations — write back to the same tables the bot reads. Optimistic
// updates make drag-drop feel instant; query invalidation forces a
// refetch so server-truth wins on reconciliation.
// =====================================================================

export interface DealCreatePayload {
  name: string;
  company_id?: string | null;
  stage?: string;
  value_usd?: number;
  close_date?: string | null;
  next_step?: string;
  notes?: string;
  competitors?: string;
}

export interface DealPatchPayload {
  name?: string;
  stage?: string;
  value_usd?: number;
  close_date?: string | null;
  next_step?: string;
  notes?: string;
  notes_append?: string;
  competitors?: string;
  company_id?: string | null;
  economic_buyer_id?: string | null;
  champion_id?: string | null;
  metrics?: string;
  decision_criteria?: string;
  decision_process?: string;
  paper_process?: string;
  pain?: string;
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DealCreatePayload) =>
      apiWrite<{ id: string; name: string; stage: string }>(
        "POST",
        "/api/dashboard/deals",
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function usePatchDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: DealPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/deals/${id}`,
        payload,
      ),
    // Optimistic stage moves on the kanban — patch the cached pipeline
    // immediately so the card jumps columns before the round-trip lands.
    onMutate: async ({ id, stage }) => {
      if (!stage) return;
      await qc.cancelQueries({ queryKey: ["pipeline"] });
      const prev = qc.getQueryData<PipelineResponse>(["pipeline"]);
      if (!prev) return { prev };
      const moved = Object.values(prev.stages)
        .flat()
        .find((d) => d.id === id);
      const next: PipelineResponse = {
        ...prev,
        stages: Object.fromEntries(
          Object.entries(prev.stages).map(([s, deals]) => [
            s,
            deals.filter((d) => d.id !== id),
          ]),
        ),
      };
      if (moved) {
        next.stages[stage] = [{ ...moved, stage }, ...(next.stages[stage] ?? [])];
      }
      qc.setQueryData(["pipeline"], next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pipeline"], ctx.prev);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["deal", vars.id] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export interface ActionCreatePayload {
  description: string;
  due_date?: string | null;
  contact_id?: string | null;
  source?: string;
}

export function useCreateAction(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ActionCreatePayload) =>
      apiWrite<ActionItemData>(
        "POST",
        `/api/dashboard/deals/${dealId}/actions`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export interface ActionPatchPayload {
  description?: string;
  status?: "open" | "done" | "snoozed";
  due_date?: string | null;
}

export function usePatchAction(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: ActionPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/actions/${id}`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export interface StakeholderCreatePayload {
  contact_id: string;
  role: string;
  sentiment?: string;
  influence?: string;
  notes?: string;
}

export function useCreateStakeholder(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StakeholderCreatePayload) =>
      apiWrite<{ id: string; deal_id: string }>(
        "POST",
        `/api/dashboard/deals/${dealId}/stakeholders`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deal", dealId] }),
  });
}

export interface StakeholderPatchPayload {
  sentiment?: string;
  influence?: string;
  role?: string;
  notes?: string;
}

export function usePatchStakeholder(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: StakeholderPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/stakeholders/${id}`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deal", dealId] }),
  });
}

export interface ContactCreatePayload {
  name: string;
  company_id?: string | null;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  personal_notes?: string;
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContactCreatePayload) =>
      apiWrite<{ id: string; name: string }>(
        "POST",
        "/api/dashboard/contacts",
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export interface ContactPatchPayload {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  personal_notes?: string;
  company_id?: string | null;
}

export function usePatchContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: ContactPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/contacts/${id}`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

// Companies — small helper for create-deal/contact dropdowns
export interface CompanyOption {
  id: string;
  name: string;
  industry: string;
}

export function useCompanies(query?: string) {
  return useQuery({
    queryKey: ["companies", query],
    queryFn: async () => {
      const params = query ? { q: query } : undefined;
      const resp = await apiFetch<{ companies: CompanyOption[] }>(
        "/api/dashboard/companies",
        params,
      );
      return resp.companies;
    },
    staleTime: 60_000,
  });
}

// =====================================================================
// PR1 — universal delete + companies detail + bids + meetings CRUD
// =====================================================================

// ---- Delete -------------------------------------------------------

type DeleteEntity =
  | "deals"
  | "contacts"
  | "companies"
  | "actions"
  | "meetings"
  | "bids"
  | "stakeholders"
  | "plants"
  | "specs";

const DELETE_INVALIDATE: Record<DeleteEntity, string[][]> = {
  deals: [["pipeline"], ["analytics"], ["activity"]],
  contacts: [["contacts"]],
  companies: [["companies-list"], ["company"]],
  actions: [["deal"], ["analytics"]],
  meetings: [["deal"], ["activity"]],
  bids: [["bids-list"], ["bid"], ["company"]],
  stakeholders: [["deal"]],
  plants: [["plants-list"], ["company"]],
  specs: [["specs"]],
};

export function useDeleteEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entity, id }: { entity: DeleteEntity; id: string }) =>
      apiWrite<{ id: string; deleted: boolean }>(
        "DELETE",
        `/api/dashboard/${entity}/${id}`,
      ),
    onSuccess: (_data, { entity }) => {
      for (const queryKey of DELETE_INVALIDATE[entity]) {
        qc.invalidateQueries({ queryKey });
      }
    },
  });
}

// ---- Companies list + detail --------------------------------------

export interface CompanyDetailResponse {
  company: {
    id: string;
    name: string;
    industry: string;
    website: string;
    notes: string;
  };
  stats: {
    deal_count: number;
    active_pipeline_value: number;
    won_value: number;
    contact_count: number;
    open_bid_count: number;
  };
  deals: {
    id: string;
    name: string;
    stage: string;
    value_usd: number;
    close_date: string | null;
    next_step: string;
  }[];
  contacts: {
    id: string;
    name: string;
    title: string;
    email: string;
    phone: string;
    personal_notes: string;
  }[];
  bids: {
    id: string;
    name: string;
    stage: string;
    value_usd: number;
    submission_deadline: string | null;
    deal_id: string | null;
  }[];
  recent_meetings: {
    id: string;
    date: string;
    summary: string;
    deal_id: string | null;
  }[];
  recent_actions: {
    id: string;
    description: string;
    status: string;
    due_date: string | null;
    deal_id: string | null;
  }[];
}

export function useCompaniesList(query?: string) {
  return useQuery({
    queryKey: ["companies-list", query],
    queryFn: async () => {
      const params = query ? { q: query } : undefined;
      const resp = await apiFetch<{ companies: CompanyOption[] }>(
        "/api/dashboard/companies",
        params,
      );
      return resp.companies;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useCompanyDetail(id: string) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: () => apiFetch<CompanyDetailResponse>(`/api/dashboard/companies/${id}`),
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export interface CompanyPatchPayload {
  name?: string;
  industry?: string;
  website?: string;
  notes?: string;
}

export function usePatchCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: CompanyPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/companies/${id}`,
        payload,
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["company", id] });
      qc.invalidateQueries({ queryKey: ["companies-list"] });
    },
  });
}

export interface CompanyCreatePayload {
  name: string;
  industry?: string;
  website?: string;
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompanyCreatePayload) =>
      apiWrite<{ id: string; name: string }>(
        "POST",
        "/api/dashboard/companies",
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies-list"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

// ---- Bids ----------------------------------------------------------

export interface BidListItem {
  id: string;
  name: string;
  stage: string;
  value_usd: number;
  submission_deadline: string | null;
  qa_deadline: string | null;
  company_id: string | null;
  company: string;
  deal_id: string | null;
  deal: string;
  rfp_url: string;
}

export interface BidDetailResponse {
  bid: {
    id: string;
    name: string;
    stage: string;
    value_usd: number;
    submission_deadline: string | null;
    qa_deadline: string | null;
    rfp_url: string;
    deliverables: string;
    notes: string;
    company_id: string | null;
    company: string;
    deal_id: string | null;
    deal: string;
  };
}

export function useBidsList(stage?: string) {
  return useQuery({
    queryKey: ["bids-list", stage ?? ""],
    queryFn: async () => {
      const params = stage ? { stage } : undefined;
      const resp = await apiFetch<{ bids: BidListItem[] }>(
        "/api/dashboard/bids",
        params,
      );
      return resp.bids;
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useBidDetail(id: string) {
  return useQuery({
    queryKey: ["bid", id],
    queryFn: () => apiFetch<BidDetailResponse>(`/api/dashboard/bids/${id}`),
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

export interface BidCreatePayload {
  name: string;
  company_id?: string | null;
  deal_id?: string | null;
  stage?: string;
  value_usd?: number;
  submission_deadline?: string | null;
  qa_deadline?: string | null;
  rfp_url?: string;
  deliverables?: string;
  notes?: string;
}

export function useCreateBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BidCreatePayload) =>
      apiWrite<{ id: string; name: string; stage: string }>(
        "POST",
        "/api/dashboard/bids",
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bids-list"] });
      qc.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export interface BidPatchPayload {
  name?: string;
  stage?: string;
  value_usd?: number;
  submission_deadline?: string | null;
  qa_deadline?: string | null;
  rfp_url?: string;
  deliverables?: string;
  notes?: string;
  company_id?: string | null;
  deal_id?: string | null;
}

export function usePatchBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: BidPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/bids/${id}`,
        payload,
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["bid", id] });
      qc.invalidateQueries({ queryKey: ["bids-list"] });
    },
  });
}

// ---- Meetings -----------------------------------------------------

export interface MeetingCreatePayload {
  date?: string | null;
  attendees?: string;
  summary?: string;
  decisions?: string;
  transcript?: string;
}

export function useCreateMeeting(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MeetingCreatePayload) =>
      apiWrite<{ id: string; date: string }>(
        "POST",
        `/api/dashboard/deals/${dealId}/meetings`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export interface MeetingPatchPayload {
  date?: string | null;
  attendees?: string;
  summary?: string;
  decisions?: string;
  transcript?: string;
}

export function usePatchMeeting(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: MeetingPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/meetings/${id}`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
    },
  });
}

// =====================================================================
// PR2 — Inbox: dismiss/snooze reminders + approve pending actions
// =====================================================================

export type InboxReminderItem = {
  kind: "reminder";
  id: string;
  title: string;
  status: string;
  trigger_at: string;
  is_overdue: boolean;
  deal_id: string | null;
  deal_name: string | null;
  kind_detail: string;
  dup_count: number;
};

export type InboxPendingAction = {
  kind: "pending_action";
  id: string;
  title: string;
  tool_name: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  deal_id: string | null;
  deal_name: string | null;
};

export type InboxActionItem = {
  kind: "action_item";
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  source: string;
  deal_id: string | null;
  deal_name: string | null;
};

export type InboxItem = InboxReminderItem | InboxPendingAction | InboxActionItem;

export interface InboxResponse {
  items: InboxItem[];
  counts: {
    reminders_overdue: number;
    pending_actions: number;
    actions_due: number;
    reminders_upcoming: number;
  };
}

export function useInbox() {
  return useQuery({
    queryKey: ["inbox"],
    queryFn: () => apiFetch<InboxResponse>("/api/dashboard/inbox"),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function usePatchReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status?: string; message?: string; trigger_at?: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/reminders/${id}`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useSnoozeReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) =>
      apiWrite<{ id: string; trigger_at: string }>(
        "POST",
        `/api/dashboard/reminders/${id}/snooze`,
        { hours },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiWrite<{ id: string; deleted: boolean }>(
        "DELETE",
        `/api/dashboard/reminders/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// Pending action approve/reject — these endpoints live at the root of the
// API (not under /api/dashboard) because they predate the dashboard router.
export function useApprovePendingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiWrite<{ ok: boolean; result?: unknown }>(
        "POST",
        `/pending-actions/${id}/approve`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });
}

export function useRejectPendingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiWrite<{ ok: boolean; id: string }>(
        "POST",
        `/pending-actions/${id}/reject`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });
}

// =====================================================================
// PR3 — Plants, Specs, Compliance Matrix (industrial data model)
// =====================================================================

export const PLANT_SITE_TYPES = [
  "refinery", "chemical", "power_gen", "water_wastewater", "manufacturing",
  "data_center", "pharma", "food_bev", "mining", "utility_substation", "other",
] as const;

export const SPEC_FAMILIES = [
  "hazardous_area", "functional_safety", "cybersecurity", "electrical",
  "export_control", "quality", "environmental", "other",
] as const;

export const COMPLIANCE_STATUSES = [
  "compliant", "partial", "exception", "not_applicable", "unanswered",
] as const;

export interface PlantListItem {
  id: string;
  name: string;
  company_id: string | null;
  company: string;
  site_address: string;
  site_type: string;
}

export interface PlantDetailResponse {
  plant: {
    id: string;
    name: string;
    site_address: string;
    site_type: string;
    standards_notes: string;
    notes: string;
    company: { id: string; name: string } | null;
    plant_manager: { id: string; name: string; title: string; email: string } | null;
  };
  deals: {
    id: string;
    name: string;
    stage: string;
    value_usd: number;
    next_step: string;
    close_date: string | null;
  }[];
  bids: {
    id: string;
    name: string;
    stage: string;
    value_usd: number;
    submission_deadline: string | null;
  }[];
}

export function usePlants(filters?: { company_id?: string; q?: string }) {
  return useQuery({
    queryKey: ["plants-list", filters?.company_id ?? "", filters?.q ?? ""],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.company_id) params.company_id = filters.company_id;
      if (filters?.q) params.q = filters.q;
      const resp = await apiFetch<{ plants: PlantListItem[] }>(
        "/api/dashboard/plants",
        Object.keys(params).length ? params : undefined,
      );
      return resp.plants;
    },
    staleTime: 30_000,
  });
}

export function usePlantDetail(id: string) {
  return useQuery({
    queryKey: ["plant", id],
    queryFn: () => apiFetch<PlantDetailResponse>(`/api/dashboard/plants/${id}`),
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

export interface PlantCreatePayload {
  name: string;
  company_id: string;
  site_address?: string;
  site_type?: string;
  plant_manager_contact_id?: string | null;
  standards_notes?: string;
  notes?: string;
}

export function useCreatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlantCreatePayload) =>
      apiWrite<{ id: string; name: string }>("POST", "/api/dashboard/plants", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants-list"] });
      qc.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export interface PlantPatchPayload {
  name?: string;
  site_address?: string;
  site_type?: string;
  plant_manager_contact_id?: string | null;
  standards_notes?: string;
  notes?: string;
  company_id?: string;
}

export function usePatchPlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: PlantPatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/plants/${id}`,
        payload,
      ),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["plant", id] });
      qc.invalidateQueries({ queryKey: ["plants-list"] });
    },
  });
}

// ---- Specs ---------------------------------------------------------

export interface SpecItem {
  id: string;
  code: string;
  name: string;
  family: string;
  scope: string;
  evidence_required: string;
}

export function useSpecs(family?: string) {
  return useQuery({
    queryKey: ["specs", family ?? ""],
    queryFn: async () => {
      const params = family ? { family } : undefined;
      const resp = await apiFetch<{ specs: SpecItem[] }>("/api/dashboard/specs", params);
      return resp.specs;
    },
    staleTime: 60_000,
  });
}

export interface SpecCreatePayload {
  code: string;
  name: string;
  family?: string;
  scope?: string;
  evidence_required?: string;
}

export function useCreateSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SpecCreatePayload) =>
      apiWrite<{ id: string; code: string }>("POST", "/api/dashboard/specs", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["specs"] }),
  });
}

export function useDeleteSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiWrite<{ id: string; deleted: boolean }>(
        "DELETE",
        `/api/dashboard/specs/${id}`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["specs"] }),
  });
}

// ---- Compliance Matrix --------------------------------------------

export interface ComplianceItem {
  id: string;
  clause_section: string;
  clause_text: string;
  our_response: string;
  status: string;
  spec_ids: string[];
  notes: string;
  sort_order: number;
}

export interface ComplianceListResponse {
  items: ComplianceItem[];
  summary: Record<string, number>;
  total: number;
}

export function useCompliance(bidId: string) {
  return useQuery({
    queryKey: ["compliance", bidId],
    queryFn: () => apiFetch<ComplianceListResponse>(`/api/dashboard/bids/${bidId}/compliance`),
    enabled: !!bidId,
    staleTime: 5_000,
    refetchInterval: 20_000,
  });
}

export interface ComplianceCreatePayload {
  clause_section?: string;
  clause_text: string;
  our_response?: string;
  status?: string;
  spec_ids?: string[];
  notes?: string;
  sort_order?: number;
}

export function useCreateCompliance(bidId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ComplianceCreatePayload) =>
      apiWrite<{ id: string }>("POST", `/api/dashboard/bids/${bidId}/compliance`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance", bidId] }),
  });
}

export function useBulkCompliance(bidId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      apiWrite<{ created: number }>(
        "POST",
        `/api/dashboard/bids/${bidId}/compliance/bulk`,
        { text },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance", bidId] }),
  });
}

export interface CompliancePatchPayload {
  clause_section?: string;
  clause_text?: string;
  our_response?: string;
  status?: string;
  spec_ids?: string[];
  notes?: string;
  sort_order?: number;
}

export function usePatchCompliance(bidId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: CompliancePatchPayload & { id: string }) =>
      apiWrite<{ id: string; updated: boolean }>(
        "PATCH",
        `/api/dashboard/compliance/${id}`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance", bidId] }),
  });
}

export function useDeleteCompliance(bidId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiWrite<{ id: string; deleted: boolean }>(
        "DELETE",
        `/api/dashboard/compliance/${id}`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance", bidId] }),
  });
}

// =====================================================================
// PR6 — Unified search for the Cmd-K palette + create-stakeholder hook
// =====================================================================

export interface SearchResult {
  kind: "deal" | "contact" | "company" | "bid" | "plant";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const resp = await apiFetch<{ results: SearchResult[] }>(
        "/api/dashboard/search",
        { q: query },
      );
      return resp.results;
    },
    enabled: query.length > 0,
    staleTime: 5_000,
  });
}

// =====================================================================
// PR4 — Web chat panel. Talks to the same agent as Telegram via the
// existing POST /chat endpoint. Voice in the browser uses the Web
// Speech API (Chrome + mobile Safari) — no backend transcription
// dependency for the MVP.
// =====================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  interface: string;
  timestamp: string;
}

export function useChatHistory(sessionId: string) {
  return useQuery({
    queryKey: ["chat-history", sessionId],
    queryFn: async () => {
      const resp = await apiFetch<{ messages: ChatMessage[] }>(
        `/api/dashboard/chat/${encodeURIComponent(sessionId)}`,
      );
      return resp.messages;
    },
    enabled: !!sessionId,
    // Cheap, frequent refresh so Telegram-side messages appear quickly
    // when the same session_id is shared with the bot.
    staleTime: 3_000,
    refetchInterval: 6_000,
    refetchOnWindowFocus: true,
  });
}

// The /chat endpoint sits at the API root, NOT under /api/dashboard,
// because it predates the dashboard router. Long timeout — agent runs
// can take 5-30s when tool-calling.
export async function sendChatMessage(
  message: string,
  sessionId: string,
): Promise<string> {
  const url = new URL("/chat", BASE_URL);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {}
    throw new Error(`chat failed: ${res.status} ${detail}`);
  }
  const data = await res.json();
  return (data?.response as string) ?? "";
}

// =====================================================================
// PR5 — Forecast + champion strength + AI MEDDIC suggester
// =====================================================================

export interface ForecastDealRow {
  id: string;
  name: string;
  stage: string;
  value_usd: number;
  close_date: string | null;
  meddic_pct: number;
  meddic_missing: string[];
  champion_score: number;
  champion_detail: string;
  slip_risk: number;
  reasons: string[];
}

export interface ForecastResponse {
  buckets: {
    commit: ForecastDealRow[];
    best_case: ForecastDealRow[];
    pipeline: ForecastDealRow[];
  };
  totals: Record<string, { count: number; value: number }>;
}

export function useForecast() {
  return useQuery({
    queryKey: ["forecast"],
    queryFn: () => apiFetch<ForecastResponse>("/api/dashboard/forecast"),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export interface DealHealthResponse {
  deal_id: string;
  meddic_pct: number;
  meddic_missing: string[];
  champion_score: number;
  champion_detail: string;
  slip_risk: number;
  forecast_bucket: "commit" | "best_case" | "pipeline";
  reasons: string[];
}

export function useDealHealth(dealId: string) {
  return useQuery({
    queryKey: ["deal-health", dealId],
    queryFn: () => apiFetch<DealHealthResponse>(`/api/dashboard/deals/${dealId}/health`),
    enabled: !!dealId,
    staleTime: 5_000,
    refetchInterval: 20_000,
  });
}

export interface MeddicSuggestion {
  deal_id: string;
  meeting_id: string;
  suggestions: {
    metrics?: string;
    decision_criteria?: string;
    decision_process?: string;
    paper_process?: string;
    pain?: string;
  };
  rationale: string;
}

export function useSuggestMeddic() {
  return useMutation({
    mutationFn: (meetingId: string) =>
      apiWrite<MeddicSuggestion>(
        "POST",
        `/api/dashboard/meetings/${meetingId}/suggest-meddic`,
      ),
  });
}

export function useSendChat(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => sendChatMessage(message, sessionId),
    onSuccess: () => {
      // History endpoint will pick up both the user + assistant rows
      // the agent persisted. Also invalidate everything else the agent
      // might have touched (deals, contacts, etc.) — a chat turn often
      // ends with "I moved Bosch to negotiation" and the kanban needs
      // to reflect that without a manual refresh.
      qc.invalidateQueries({ queryKey: ["chat-history", sessionId] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["deal"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["companies-list"] });
      qc.invalidateQueries({ queryKey: ["bids-list"] });
    },
  });
}
