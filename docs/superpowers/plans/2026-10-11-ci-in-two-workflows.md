# CI in Two Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The repository's CI is two workflows named by when they run: `checks.yml` on pull requests and main, deciding in one job what a change touches, and `release.yml` on a release, building the apps and putting reha.stream up. `tests.yml` and `site.yml` go.

**Architecture:** `checks.yml` starts with a job `what changed` that reads the pull request's own diff once and says which checks it needs (app, site, preview); every other job asks it. The steps that were written out in several places live once each in two composite actions: `.github/actions/app` (build the interface, install the app, run every Python suite) and `.github/actions/site` (install, test, build, draw the link picture, lay out the build for Vercel). `release.yml` uses both: its builds stand on the app action, its site job on the site action, and its deploy job is the only place anything goes to reha.stream. A job that can be skipped never uses a matrix, so its name reads the same whether it ran or not.

**Tech Stack:** GitHub Actions (workflows, composite actions, `needs` outputs, `workflow_dispatch` choice input), bash and git for the change table, the Vercel CLI as today. No new third-party action.

**Spec:** No written spec. Alex's choice of variant A, "По моменту" (2026-10-11 14:42Z), on the CI map https://claude.ai/artifact/JWC3Gd4pnAqn7bsLPrbgcd: `checks.yml` for PR and main with one "what changed" job, `release.yml` for builds and the site deploy, replacing `tests.yml` and `site.yml`. His rulings from PR #44 carry over: a Vercel preview only for a pull request that changes the site (14:26Z), and no app tests for a pull request that changes only the site (14:32Z). The map's six problems are what this fixes: three ways of telling what changed, macos/windows naming both tests and builds, site.yml doing three jobs, setup written out in six places, the interface built in two workflows, CodeQL invisible in the files.

## Global Constraints

- Exactly two workflow files: `.github/workflows/checks.yml` and `.github/workflows/release.yml`. `tests.yml` and `site.yml` are deleted. Shared steps live in `.github/actions/app/action.yml` and `.github/actions/site/action.yml`.
- Job names, literal, no matrix in either file: `checks.yml`: `what changed`, `app · macos`, `app · windows`, `interface`, `site`, `site · preview`; `release.yml`: `build · macos`, `build · windows`, `site`, `site · deploy`. GitHub shows a skipped matrix job under its unexpanded name (`app · ${{ matrix.label }}`), which is why there is none.
- Action versions as today: `actions/checkout@v7`, `actions/setup-node@v7` (Node `"22"`), `actions/setup-python@v7` (`"3.12"`), `actions/upload-artifact@v7`, `actions/download-artifact@v8`, `softprops/action-gh-release@v3`, `vercel@62.4.0`.
- Permissions: `contents: read` at the top of both files; `contents: write` only on `build · macos` and `build · windows` (they attach the zips).
- The zips keep their names, `RehearsalRecorder-macos.zip` and `RehearsalRecorder-windows.zip`: every copy already out there asks GitHub for exactly those (`src/rehearsal_recorder/updates.py`). The built app and its self-test paths stay `dist/Reha.app/Contents/MacOS/Reha` and `dist/Reha/Reha.exe`.
- Kept from today, unchanged in effect: app tests on every push to main and on every pull request except one that changes only the site; the site built and tested for a pull request that touches `site/`, `ui/` or `CHANGELOG.md`; a preview only for a same-repository, non-Dependabot pull request that changes the site itself; reha.stream changes only after a published, non-pre-release release has both zips attached, or by hand; og.png drawn in Inter with `site/scripts/og-fonts.conf`; the Vercel upload laid out as today (plain files plus a `vercel.json` with `framework: null`, empty install and build commands, `outputDirectory: "."`, the routes from `site/vercel-config.json`), deployed with `vercel deploy site [--prod]`, never `--prebuilt`.
- Composite actions: every `run` step says `shell: bash`; steps cannot carry `timeout-minutes`, so the fonts step uses `timeout 300`; the upload of a Playwright report on failure stays in the calling job, after the action, with `if: failure()`.
- Comments in the repository's voice: plain English, saying why, as the current workflow headers do.
- PR #43 (design system, open) changes `tests.yml`'s `interface` job: `timeout-minutes: 30`, a `Design check` step (`npm run design-check`) after Install, a `Showcase` step (`npm run build-storybook`) after Vitest, `timeout-minutes: 10` on Install the browser. Whichever of the two merges second carries those into `checks.yml`'s `interface` job; git reports it as a modify/delete conflict on `tests.yml`, so it cannot be lost silently.
- The work goes on branch `claude/project-thread-awzc7k`, restarted from main once Alex gives this plan his «ок»: PR #44's two commits are dropped (this replaces what they did, and their messages carry the session link Alex asked to keep out of commits), the branch is force-pushed with lease, and PR #44 becomes this change (new title and body). This plan's own commit goes on the restarted branch too. Commit messages end with the `Co-Authored-By:` line only; the PR body ends with the plain "Generated with Claude Code" line, no session link. Merging waits for Alex's word.

