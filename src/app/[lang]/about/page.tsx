import Link from "next/link";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";

export const generateMetadata = (props: PageProps<"/[lang]/about">) =>
  localizedMetadata(props.params, (d) => ({
    title: d.about.title,
    description: d.about.metaDescription,
  }));

export default async function AboutPage(props: PageProps<"/[lang]/about">) {
  const { d } = await langFromParams(props.params);
  const how = [d.about.h1, d.about.h2, d.about.h3, d.about.h4];
  const promise = [d.about.p1, d.about.p2, d.about.p3];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">{d.about.title}</h1>
      <p className="mt-4 text-lg text-muted">{d.about.lead}</p>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">{d.about.missionTitle}</h2>
        <p className="mt-3 text-muted">{d.about.missionBody}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">{d.about.howTitle}</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {how.map((text, i) => (
            <li key={text} className="glass flex gap-4 rounded-lg p-4">
              <span className="font-mono text-lime">0{i + 1}</span>
              <span className="text-muted">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">{d.about.promiseTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {promise.map((text) => (
            <li key={text} className="flex gap-3 text-muted">
              <span aria-hidden="true" className="text-lime">✓</span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass mt-14 rounded-lg p-8">
        <h2 className="text-2xl font-semibold tracking-tight">{d.about.ctaTitle}</h2>
        <p className="mt-2 text-muted">{d.about.ctaBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex h-11 items-center rounded-md bg-lime px-5 font-medium text-ink">
            {d.home.createAccount}
          </Link>
          <Link href="/challenges" className="inline-flex h-11 items-center rounded-md border border-line px-5 font-medium">
            {d.home.browse}
          </Link>
        </div>
      </section>
    </main>
  );
}
