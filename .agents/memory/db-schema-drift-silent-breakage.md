---
name: DB schema drift causes silent full breakage
description: A Drizzle schema column that exists in code but was never pushed to the actual Postgres table breaks every query touching that table, not just the new field.
---

Adding a column to a Drizzle schema (e.g. `inStock`) and merging the code is not the same as it existing in the database. If `drizzle-kit push` is never run after the schema change, every `db.select()`/`insert()` that touches the table fails outright (Postgres "column does not exist"), because Drizzle's generated SQL lists all schema columns explicitly — not just the ones a given query cares about.

**Why:** This makes the failure mode misleading: the user-visible symptom was "all products disappeared and I can't add new ones," which looks like an app logic/permissions bug, but the actual cause was a missing column from an earlier merged feature (stock tracking) that never got its migration applied.

**How to apply:** When a "everything in this table is broken" report comes in (list empty, create/update all fail) right after a schema-touching feature merged, verify the schema was actually pushed to the live database before chasing it in application code.
