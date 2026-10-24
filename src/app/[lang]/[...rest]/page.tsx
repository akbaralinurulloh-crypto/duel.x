import { notFound } from "next/navigation";

// Any unknown path under a language renders the localized 404.
export default function CatchAll() {
  notFound();
}
