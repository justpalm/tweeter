# Tweeter Project Instructions

## Project context

This is the BYU CS 340 Tweeter project. The current course context is Milestone 3: move the 14 feature operations from client-side fake data to AWS Lambda behind API Gateway, with client calls routed through client Services, `ServerFacade`, and `ClientCommunicator`. Work feature by feature. Milestone 3 uses dummy server data; persistence is a later milestone.

Keep the client, network, Lambda handler, and server-service layers distinct. Put shared request/response types in `tweeter-shared`, and treat data crossing the network as JSON. Follow existing project patterns, preserve behavior outside the task, and make focused changes.

## How we work together

- Treat each change as a bounded task: state the objective, scope/files, constraints, and how completion will be checked. If an important requirement or behavior is ambiguous, ask before choosing.
- For uncertain or broad tasks, propose an approach and expected files first; wait for approval before editing.
- Read the relevant specification and existing code before changing anything. Check the final diff against each requirement; do not treat an agent summary or passing self-authored tests as proof of correctness.
- Run the smallest relevant tests/build/type checks and report exact results. Do not claim completion for unimplemented work or checks that were not run.
- Keep changes understandable and reviewable. The student is responsible for reviewing, understanding, and being able to explain submitted work.
- Use [AI-PROMPT-TEMPLATES.md](./AI-PROMPT-TEMPLATES.md) when helpful to scope a task, request a diagnosis, or prepare a handoff.

## Milestone 3 expectations

The specification calls for facade integration tests for registration, followers, and follower/following counts, plus a successful story-retrieval test through `StatusService`. Verify meaningful expected values. Document API methods, configure CORS for success and error responses, and test the relevant handler, API Gateway, and client layers.

Milestone deliverables include an exported Swagger/OpenAPI description, a send-status sequence diagram, a project zip, and an AI attribution log. Follow the assignment's commit expectations.

Milestone 3 is AI Use Level 3 (Partner): collaborate on code and text, but the student must verify and understand all submitted work. Keep AI attribution accurate and up to date; follow instructor/course disclosure requirements.

## Official references

- [Milestone 3 specification](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-3/milestone-3.md)
- [Professor Wilkerson, “Best Practices for Programming with AI Agents: Getting Started with Task Delegation” (PDF)](https://raw.githubusercontent.com/BYU-CS-340/softwaredesign/main/instruction/ai-programming/Best_Practices_for_Programming_with_AI_Agents-Getting_Started_with_Task_Delegation.pdf)
- [Milestone 3 FAQ](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-3/milestone-3-faq.md)
- [API design suggestions](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-3/api-design-suggestions.md)
- [AWS resource management](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-3/automating-aws-resource-management.md)
- [Debugging tips](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/milestone-3/debugging-tips.md)
- [Project overview](https://github.com/BYU-CS-340/softwaredesign/blob/main/tweeter/project-overview/tweeter.md)
- [BYU CS AI-use levels](https://cs.byu.edu/department/ai-policy)