## Review Focus

1. **Git cannot tell what a pull request changes** (the merge commit's first parent not fetched, a shallow clone, a git error): every check runs, with a warning in the log, never none. Pinned in Task 1's harness (depth-1 case).
2. **A pull request that changes only `site/`**: `site` and `site · preview` run; `app · macos`, `app · windows` and `interface` show as skipped under their own names. Pinned in Task 1's harness; the names are checked on the PR's own run in Task 6.
3. **"Put the site up again" by hand, with both builds skipped**: `site` and `site · deploy` still run (a job whose ancestor was skipped is skipped too unless its `if` says otherwise), and the site is built from the latest release's `site/`, `ui/` and `CHANGELOG.md`, not the branch's, with no file from the branch left over. Pinned in Task 4 (the `if` expressions and a scratch-repo check of the restore line).
4. **A pre-release**: both zips attach, nothing goes to reha.stream. Pinned in Task 4's `site` job `if`.
5. **A pull request from a fork or from Dependabot that changes the site**: built and tested, no preview (secrets do not reach it). Pinned in Task 3's `site · preview` `if`, copied from today's `preview` job.

---

### Task 1: `checks.yml` and its `what changed` job

**Files:**
- Create: `.github/workflows/checks.yml`
- Test (scratch, not committed): `<scratchpad>/ci-sim/what-changed.sh`

**Interfaces:**
- Produces: job id `changes`, name `what changed`, outputs `app`, `site`, `preview`, each the string `true` or `false`; later jobs use `needs: changes` and `needs.changes.outputs.<name> == 'true'`.

- [ ] **Step 1: Write the harness**

`what-changed.sh` reads `jobs.changes.steps[id=changes].run` from `checks.yml` with PyYAML, and for each case builds a scratch repo (a base commit holding every path below, a branch changing the case's paths, a `--no-ff` merge of it into the base, as GitHub's `refs/pull/N/merge`), runs the script there with `EVENT` and `GITHUB_OUTPUT` set, and compares the three outputs. Cases, as `changed paths → app site preview`:

```
ui/src/App.tsx                       → true  true  false
site/src/page/main.tsx               → false true  true
.github/actions/site/action.yml      → false true  true
CHANGELOG.md                         → true  true  false
src/rehearsal_recorder/api.py        → true  false false
.github/actions/app/action.yml       → true  false false
.github/workflows/release.yml        → true  false false
.github/workflows/checks.yml         → true  true  true
site/index.html + docs/building.md   → true  true  true
site/content/Pałyn.md (not ASCII)    → false true  true
EVENT=push                           → true  false false
EVENT=workflow_dispatch              → true  true  false
depth-1 clone of the merge (no HEAD^1) → true true true, and "::warning::" printed
```

- [ ] **Step 2: Run it to see it fail**

Run: `bash <scratchpad>/ci-sim/what-changed.sh`
Expected: FAIL, `checks.yml` not found.

- [ ] **Step 3: Write `checks.yml` with the `changes` job**

Header comment: what runs when (the table below, in words), that main requires no checks today, and that CodeQL is GitHub's default setup (Settings → Code security), not a file here. Triggers: `push` to `main`, `pull_request`, `workflow_dispatch`. `permissions: contents: read`. Concurrency: group `checks-${{ github.event_name == 'pull_request' && github.ref || github.run_id }}`, `cancel-in-progress: true` (a newer push replaces a pull request's older run; every other run has a group of its own, so main's runs all finish: a shared group would let a third push cancel the second's waiting run). The job checks out with `fetch-depth: 2` and runs, as step id `changes` with `EVENT: ${{ github.event_name }}`:

