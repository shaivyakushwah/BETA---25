<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Signed-in pages live under `src/routes/_authenticated/` (client-rendered, redirects to `/login`); `/`, `/login`, `/signup` are public. Why: the session lives in the browser.
- Pages read data synchronously through `@/lib/db` after `useSnapshot()` loads the person's whole dataset via `getSnapshotFn`; scores and plans are computed client-side by the pure engines in `src/lib/engines`. Why: keeps the original page code intact and one round trip per change.
- All writes are server functions in `src/lib/app.functions.ts` (each defined inline with `createServerFn(...).middleware([requireSupabaseAuth])` — a factory helper breaks server/client splitting), called through same-named wrappers in `src/app/actions.ts` that refresh the snapshot.
- Database access goes through `src/lib/repo.ts` with the caller's authenticated client; every table is per-user (`user_id`) with own-row RLS. Why: the original app was single-user.
- AI calls (`src/lib/gemini.ts`) use Gemini via the Lovable AI Gateway unless a `GEMINI_API_KEY` secret is set; they degrade to the deterministic engine on failure.
- PDF resumes are parsed in the browser with `pdfjs-dist`. Why: the server runtime cannot run Node PDF libraries.
- tsconfig keeps `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` off to match the migrated source.
