"use client";

import { useState } from "react";
import { Sword, Plus, ChevronDown, ChevronRight } from "lucide-react";
import {
  useCompetitors,
  useCreateCompetitor,
  usePatchCompetitor,
  useBattleCards,
  useCreateBattleCard,
  useDeleteEntity,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

export default function BattleCardsPage() {
  const { data, isLoading } = useCompetitors();
  const create = useCreateCompetitor();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const competitors = data ?? [];

  const submit = async () => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), strengths, weaknesses });
      setName(""); setStrengths(""); setWeaknesses("");
      setAdding(false);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-zinc-800">Battle cards</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">
              Competitor intel + situational play-by-play. Reference before walking into a competitive deal review.
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 shrink-0"
            >
              <Plus size={12} />
              Competitor
            </button>
          )}
        </div>

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New competitor</span>
              <button type="button" onClick={() => setAdding(false)} className="text-[11px] text-zinc-400 hover:text-zinc-600">
                Cancel
              </button>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Name (e.g. Siemens, Yokogawa, ABB)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <textarea
              placeholder="Their strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={2}
              className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <textarea
              placeholder="Their weaknesses"
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
              rows={2}
              className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !name.trim()}
              className="w-full py-2 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Adding..." : "Add competitor"}
            </button>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-zinc-400 text-center py-8">Loading...</p>
        ) : competitors.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm py-12 text-center">
            <Sword size={20} className="inline text-zinc-300 mb-2" />
            <p className="text-xs text-zinc-400">
              No competitors tracked yet. Add the regulars (Siemens, Yokogawa, ABB, Emerson...) to build your library.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {competitors.map((c) => (
              <CompetitorCard
                key={c.id}
                competitor={c}
                isExpanded={expanded === c.id}
                onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompetitorCard({
  competitor, isExpanded, onToggle,
}: {
  competitor: ReturnType<typeof useCompetitors>["data"] extends (infer T)[] | undefined ? T : never;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const patch = usePatchCompetitor();
  const remove = useDeleteEntity();
  const destroy = useConfirmDestroy();
  const { data: cards } = useBattleCards(isExpanded ? competitor.id : "");
  const createCard = useCreateBattleCard(competitor.id);

  const [editing, setEditing] = useState(false);
  const [draftStrengths, setDraftStrengths] = useState(competitor.strengths);
  const [draftWeaknesses, setDraftWeaknesses] = useState(competitor.weaknesses);
  const [draftPricing, setDraftPricing] = useState(competitor.pricing_notes);
  const [addingCard, setAddingCard] = useState(false);
  const [cardSituation, setCardSituation] = useState("");
  const [cardContent, setCardContent] = useState("");

  const saveEdits = async () => {
    await patch.mutateAsync({
      id: competitor.id,
      strengths: draftStrengths, weaknesses: draftWeaknesses,
      pricing_notes: draftPricing,
    });
    setEditing(false);
  };

  const submitCard = async () => {
    if (!cardContent.trim()) return;
    await createCard.mutateAsync({ situation: cardSituation, content: cardContent });
    setCardSituation(""); setCardContent("");
    setAddingCard(false);
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-50/60"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? <ChevronDown size={14} className="text-zinc-400 shrink-0" /> : <ChevronRight size={14} className="text-zinc-400 shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-800 truncate">{competitor.name}</p>
            {competitor.aliases && (
              <p className="text-[11px] text-zinc-500 truncate">aka {competitor.aliases}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 shrink-0">
          <span>{competitor.battle_card_count} card{competitor.battle_card_count !== 1 ? "s" : ""}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Their strengths</span>
              {editing ? (
                <textarea value={draftStrengths} onChange={(e) => setDraftStrengths(e.target.value)} rows={3} className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
              ) : (
                <p className="text-xs text-zinc-700 whitespace-pre-wrap">{competitor.strengths || <span className="italic text-zinc-400">(none)</span>}</p>
              )}
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Their weaknesses</span>
              {editing ? (
                <textarea value={draftWeaknesses} onChange={(e) => setDraftWeaknesses(e.target.value)} rows={3} className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
              ) : (
                <p className="text-xs text-zinc-700 whitespace-pre-wrap">{competitor.weaknesses || <span className="italic text-zinc-400">(none)</span>}</p>
              )}
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Pricing notes</span>
              {editing ? (
                <textarea value={draftPricing} onChange={(e) => setDraftPricing(e.target.value)} rows={3} className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
              ) : (
                <p className="text-xs text-zinc-700 whitespace-pre-wrap">{competitor.pricing_notes || <span className="italic text-zinc-400">(none)</span>}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            {editing ? (
              <div className="flex gap-1.5">
                <button type="button" onClick={saveEdits} className="px-3 py-1 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800">Save</button>
                <button type="button" onClick={() => { setEditing(false); setDraftStrengths(competitor.strengths); setDraftWeaknesses(competitor.weaknesses); setDraftPricing(competitor.pricing_notes); }} className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-700">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                Edit competitor
              </button>
            )}
            <button
              type="button"
              onClick={() => destroy.ask({
                title: `Delete ${competitor.name}?`,
                body: "Removes the competitor and all their battle cards.",
                typeToConfirm: competitor.name,
                run: () => remove.mutateAsync({ entity: "competitors", id: competitor.id }),
              })}
              className="text-[11px] text-red-600 hover:bg-red-50 px-2 py-1 rounded"
            >
              Delete
            </button>
          </div>

          <div className="border-t border-zinc-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Battle cards</h3>
              {!addingCard && (
                <button type="button" onClick={() => setAddingCard(true)} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                  + Card
                </button>
              )}
            </div>

            {addingCard && (
              <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-3 space-y-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="Situation (e.g. Competing against PCS 7 in chemicals)"
                  value={cardSituation}
                  onChange={(e) => setCardSituation(e.target.value)}
                  className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
                />
                <textarea
                  placeholder="The play. Specific tactic, talking points, evidence."
                  value={cardContent}
                  onChange={(e) => setCardContent(e.target.value)}
                  rows={4}
                  className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
                />
                <div className="flex gap-1.5">
                  <button type="button" onClick={submitCard} disabled={createCard.isPending || !cardContent.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50">
                    Save card
                  </button>
                  <button type="button" onClick={() => setAddingCard(false)} className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700">Cancel</button>
                </div>
              </div>
            )}

            {(cards ?? []).length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">No battle cards yet.</p>
            ) : (
              <div className="space-y-2">
                {(cards ?? []).map((card) => (
                  <div key={card.id} className="bg-zinc-50 border border-zinc-200 rounded p-2.5 group relative">
                    {card.situation && (
                      <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wide mb-1">{card.situation}</p>
                    )}
                    <p className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap">{card.content}</p>
                    <button
                      type="button"
                      onClick={() => remove.mutate({ entity: "battle-cards", id: card.id })}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