```bash
app=false site=false preview=false
if [ "$EVENT" != pull_request ]; then
  app=true
  if [ "$EVENT" = workflow_dispatch ]; then site=true; fi
elif ! files=$(git -c core.quotePath=false diff --name-only HEAD^1 HEAD); then
  echo "::warning::Could not tell what this pull request changes, so every check runs."
  app=true site=true preview=true
else
  while IFS= read -r f; do
    case "$f" in
      "") ;;
      site/*|.github/actions/site/*) site=true preview=true ;;
      .github/workflows/checks.yml)  app=true site=true preview=true ;;
      ui/*|CHANGELOG.md)             app=true site=true ;;
      *)                             app=true ;;
    esac
  done <<< "$files"
fi
echo "app=$app site=$site preview=$preview"
{ echo "app=$app"; echo "site=$site"; echo "preview=$preview"; } >> "$GITHUB_OUTPUT"
```

- [ ] **Step 4: Run the harness**

Run: `bash <scratchpad>/ci-sim/what-changed.sh`
Expected: every case PASS.

- [ ] **Step 5: Commit** `CI: one job says what a change touches (checks.yml)`

### Task 2: The app action, and the app's checks in `checks.yml`

**Files:**
- Create: `.github/actions/app/action.yml`
- Modify: `.github/workflows/checks.yml`
- Delete: `.github/workflows/tests.yml`

**Interfaces:**
- Consumes: `needs.changes.outputs.app` (Task 1).
- Produces: action `./.github/actions/app` with input `also` (extra pip packages, default `""`); it runs setup-node (npm cache on `ui/package-lock.json`), `npm ci` and `npm run build` in `ui`, setup-python (pip cache), `python -m pip install --upgrade pip`, `pip install -e . ${{ inputs.also }}`, `python tests/run_all.py`. The caller checks out first, with `fetch-depth: 0` (the version comes from the tag). Task 4 uses it with `also: pyinstaller`.

- [ ] **Step 1: Write the action**, carrying over tests.yml's comments on why `pip install -e .` and why the interface is built (`--selftest` looks for it).
- [ ] **Step 2: Add `app · macos` and `app · windows`** (ids `app-macos`, `app-windows`; `runs-on` `macos-latest` and `windows-latest`): checkout `fetch-depth: 0`, the action, `python tests/midi_live.py` ("The MIDI library on this machine"), `python -m rehearsal_recorder --selftest` ("Does it start"). `needs: changes`, `if: needs.changes.outputs.app == 'true'`. The header's reasoning about running on the two real systems moves here from tests.yml.
- [ ] **Step 3: Add `interface`** as tests.yml has it today (ubuntu, `working-directory: ui`, Install, Build, Vitest, Install the browser, Playwright, report `playwright-report` on failure), with the same `needs` and `if`.
- [ ] **Step 4: Delete `tests.yml`.**
- [ ] **Step 5: Lint**

Run: `check-jsonschema --builtin-schema vendor.github-workflows .github/workflows/checks.yml && check-jsonschema --builtin-schema vendor.github-actions .github/actions/app/action.yml`
Expected: `ok -- validation done` twice. (Installed once with `python3 -m pip install check-jsonschema`.)

- [ ] **Step 6: Re-run Task 1's harness** (the script must be unchanged). Expected: all PASS.
- [ ] **Step 7: Commit** `CI: the app's checks in checks.yml, setup in one action`

### Task 3: The site action, and the site's checks in `checks.yml`

**Files:**
- Create: `.github/actions/site/action.yml`
- Modify: `.github/workflows/checks.yml`

