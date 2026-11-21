# AI Task Prompt Templates

These are original, project-oriented templates based on the practices in Professor Wilkerson's [task-delegation article](https://raw.githubusercontent.com/BYU-CS-340/softwaredesign/main/instruction/ai-programming/Best_Practices_for_Programming_with_AI_Agents-Getting_Started_with_Task_Delegation.pdf). They are not quotations. Adapt the brackets and keep each task small enough to review carefully. Course and assignment rules always take priority.

## Plan before editing

Use when the approach or scope is not yet clear.

```text
I want to [goal].
Before editing, inspect [relevant files or areas] and propose:
- Your approach
- The files you expect to change and why
- Requirements or behavior that seem ambiguous
- How we can verify the result
Do not modify files yet. Ask me about any decision that belongs to me or the assignment.
```

## Implement a feature or endpoint

```text
Implement [feature, function, or HTTP method and path].

Expected behavior:
- Input: [request shape and important validation]
- Success: [result or response]
- Errors: [expected cases and response behavior]

Read first: [spec section, source files, types, and related tests]
Scope: [files or layer where the implementation belongs]
Keep unchanged: [interfaces, behavior, files, or response formats that must not change]
Tests: [specific cases and expected outcomes, including edge cases]
Done when: [relevant test/build/type-check commands pass]

If a requirement is unclear, stop and ask instead of guessing. Do not add dependencies or broaden the scope without approval.
```

## Diagnose and fix a bug

```text
Investigate this behavior: [what is wrong].
Reproduction or failing check: [steps, test name, or command]
Observed output: [exact error or actual result]
Expected output: [expected result]
My current explanation: [hypothesis and evidence, if available]

First check whether my explanation matches the code. If not, report what you find before editing. If it does, make the smallest correction in [file/function].
Do not change the test, unrelated files, or error behavior outside this case. Do not hide failures with skipped tests, ignored errors, unsafe casts, or compiler/linter suppressions.
Done when: [targeted checks and any required broader checks] pass. Report the exact results.
```

## Refactor without changing behavior

```text
Refactor [specific code] to [specific structural goal].
Read first: [files and related tests]
Behavior must remain the same for successful results, errors, and edge cases.
Keep exported names, signatures, and response formats unchanged unless I approve otherwise.
Do not modify tests or reformat unrelated code.
Done when: the existing relevant tests pass unchanged, and [type-check/build/lint commands] pass.
If the goal requires a behavior change, stop and explain why before editing.
```

## Write tests for existing behavior

```text
Write tests for [function/module] in [test file].
Read first: [implementation], [relevant assignment requirements], and [nearby example test]
Test cases and expected results:
- [input or condition] -> [expected result]
- [input or condition] -> [expected result]
- [edge case] -> [expected result]

Derive expectations from the specification or the cases above, not from the implementation's current output.
Change only [test file]. If a test fails, leave production code and the failing test intact and report expected versus actual.
Done when: the listed cases are covered and [commands] have been run. Report all results.
```

## Explain code before changing it

```text
Explain [symbol/file] without modifying files.
Walk through how it behaves for [representative input], including important values as they change.
List assumptions about inputs, asynchronous behavior, serialization, and external services.
Call out edge cases the code does not handle and distinguish what you verified in the code from what you inferred.
```

## Prepare a handoff for another session

```text
Write a concise handoff for continuing [task].
Include:
- What is complete and the files involved
- Decisions made and the evidence or requirement behind them
- What remains
- Checks run and their exact outcomes
- Any known issue or question that still needs a decision
Do not claim work or validation that did not happen.
```

## Draft an AI attribution entry

```text
Draft one entry for AI-ATTRIBUTION.md for this task.
List only files actually changed or created, mark new files, state the tool and task briefly, and leave Review as TODO.
Do not add an AI-assisted marker to a file unless the course/project instructions require it and the file type supports an appropriate marker.
```
