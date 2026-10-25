"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestBrief } from "@/app/[lang]/challenges/ai-actions";
import { useI18n } from "@/lib/i18n/client";

export function BriefButton({ challengeId, slug }: { challengeId: string; slug: string }) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{d.ai.taskPending}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await requestBrief(challengeId, slug);
            if (r.error) setError(r.error);
            else router.refresh();
          })
        }
        className="w-fit rounded-md bg-lime px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {pending ? d.ai.gettingTask : d.ai.getTask}
      </button>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
