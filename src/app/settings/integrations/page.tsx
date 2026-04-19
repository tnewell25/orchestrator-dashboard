"use client";

import { useState } from "react";
import { Plug, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { useIntegrations, useDisconnectMicrosoft, type IntegrationItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonList } from "@/components/ui/skeleton";

const KIND_LABELS: Record<string, string> = {
  llm: "LLM",
  chat: "Chat interface",
  productivity: "Productivity",
};

export default function IntegrationsPage() {
  const { data, isLoading } = useIntegrations();
  const integrations = data ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <PageHeader
          title="Integrations"
          description="External services the agent can read from + write to. Connect Microsoft to surface Outlook + Teams calendars in the same flow as Telegram + Google."
        />

        {isLoading ? (
          <SkeletonList rows={4} height={88} />
        ) : (
          <div className="space-y-2.5">
            {integrations.map((it) => (
              <IntegrationCard key={it.id} integration={it} />
            ))}
          </div>
        )}

        <SetupGuide />
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: IntegrationItem }) {
  const disconnect = useDisconnectMicrosoft();

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
            integration.connected
              ? "bg-emerald-50 border border-emerald-200"
              : integration.configured
                ? "bg-slate-100 border border-slate-200"
                : "bg-slate-50 border border-slate-200 border-dashed"
          }`}
        >
          {integration.connected ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : integration.configured ? (
            <Plug size={16} className="text-slate-500" />
          ) : (
            <AlertCircle size={16} className="text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900">{integration.name}</h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
              {KIND_LABELS[integration.kind] ?? integration.kind}
            </span>
            {integration.connected ? (
              <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                Connected
              </span>
            ) : integration.configured ? (
              <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Not connected
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                Not configured
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{integration.detail}</p>

          {integration.id === "microsoft" && integration.redirect_uri && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
              <span>Redirect URI:</span>
              <code className="font-mono bg-slate-100 rounded px-1.5 py-0.5 text-[10px] truncate max-w-xs">
                {integration.redirect_uri}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(integration.redirect_uri!)}
                className="text-slate-400 hover:text-slate-700"
                title="Copy"
              >
                <Copy size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0">
          {integration.id === "microsoft" && integration.configured && !integration.connected && integration.auth_url && (
            <a href={integration.auth_url}>
              <Button size="sm">Connect</Button>
            </a>
          )}
          {integration.id === "microsoft" && integration.connected && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => disconnect.mutate()}
              loading={disconnect.isPending}
            >
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SetupGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 text-left"
      >
        <div>
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Microsoft 365 — setup steps
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            One-time Azure App Registration. ~10 minutes.
          </p>
        </div>
        <span className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-700 space-y-3 leading-relaxed">
          <ol className="list-decimal list-inside space-y-2 ml-1">
            <li>
              Go to <a href="https://portal.azure.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">portal.azure.com</a> → Microsoft Entra ID → App registrations → New registration
            </li>
            <li>
              Name: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">Orchestrator</code> · Account types: Single tenant (or Multi-tenant if connecting personal MS accounts)
            </li>
            <li>
              Redirect URI (Web): paste the URI shown above on the Microsoft card. Save.
            </li>
            <li>
              On the new app: <strong>Certificates & secrets</strong> → New client secret → copy the <em>value</em> (only shown once).
            </li>
            <li>
              <strong>API permissions</strong> → Add a permission → Microsoft Graph → Delegated → add: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Calendars.ReadWrite</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Mail.ReadWrite</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Mail.Send</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">User.Read</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">offline_access</code>. <strong>Grant admin consent</strong> if available.
            </li>
            <li>
              In Railway dashboard → orchestrator → Variables, add:
              <pre className="bg-slate-100 rounded p-2 mt-1 text-[10px] font-mono leading-relaxed">{`MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<the secret value you copied>
MICROSOFT_TENANT=<Directory (tenant) ID>  # or 'common' for multi-tenant`}</pre>
            </li>
            <li>Redeploy. Refresh this page. Click <strong>Connect</strong> on Microsoft. Sign in.</li>
          </ol>
          <p className="text-[11px] text-slate-500 italic">
            After connecting, the agent can list/create Outlook calendar events and read/draft/send Outlook mail. Both Google and Microsoft can be active simultaneously — the agent picks based on context.
          </p>
        </div>
      )}
    </div>
  );
}
