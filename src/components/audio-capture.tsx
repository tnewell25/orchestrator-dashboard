"use client";

import { useRef, useState } from "react";
import { Mic, Square, Upload, Loader2, CheckCircle2, AlertCircle, Monitor } from "lucide-react";
import { useUploadDealAudio, type AudioProcessResult } from "@/lib/api";

const MEETING_TYPE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  technical_deep_dive: "Technical deep-dive",
  pricing: "Pricing",
  negotiation: "Negotiation",
  status: "Status",
  kickoff: "Kickoff",
  closing: "Closing",
  other: "Other",
};

const MEETING_TYPE_COLORS: Record<string, string> = {
  discovery: "bg-blue-50 text-blue-800 border-blue-200",
  technical_deep_dive: "bg-violet-50 text-violet-800 border-violet-200",
  pricing: "bg-emerald-50 text-emerald-800 border-emerald-200",
  negotiation: "bg-amber-50 text-amber-800 border-amber-200",
  status: "bg-slate-100 text-slate-700 border-slate-200",
  kickoff: "bg-indigo-50 text-indigo-800 border-indigo-200",
  closing: "bg-rose-50 text-rose-800 border-rose-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function AudioCapture({ dealId }: { dealId: string }) {
  const upload = useUploadDealAudio(dealId);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [result, setResult] = useState<AudioProcessResult | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  // Track all streams so we can stop their tracks on cleanup.
  const activeStreams = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [mode, setMode] = useState<"mic" | "meeting" | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreams.current = [stream];
      _startRecorder(stream, "mic");
    } catch (e) {
      alert(`Microphone access denied or unavailable: ${(e as Error).message}`);
    }
  };

  // Capture Zoom/Teams/Meet audio + mic together, mixed via Web Audio API.
  // The user picks a tab/window/screen and checks "Share tab audio" in the
  // Chrome picker — that gives us system audio without any extension.
  const startMeetingRecording = async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        audio: true, video: true,  // video required by spec; we drop it
      } as MediaStreamConstraints);
      const screenAudio = screen.getAudioTracks();
      if (screenAudio.length === 0) {
        screen.getTracks().forEach((t) => t.stop());
        alert(
          "No system audio detected. When sharing, make sure you check " +
          "\"Also share tab audio\" (Chrome) or \"Share system audio\" " +
          "(Edge). Safari doesn't support this — use Chrome."
        );
        return;
      }
      // Drop the video track — we only need audio.
      screen.getVideoTracks().forEach((t) => t.stop());

      let mic: MediaStream | null = null;
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // Mic optional — they may want call audio only.
        mic = null;
      }

      activeStreams.current = mic ? [screen, mic] : [screen];

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();

      const sysSrc = ctx.createMediaStreamSource(
        new MediaStream([screenAudio[0]]),
      );
      const sysGain = ctx.createGain();
      sysGain.gain.value = 1.0;
      sysSrc.connect(sysGain).connect(dest);

      if (mic) {
        const micSrc = ctx.createMediaStreamSource(mic);
        const micGain = ctx.createGain();
        micGain.gain.value = 0.9; // slight duck so far-end doesn't drown
        micSrc.connect(micGain).connect(dest);
      }

      // If the user stops sharing from the browser's native bar, end us too
      screenAudio[0].addEventListener("ended", () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
          stopRecording();
        }
      });

      _startRecorder(dest.stream, "meeting");
    } catch (e) {
      const msg = (e as Error).message || "Permission denied";
      if (!msg.toLowerCase().includes("denied") && !msg.toLowerCase().includes("dismiss")) {
        alert(`Couldn't start meeting recording: ${msg}`);
      }
    }
  };

  const _startRecorder = (stream: MediaStream, captureMode: "mic" | "meeting") => {
    setMode(captureMode);
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    chunks.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      setRecordedBlob(blob);
      activeStreams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      activeStreams.current = [];
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
    // Get periodic chunks so a crash mid-recording doesn't lose everything
    mr.start(5000);
    mediaRecorder.current = mr;
    setRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const supportsDisplayMedia =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function";

  const submitFile = async (file: File) => {
    setResult(null);
    try {
      const r = await upload.mutateAsync({ file });
      setResult(r);
      setRecordedBlob(null);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const submitRecording = async () => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
    await submitFile(file);
  };

  if (collapsed) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Mic size={14} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Capture meeting audio</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Record now or upload a voice memo · auto-transcribed + categorized</p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">▾</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Mic size={14} className="text-slate-600" />
          <span className="text-xs font-semibold text-slate-800">Capture meeting audio</span>
        </div>
        <button
          type="button"
          onClick={() => { setCollapsed(true); setResult(null); setRecordedBlob(null); }}
          className="text-[11px] text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {!recording && !recordedBlob && !upload.isPending && !result && (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
              title="Records your microphone — for in-truck dictation"
            >
              <Mic size={13} /> Mic
            </button>
            {supportsDisplayMedia && (
              <button
                type="button"
                onClick={startMeetingRecording}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                title="Records a Zoom/Teams/Meet call — captures both sides + your mic. Choose the meeting tab and check 'Share tab audio'."
              >
                <Monitor size={13} /> Record meeting (Zoom/Teams)
              </button>
            )}
            <span className="text-[11px] text-slate-400">or</span>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
            >
              <Upload size={13} /> Upload file
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="audio/*,.m4a,.mp3,.wav,.webm,.mp4"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) submitFile(f);
              }}
            />
            <span className="text-[10px] text-slate-400 ml-auto">Up to ~10 hours</span>
          </>
        )}

        {recording && (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-slate-900 rounded animate-pulse"
            >
              <Square size={11} fill="currentColor" /> Stop
            </button>
            <span className="text-xs text-slate-700 tabular-nums">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" />
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              {mode === "meeting" && (
                <span className="ml-2 text-[11px] text-slate-500">
                  · capturing call audio + mic
                </span>
              )}
            </span>
          </>
        )}

        {recordedBlob && !upload.isPending && !result && (
          <>
            <span className="text-xs text-slate-700">Recorded {formatBytes(recordedBlob.size)}</span>
            <button
              type="button"
              onClick={submitRecording}
              className="h-8 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
            >
              Transcribe
            </button>
            <button
              type="button"
              onClick={() => setRecordedBlob(null)}
              className="h-8 px-2 text-[11px] text-slate-500 hover:text-slate-700"
            >
              Discard
            </button>
            <audio controls src={URL.createObjectURL(recordedBlob)} className="ml-auto h-8" />
          </>
        )}

        {upload.isPending && (
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Loader2 size={14} className="animate-spin" />
            <span>Transcribing + categorizing... typically 30s for a 5-min recording.</span>
          </div>
        )}
      </div>

      {result && <ProcessResult result={result} onClose={() => { setResult(null); setCollapsed(true); }} />}
    </div>
  );
}

