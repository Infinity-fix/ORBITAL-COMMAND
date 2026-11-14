import { Bot, CheckCircle2, Send, ShieldCheck, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  AICommanderRecommendation,
  AICommanderReply,
  EnvironmentId,
  SurvivalTelemetry,
} from '../../engine/types';
import { HazardEngine } from '../../engine/HazardEngine';
import { askAICommander } from '../../services/apiClient';
import { useMissionStore } from '../../store/useMissionStore';

interface AICommanderDrawerProps {
  open: boolean;
  onClose: () => void;
  telemetry?: SurvivalTelemetry | null;
  environment?: EnvironmentId;
  onLocalCommandApplied?: (rec: AICommanderRecommendation, resultMsg: string) => void;
}

const QUICK_PROMPTS = [
  'Analyze spacecraft readiness & FRR blockers',
  'Check suit survival & base power margins',
  'Suggest next engineering optimization',
];

function cleanPlainReply(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\*\s+/gm, '• ')
    .trim();
}

export function AICommanderDrawer({
  open,
  onClose,
  telemetry = null,
  environment,
  onLocalCommandApplied,
}: AICommanderDrawerProps) {
  const mission = useMissionStore((s) => s.mission);
  const baseModules = useMissionStore((s) => s.baseModules);
  const applyApprovedAICommand = useMissionStore((s) => s.applyApprovedAICommand);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{ id: string; prompt: string; reply: AICommanderReply; confirmedIds: string[] }>
  >([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const submitQuestion = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const liveHazards = HazardEngine.getInstance().getActiveHazards().map((h) => ({
        type: h.hazard.type,
        severity: h.hazard.severity,
        affectedSubsystem: h.hazard.affectedSubsystem,
      }));
      const reply = await askAICommander({
        question: trimmed,
        mission,
        telemetry,
        environment,
        builtModulesCount: baseModules.length,
        activeHazards: liveHazards,
      });
      setHistory((prev) => [
        { id: `ai-${Date.now()}`, prompt: trimmed, reply, confirmedIds: [] },
        ...prev,
      ]);
      setQuestion('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach AI Flight Director.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitQuestion(question);
  };

  const handleConfirmRec = (entryId: string, rec: AICommanderRecommendation) => {
    const res = applyApprovedAICommand(rec);
    onLocalCommandApplied?.(rec, res.message);
    setHistory((prev) =>
      prev.map((h) =>
        h.id === entryId ? { ...h, confirmedIds: [...h.confirmedIds, rec.id] } : h
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050811]/75 flex justify-end">
      <div className="w-full max-w-md bg-[#0d1424] border-l border-cyan-500/40 h-full flex flex-col shadow-2xl">
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              AI Flight Director &amp; Mission Commander
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Telemetry-grounded guidance · Confirmation required before state changes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Commander"
            className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Telemetry Briefing Prompts */}
        <div className="p-3 border-b border-slate-800 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp}
              type="button"
              onClick={() => void submitQuestion(qp)}
              className="px-2.5 py-1 rounded bg-[#070b14] border border-slate-700 hover:border-cyan-400 text-[11px] text-cyan-200"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/60 border border-rose-500 text-rose-200 font-mono">
              {errorMsg}
            </div>
          )}

          {history.length === 0 && (
            <div className="p-4 rounded-lg bg-[#070b14] border border-slate-800 text-slate-300 space-y-2 leading-relaxed">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Flight Loop Connected
              </div>
              <p>
                Ask about spacecraft mass/power/Δv margins, FRR review blockers, lunar/Mars base power balance, or emergency EVA survival steps.
              </p>
              <p className="text-[11px] text-slate-400">
                Any suggested action appears as an explicit <strong>Confirm &amp; Execute</strong> card and never modifies your mission automatically.
              </p>
            </div>
          )}

          {history.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="p-2.5 rounded bg-cyan-950/35 border border-cyan-700/40 text-cyan-100">
                <div className="text-[10px] font-mono text-cyan-400 mb-0.5">CREW QUERY</div>
                {item.prompt}
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>FLIGHT DIRECTOR ANALYSIS</span>
                  <span className="text-emerald-400 uppercase">{item.reply.source}</span>
                </div>
                <div className="whitespace-pre-line text-slate-200 leading-relaxed">
                  {cleanPlainReply(item.reply.reply)}
                </div>

                {item.reply.recommendations.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    {item.reply.recommendations.map((rec) => {
                      const confirmed = item.confirmedIds.includes(rec.id);
                      return (
                        <div
                          key={rec.id}
                          className="p-2.5 rounded bg-[#0d1424] border border-slate-700 space-y-1.5"
                        >
                          <div className="font-semibold text-white">{rec.title}</div>
                          <div className="text-[11px] text-slate-400">{rec.description}</div>
                          <button
                            type="button"
                            disabled={confirmed}
                            onClick={() => handleConfirmRec(item.id, rec)}
                            className={`px-3 py-1 rounded font-mono text-[11px] font-semibold inline-flex items-center gap-1 ${
                              confirmed
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {confirmed ? 'Confirmed & Executed' : 'Confirm & Execute'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Flight Director about mission margins or EVA..."
            className="flex-1 px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-xs text-white"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-3.5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs inline-flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? '...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
}
