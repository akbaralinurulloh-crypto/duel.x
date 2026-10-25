"use client";

import { useActionState } from "react";
import { submitSolution } from "@/app/[lang]/challenges/submit-actions";
import { analyzeLatestSubmission } from "@/app/[lang]/challenges/ai-actions";
import { FormAlert, SubmitButton, TextAreaField } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_CONTENT_LENGTH,
  buildStoragePath,
  contentTypeFor,
  validateFile,
} from "@/lib/submissions";

/** Samples up to `count` JPEG frames evenly across a video, in the browser. */
async function extractFrames(file: File, count: number): Promise<Blob[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video"));
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return [];
    const scale = Math.min(1, 768 / Math.max(video.videoWidth, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    const frames: Blob[] = [];
    for (let i = 0; i < count; i++) {
      const t = Math.min(duration - 0.05, (duration * (i + 0.5)) / count);
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("seek"));
        video.currentTime = Math.max(0, t);
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
      if (blob) frames.push(blob);
    }
    return frames;
  } catch {
    return [];
  } finally {
    URL.revokeObjectURL(url);
  }
}

const VIDEO_EXT = /\.(mp4|mov|webm)$/i;

export function SubmitForm({
  challengeId,
  slug,
  userId,
}: {
  challengeId: string;
  slug: string;
  userId: string;
}) {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(async (prev, formData) => {
    const file = formData.get("file");
    formData.delete("file");

    if (file instanceof File && file.size > 0) {
      const problem = validateFile(file, d);
      if (problem) return { error: problem, values: { content: String(formData.get("content") ?? "") } };

      const path = buildStoragePath(userId, challengeId, file.name, crypto.randomUUID().slice(0, 8));
      const { error } = await createClient()
        .storage.from("submissions")
        .upload(path, file, { contentType: contentTypeFor(file.name) ?? undefined, upsert: false });
      if (error) {
        return {
          error: d.submit.uploadFailed,
          values: { content: String(formData.get("content") ?? "") },
        };
      }
      formData.set("filePath", path);
      formData.set("fileName", file.name.slice(0, 200));
      formData.set("fileSize", String(file.size));
    }

    // Video: sample frames in the browser so AI can look at it.
    const framePaths: string[] = [];
    if (file instanceof File && file.size > 0 && VIDEO_EXT.test(file.name)) {
      const frames = await extractFrames(file, 8);
      const tag = crypto.randomUUID().slice(0, 8);
      for (let i = 0; i < frames.length; i++) {
        const p = `${userId}/${challengeId}/${tag}-frame-${i + 1}.jpg`;
        const { error } = await createClient()
          .storage.from("submissions")
          .upload(p, frames[i], { contentType: "image/jpeg", upsert: false });
        if (!error) framePaths.push(p);
      }
    }

    const result = await submitSolution(prev, formData);
    if (result.error) return result;

    const ai = await analyzeLatestSubmission({ challengeId, slug, framePaths });
    return { message: [result.message, ai.message ?? ai.error].filter(Boolean).join(" ") };
  }, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="challengeId" value={challengeId} />
      <input type="hidden" name="slug" value={slug} />
      <FormAlert state={state} />
      <TextAreaField
        label={d.submit.answer}
        name="content"
        rows={8}
        defaultValue={state.values?.content}
        hint={fmt(d.submit.answerHint, { max: MAX_CONTENT_LENGTH.toLocaleString("en-US") })}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium">
          {d.submit.attachment}
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.txt,.md,.csv,.json,.zip,.png,.jpg,.jpeg,.mp4,.mov,.webm"
          className="text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-text"
        />
        <p className="text-sm text-muted">{d.submit.fileHint}</p>
      </div>
      <p className="text-sm text-muted">
        {d.submit.versionNote}
      </p>
      <SubmitButton pendingLabel={d.ai.analyzing}>{d.submit.submit}</SubmitButton>
    </form>
  );
}
