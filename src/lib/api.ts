import { useQuery } from "@tanstack/react-query";

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
    staleTime: 30_000,
  });
}

export function useDealDetail(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDealDetail(id),
    enabled: !!id,
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
    staleTime: 60_000,
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