**Interfaces:**
- Consumes: `needs.changes.outputs.site`, `needs.changes.outputs.preview` (Task 1).
- Produces: action `./.github/actions/site` with input `version` (the release's tag; empty in a pull request, where the build takes the newest version in `CHANGELOG.md`). When `version` is set, its first step writes `VITE_SITE_VERSION=<version>` to `$GITHUB_ENV`. Then site.yml's steps from setup-node to "Lay out the build for Vercel", unchanged in what they do, with the fonts install as `timeout 300 sudo apt-get install …`, and last the upload of artifact `site` from `site/vercel-upload/`. Task 4 uses it.

- [ ] **Step 1: Write the action**, carrying over site.yml's comments on the link picture, the fonts, the Vercel layout and why Vercel must build the deployment (Analytics and Speed Insights).
- [ ] **Step 2: Add `site`** (`needs: changes`, `if: needs.changes.outputs.site == 'true'`): checkout, the action with no `version`, `site-playwright-report` on failure.
- [ ] **Step 3: Add `site · preview`** (id `preview`, `needs: [changes, site]`): today's `preview` job (environment `preview`, url from the deploy step, `vercel deploy site` without `--prod`), with:

```yaml
if: >-
  github.event_name == 'pull_request' &&
  github.event.pull_request.head.repo.full_name == github.repository &&
  github.actor != 'dependabot[bot]' &&
  needs.changes.outputs.preview == 'true'
```

- [ ] **Step 4: Lint** both changed files as in Task 2, Step 5. Expected: ok.
- [ ] **Step 5: Commit** `CI: the site's checks and preview in checks.yml, its build in one action`

### Task 4: `release.yml`: builds, the site and its deploy

**Files:**
- Modify: `.github/workflows/release.yml`
- Delete: `.github/workflows/site.yml`
- Modify: `tests/test_platform.py:447-454`
- Test (scratch, not committed): `<scratchpad>/ci-sim/restore.sh`

**Interfaces:**
- Consumes: `./.github/actions/app` with `also: pyinstaller` (Task 2); `./.github/actions/site` with `version` (Task 3).
- Produces: `workflow_dispatch` input `what`, `type: choice`, options `Rehearse the builds` (default) and `Put the site up again`; job outputs `site.outputs.tag`.

- [ ] **Step 1: Change the platform check first**: "the zips keep the names older copies ask for" asserts `all(name in release for name in updates.ASSETS.values())` instead of the matrix string; the other two checks stay.
- [ ] **Step 2: Write `restore.sh`**: a scratch repo with a tag whose `site/` lacks a file the branch has and has one the branch lacks; after `git restore --source="refs/tags/$tag" --worktree -- site ui CHANGELOG.md` the working tree's `site/`, `ui/` and `CHANGELOG.md` equal the tag's exactly (`diff -r` against `git archive` of the tag) and `.github/` is the branch's. Run it. Expected: PASS (it checks git's behaviour before the workflow relies on it).
- [ ] **Step 3: Rewrite `release.yml`.** Triggers: `release: [published]`; `workflow_dispatch` with input `what`. Jobs:
  - `build-macos` / `build-windows` (`build · macos` / `build · windows`), `permissions: contents: write`, `if: github.event_name == 'release' || inputs.what == 'Rehearse the builds'`: checkout `fetch-depth: 0`, the app action with `also: pyinstaller`, Package (`pyinstaller packaging/rehearsal-recorder.spec --noconfirm`), the self-test on the built app's literal path, the zip (bash `zip -qry` on macOS, `Compress-Archive` on Windows) to the literal zip name, upload-artifact, attach on a release.
  - `site` (`site`), `needs: [build-macos, build-windows]`:

```yaml
if: >-
  !cancelled() && (
    (github.event_name == 'release' && !github.event.release.prerelease &&
     needs.build-macos.result == 'success' && needs.build-windows.result == 'success') ||
    (github.event_name == 'workflow_dispatch' && inputs.what == 'Put the site up again'))
```

    Steps: checkout; "Which release" (id `release`, `GH_TOKEN`, `TAG: ${{ github.event.release.tag_name }}`): the tag, or by hand `gh release view --json tagName`, then `git fetch --depth=1` of that tag and the restore line from Step 2, so the site is the release's while the action is the branch's; writes `tag` to `$GITHUB_OUTPUT`; then the site action with `version: ${{ steps.release.outputs.tag }}`; `site-playwright-report` on failure. Output `tag`.
  - `deploy` (`site · deploy`), `needs: site`, `if: ${{ !cancelled() && needs.site.result == 'success' }}`, environment `production` with url `https://reha.stream`, `concurrency: { group: reha-stream, cancel-in-progress: false }`: download artifact `site` to `site`, today's Deploy step (the secrets check, `npx --yes vercel@62.4.0 deploy site --prod`, the summary line).
- [ ] **Step 4: Delete `site.yml`.**
- [ ] **Step 5: Lint** `release.yml` as in Task 2, Step 5, and `grep -c 'matrix' .github/workflows/*.yml`. Expected: ok; `0` for both files.
- [ ] **Step 6: Run the platform check's lines** in a scratch script that reads `release.yml` and `updates.ASSETS` the same way (the full suite needs packages not installed here; it runs on both systems in Task 6). Expected: True for all three.
- [ ] **Step 7: Commit** `CI: release.yml builds and puts the site up; site.yml goes`

### Task 5: The words around it

**Files:**
- Modify: `CONTRIBUTING.md:100-106`, `docs/building.md:93-97`, `docs/pushing-to-github.md:25-31`, `site/scripts/og-fonts.conf:7`, `site/src/page/main.tsx:18`, `.github/dependabot.yml:9-12`

- [ ] **Step 1:** CONTRIBUTING step 4 says the release workflow puts the site up (its `site` and `site · deploy` jobs); building.md and pushing-to-github.md say what Run workflow now asks (Rehearse the builds, the default, leaves the zips as artifacts; Put the site up again deploys the latest release's site). og-fonts.conf: "the site action (.github/actions/site) installs it". main.tsx: "see release.yml". dependabot's github-actions entry gets `directories: ["/", "/.github/actions/*"]` in place of `directory: "/"`, so the actions inside the two composite actions are kept current too, and its comment says so.
- [ ] **Step 2:** `grep -rn "site.yml\|tests.yml" --exclude-dir=node_modules --exclude-dir=superpowers . ; grep -n "site.yml\|tests.yml" CHANGELOG.md`. Expected: no match outside CHANGELOG.md's past entries.
- [ ] **Step 3:** CHANGELOG "Unreleased" gets no line: nothing a person using the app or the site sees changes.
- [ ] **Step 4:** Site tests still pass after the two comment edits: `npm test --prefix site`. Expected: all pass.
- [ ] **Step 5: Commit** `Docs: the two workflows by name`

### Task 6: Prove it on GitHub

- [ ] **Step 1:** Whole-branch review by a fresh reviewer against this plan; fix what it finds, each with its check re-run.
- [ ] **Step 2:** Push. Retitle PR #44 to "CI in two workflows: checks.yml and release.yml" and rewrite its body (repository template), saying it replaces the two earlier commits' approach and listing the names of the new checks.
- [ ] **Step 3:** The PR's own run: since `checks.yml` changes, every job runs. Expected: `what changed`, `app · macos`, `app · windows`, `interface`, `site`, `site · preview` green, the preview's URL in the PR.
- [ ] **Step 4:** Rehearse the builds: dispatch `release.yml` on the branch with `what: Rehearse the builds`. Expected: `build · macos` and `build · windows` green with both zips as artifacts; `site` and `site · deploy` skipped. Nothing is published or deployed.
- [ ] **Step 5:** Tell Alex it is green and ask for his merge word. After the merge, offer one "Put the site up again" run to prove the deploy path; it changes production, so only on his word.
- [ ] **Step 6:** If PR #43 has merged by then, merge main in and carry its interface steps into `checks.yml` (Global Constraints); if this merges first, tell the design-system thread that its `tests.yml` changes now go into `checks.yml`'s `interface` job.