function ProcessResult({ result, onClose }: { result: AudioProcessResult; onClose: () => void }) {
  const ex = result.extracted;
  const isFailed = result.status === "failed";
  return (
    <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isFailed ? (
            <AlertCircle size={14} className="text-red-600" />
          ) : (
            <CheckCircle2 size={14} className="text-emerald-600" />
          )}
          <span className="text-xs font-semibold text-slate-800">
            {isFailed ? "Categorization failed" : "Captured + categorized"}
          </span>
          {ex.meeting_type && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${MEETING_TYPE_COLORS[ex.meeting_type] ?? MEETING_TYPE_COLORS.other}`}>
              {MEETING_TYPE_LABELS[ex.meeting_type] ?? ex.meeting_type}
            </span>
          )}
          {ex.sentiment && (
            <span className={`text-[11px] ${
              ex.sentiment === "positive" ? "text-emerald-700"
              : ex.sentiment === "concerning" ? "text-red-700"
              : "text-slate-600"
            }`}>
              · {ex.sentiment}
            </span>
          )}
        </div>
        <button type="button" onClick={onClose} className="text-[11px] text-slate-400 hover:text-slate-700">×</button>
      </div>

      {ex.summary && (
        <div className="mb-2">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Summary</p>
          <p className="text-xs text-slate-800 leading-relaxed">{ex.summary}</p>
        </div>
      )}

      {ex.attendees_mentioned && ex.attendees_mentioned.length > 0 && (
        <div className="mb-2">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Attendees mentioned</p>
          <div className="flex flex-wrap gap-1">
            {ex.attendees_mentioned.map((a, i) => (
              <span key={i} className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5">{a}</span>
            ))}
          </div>
        </div>
      )}

      {ex.key_decisions && ex.key_decisions.length > 0 && (
        <div className="mb-2">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Decisions</p>
          <ul className="text-xs text-slate-800 space-y-0.5">
            {ex.key_decisions.map((d, i) => <li key={i}>· {d}</li>)}
          </ul>
        </div>
      )}

      {ex.action_items && ex.action_items.length > 0 && (
        <div className="mb-2">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Action items</p>
          <ul className="text-xs text-slate-800 space-y-0.5">
            {ex.action_items.map((a, i) => (
              <li key={i}>
                · {a.description}
                {a.owner && <span className="text-slate-500"> ({a.owner})</span>}
                {a.due_hint && <span className="text-slate-500"> — {a.due_hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ex.meddic_deltas && Object.values(ex.meddic_deltas).some((v) => v) && (
        <div className="mb-2">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">MEDDIC updates</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {Object.entries(ex.meddic_deltas)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="text-[11px]">
                  <span className="font-semibold text-slate-700 capitalize">{k.replace("_", " ")}: </span>
                  <span className="text-slate-700">{v}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {ex.competitors_mentioned && ex.competitors_mentioned.length > 0 && (
        <div className="mb-2 text-[11px]">
          <span className="font-semibold text-slate-700">Competitors mentioned: </span>
          <span className="text-slate-600">{ex.competitors_mentioned.join(", ")}</span>
        </div>
      )}

      {ex.pricing_mentioned && (
        <div className="mb-2 text-[11px]">
          <span className="font-semibold text-slate-700">Pricing: </span>
          <span className="text-slate-600">{ex.pricing_mentioned}</span>
        </div>
      )}

      {ex.follow_up_concern && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
          <span className="font-semibold">⚠ Follow-up concern: </span>
          {ex.follow_up_concern}
        </div>
      )}

      <p className="text-[10px] text-slate-400 mt-2 italic">
        Saved to meeting record. Full transcript stored. Apply individual MEDDIC updates from the meeting&apos;s AI MEDDIC button below.
      </p>
    </div>
  );
}
