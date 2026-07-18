---
name: External-approval acceptance criteria block completion review
description: Why a task gated on a third-party approval can never pass completion review, and the failure mode of parking unrelated work on its branch.
---

# A task gated on external approval cannot pass completion review

Some tasks have an acceptance criterion that can only be satisfied by an
**external party**, not by any code change. The clearest example here: making
WhatsApp OTP work for real (non-sandbox) customer numbers requires the business
owner to move to a paid Twilio account AND Meta to approve a WhatsApp Business
sender. The app is already wired to use an approved sender once it exists, so
there is nothing left to build in-repl.

**Why this matters:** the completion code review judges the task against its
stated objective. As long as that objective depends on the pending external
approval, the review will reject completion every time — no amount of extra work
changes that verdict.

**Failure mode to avoid:** do not park large amounts of *unrelated* feature work
on such a task's branch hoping to ship it "along with" the blocked task. It can't
merge, because the task can't complete — so the work strands and never reaches
the user's live project, which is confusing and frustrating for them.

**How to apply:**
- Recognize external-approval blockers early and keep that task open/blocked.
- Land unrelated features on a *completable* task so they can actually merge.
- If a user needs stranded code delivered before the external blocker clears,
  use an alternate path (e.g. connect GitHub and push) — do not force-push to
  their live workspace remote.
- Completion review also catches real security regressions in the diff; treat
  those findings as genuine and fix them regardless of the task's status.
