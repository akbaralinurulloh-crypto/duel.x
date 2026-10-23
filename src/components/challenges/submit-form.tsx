"use client";

import { useActionState } from "react";
import { submitSolution } from "@/app/challenges/submit-actions";
import { FormAlert, SubmitButton, TextAreaField } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/client";
import {
  FILE_HINT,
  MAX_CONTENT_LENGTH,
  buildStoragePath,
  contentTypeFor,
  validateFile,
} from "@/lib/submissions";

export function SubmitForm({
  challengeId,
  slug,
  userId,
}: {
  challengeId: string;
  slug: string;
  userId: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(async (prev, formData) => {
    const file = formData.get("file");
    formData.delete("file");

    if (file instanceof File && file.size > 0) {
      const problem = validateFile(file);
      if (problem) return { error: problem, values: { content: String(formData.get("content") ?? "") } };

      const path = buildStoragePath(userId, challengeId, file.name, crypto.randomUUID().slice(0, 8));
      const { error } = await createClient()
        .storage.from("submissions")
        .upload(path, file, { contentType: contentTypeFor(file.name) ?? undefined, upsert: false });
      if (error) {
        return {
          error: "The file could not be uploaded. Submissions may be closed, or the file was rejected.",
          values: { content: String(formData.get("content") ?? "") },
        };
      }
      formData.set("filePath", path);
      formData.set("fileName", file.name.slice(0, 200));
      formData.set("fileSize", String(file.size));
    }

    return submitSolution(prev, formData);
  }, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="challengeId" value={challengeId} />
      <input type="hidden" name="slug" value={slug} />
      <FormAlert state={state} />
      <TextAreaField
        label="Your answer"
        name="content"
        rows={8}
        defaultValue={state.values?.content}
        hint={`Up to ${MAX_CONTENT_LENGTH.toLocaleString("en-US")} characters.`}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium">
          Attachment (optional)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.txt,.md,.csv,.json,.zip,.png,.jpg,.jpeg"
          className="text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-text"
        />
        <p className="text-sm text-muted">{FILE_HINT}</p>
      </div>
      <p className="text-sm text-muted">
        Each submission is saved as a new version and cannot be edited afterwards.
      </p>
      <SubmitButton pendingLabel="Submitting…">Submit</SubmitButton>
    </form>
  );
}
