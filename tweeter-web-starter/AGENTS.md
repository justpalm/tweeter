# Tweeter Project Instructions

## Project context

This is the BYU CS 340 Tweeter project. The current work is Milestone 4A: completing the persistent backend and data-access layer. Status, story, and precomputed feed persistence have been implemented and deployed, but do not assume all Milestone 4A passoff checks are complete. Check the source, [AI-ATTRIBUTION.md](./AI-ATTRIBUTION.md), and current AWS state for what is implemented, deployed, and still pending.

Milestone 4B is a separate scalability milestone. Its asynchronous SQS feed processing and performance requirements are not met by the current synchronous Milestone 4A fanout.

Keep the client services, network facade/communicator, Lambda handlers, server services, database-independent DAOs, and concrete AWS DAOs distinct. Network data remains JSON and shared request/response types belong in `tweeter-shared`.

## Collaboration and review

- Milestone 4A is AI Use Level 3 (Partner). Collaborate on designs and code, but the student must review, understand, and be able to explain all submitted work. Keep AI attribution accurate and current.
- Treat each task as bounded. Inspect the worktree and relevant source/specification first; preserve existing changes.
- For behavior with multiple reasonable interpretations, explain the options and ask the student before choosing or changing behavior.
- For a design task, present a concise proposal and wait for approval before implementation.
- Verify the exact requirement with focused tests/builds. Distinguish local unit tests, live DAO tests, deployed API tests, and browser/UI checks; report which actually ran.
- Keep changes surgical, update directly related documentation, and do not claim milestone completion from a passing unit suite alone.
- Use [AI-PROMPT-TEMPLATES.md](./AI-PROMPT-TEMPLATES.md) when helpful.

## Milestone 4A design constraints

- DAO interfaces must be database-agnostic. Services obtain DAOs through `DAOFactory` or dependency injection and must not construct concrete DAOs.
- A status is one post; a story is one author's posts; a feed contains posts from accounts that user follows.
- A post is saved to its authenticated author's story and copied to the followers' stored feeds. Following does not backfill older posts; unfollowing does not remove copies already in a feed.
- Preserve existing network DTOs and API signatures unless the student approves a change. The existing status cursor has no opaque ID, so pagination keys must remain reconstructible from the cursor and correctly handle timestamp ties.
- Authenticate every protected Lambda operation. Use the stored session owner/profile for posting rather than trusting client-supplied author identity.
- Feed reads are owner-only: require the requested `userAlias` to match the authenticated session owner. Stories remain readable for other users. Keep unit and live-integration fixtures aligned by using the feed owner's session token.
- The 4A synchronous follower scan and feed writes can be slow at scale and can partially deliver before an error. Do not describe this as meeting 4B's performance requirements.

## Testing and AWS changes

- Prefer focused local tests for service/DAO behavior. Live DAO tests and deployed API tests are opt-in and may create AWS records; use the repository's ownership-checked fixtures and cleanup controls, and verify cleanup.
- Milestone 4A requires more than ten items in at least one tab to exercise pagination/scrolling. The prepared live status scenario covers 13 story items and 11 feed items, but a live run and browser scrolling check must be confirmed separately.
- Before AWS deployment, validate/build, inspect the exact CloudFormation change set, and preserve existing table names/capacities unless explicitly approved. Deployment and live-test authorization are separate from local code changes.

## Official references

- [Milestone 4A specification](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-4a/milestone-4a.md)
- [Milestone 4 FAQ](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-4a/milestone-4-faq.md)
- [Project overview](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/project-overview/tweeter.md)
- [Milestone 4B specification](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-4b/milestone-4b.md)
- [Dr. Wilkerson's AI programming reading](https://github.com/BYU-CS-340/softwaredesign/tree/main/instruction/ai-programming)
- [BYU CS AI-use levels](https://cs.byu.edu/department/ai-policy)
