"use client";

import { useState } from "react";
import { ExerciseLogModal, type ExerciseLogData } from "./ExerciseLogModal";
import { ProgressChart } from "./ProgressChart";
import {
  Video, TrendingUp, Clock, Dumbbell, ChevronDown, ChevronUp,
  Plus, Check, BarChart2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExerciseCardData {
  id:       string;
  name:     string;
  sets:     number | null;
  reps:     string | null;
  weight:   string | null;
  restTime: string | null;
  videoUrl: string | null;
  notes:    string | null;
  logs:     ExerciseLogData[];
}

interface ExerciseCardProps {
  exercise:   ExerciseCardData;
  userId:     string;
  coachNotes: boolean;  // show coach notes or not
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&\s?]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export function ExerciseCard({ exercise, userId, coachNotes }: ExerciseCardProps) {
  const [logs,       setLogs]       = useState<ExerciseLogData[]>(exercise.logs);
  const [showLog,    setShowLog]    = useState(false);
  const [showChart,  setShowChart]  = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const lastLog  = logs[0] ?? null;
  const embedUrl = getEmbedUrl(exercise.videoUrl ?? "");

  function handleLogged(newLog: ExerciseLogData) {
    setLogs((prev) => [newLog, ...prev]);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 3000);
  }

  // Progress delta vs previous
  const weightDelta =
    logs.length >= 2 && logs[0].weightKg && logs[1].weightKg
      ? logs[0].weightKg - logs[1].weightKg
      : null;

  return (
    <div className={cn(
      "card overflow-hidden transition-all",
      justLogged && "border-brand-accent/40 shadow-accent-sm",
    )}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white">{exercise.name}</h3>
              {justLogged && (
                <span className="flex items-center gap-1 text-xs text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> נשמר!
                </span>
              )}
            </div>

            {/* Target prescription */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {exercise.sets && exercise.reps && (
                <span className="text-sm font-medium text-brand-accent">
                  {exercise.sets} × {exercise.reps}
                </span>
              )}
              {exercise.weight && (
                <span className="flex items-center gap-1 text-xs text-brand-text-muted">
                  <Dumbbell className="w-3 h-3" />
                  {exercise.weight}
                </span>
              )}
              {exercise.restTime && (
                <span className="flex items-center gap-1 text-xs text-brand-text-muted">
                  <Clock className="w-3 h-3" />
                  {exercise.restTime}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {exercise.videoUrl && (
              <button
                onClick={() => setShowVideo((v) => !v)}
                title="סרטון הדגמה"
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  showVideo
                    ? "bg-brand-info/15 text-brand-info"
                    : "text-brand-text-dim hover:text-brand-info hover:bg-brand-elevated",
                )}
              >
                <Video className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowChart((v) => !v)}
              title="גרף התקדמות"
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showChart
                  ? "bg-brand-accent/15 text-brand-accent"
                  : "text-brand-text-dim hover:text-brand-accent hover:bg-brand-elevated",
              )}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Coach notes */}
        {coachNotes && exercise.notes && (
          <div className="mt-3 bg-brand-elevated rounded-xl px-3 py-2 text-xs text-brand-text-muted border border-brand-border">
            💬 {exercise.notes}
          </div>
        )}
      </div>

      {/* Video embed */}
      {showVideo && embedUrl && (
        <div className="px-5 pb-4 animate-fade-in">
          <div className="rounded-xl overflow-hidden aspect-video bg-black">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
      {showVideo && exercise.videoUrl && !embedUrl && (
        <div className="px-5 pb-4">
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-brand-info hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            פתח סרטון הדגמה
          </a>
        </div>
      )}

      {/* Progress chart */}
      {showChart && (
        <div className="px-5 pb-4 animate-fade-in">
          <ProgressChart exerciseId={exercise.id} userId={userId} />
        </div>
      )}

      {/* Performance history */}
      {logs.length > 0 && (
        <div className="border-t border-brand-border px-5 py-3 bg-brand-elevated/50">
          <p className="text-xs text-brand-text-dim mb-2 font-semibold uppercase tracking-wider">
            היסטוריה אחרונה
          </p>
          <div className="space-y-1.5">
            {logs.slice(0, 3).map((log, i) => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <span className="text-brand-text-muted">{formatDate(log.loggedAt)}</span>
                <div className="flex items-center gap-3">
                  {log.sets && log.reps && log.weightKg && (
                    <span className={cn(
                      "font-medium",
                      i === 0 ? "text-brand-accent" : "text-white/60",
                    )}>
                      {log.sets}×{log.reps} @ {log.weightKg}kg
                    </span>
                  )}
                  {log.rpe && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                      log.rpe >= 9 ? "bg-brand-error/20 text-brand-error"
                        : log.rpe >= 7 ? "bg-brand-warning/20 text-brand-warning"
                        : "bg-brand-accent/20 text-brand-accent",
                    )}>
                      RPE {log.rpe}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress delta */}
          {weightDelta !== null && (
            <div className="mt-2 pt-2 border-t border-brand-border flex items-center gap-1.5">
              <TrendingUp className={cn(
                "w-3 h-3",
                weightDelta >= 0 ? "text-brand-accent" : "text-brand-error",
              )} />
              <span className={cn(
                "text-xs font-semibold",
                weightDelta >= 0 ? "text-brand-accent" : "text-brand-error",
              )}>
                {weightDelta >= 0 ? "+" : ""}{weightDelta}kg
              </span>
              <span className="text-xs text-brand-text-dim">מהאימון הקודם</span>
            </div>
          )}
        </div>
      )}

      {/* Log button */}
      <div className="px-5 py-3 border-t border-brand-border">
        <button
          onClick={() => setShowLog(true)}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
            "bg-brand-accent text-black hover:bg-brand-accent-dim shadow-accent-sm active:scale-95",
          )}
        >
          <Plus className="w-4 h-4" />
          {logs.length === 0 ? "רשום את הביצוע הראשון" : "רשום ביצוע"}
        </button>
      </div>

      {/* Log modal */}
      <ExerciseLogModal
        open={showLog}
        onClose={() => setShowLog(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        userId={userId}
        previousLog={lastLog}
        onLogged={handleLogged}
      />
    </div>
  );
}
