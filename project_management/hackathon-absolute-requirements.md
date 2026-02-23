The video announces the Gemini Live Agent Challenge, a global Google Cloud hackathon focused on building multimodal AI agents that support real‑time, immersive interactions beyond simple text chat. Participants must deploy an AI agent on Google Cloud that uses Gemini models (for example Gemini 3 or Nano), the GenAI SDK or Agent Development Kit, and at least one Google Cloud service such as Firestore, Cloud SQL, Cloud Storage, Cloud Run, or Vertex AI.

Projects can target one of three categories: (1) Live Agents for natural, interruption‑tolerant real‑time conversations (e.g., translators, vision tutors, crisis negotiators), (2) Creative Storyteller Agents that blend text, images, audio, and video into rich experiences like interactive storybooks or marketing asset generators, and (3) UI Navigator Agents that understand visual screens and perform actions, such as universal web navigators or visual QA testers.

To qualify, teams must submit a public code repository, an architecture diagram and setup guide showing Gemini integration, and a demo video under four minutes demonstrating the agent running live on Google Cloud with visible proof (for example, Cloud Run dashboard or live URL). Bonus points are available for publishing a blog post or video about the project with the event hashtag and for including deployment automation scripts in the repo.

Prizes include a share of 80,000 USD in cash, Google Cloud credits, virtual coffee chats with the Google Cloud team, and a grand prize trip to Google Cloud Next 2026 in Las Vegas with tickets and a travel stipend. Submissions are open from February 16, 2026, to March 16, 2026, at 5:00 p.m. PDT, and registration details are linked from the video description and hackathon homepage.



The goal is to build and deploy a **multimodal AI agent on Google Cloud** that goes beyond plain text chat, using Gemini models plus at least one Google Cloud service, in one of three defined categories.

## Overall goal

- Create an AI agent that can **see, hear, speak, and/or act** using multimodal inputs and outputs (text, audio, images, video, screen content).  
- Deploy it on Google Cloud in a way that is usable, real time (where relevant), and demonstrates a clear practical use case.  
- Show how Gemini (e.g., Gemini 3, Nano) is integrated via the GenAI SDK or Agent Development Kit (ADK).

## Category requirements

You must pick **one** of these three categories and design the agent to fit it.

### 1. Live Agent

- Focus: Real-time interaction, spoken or conversational experiences.  
- Requirements/expectations:  
  - Natural back‑and‑forth conversation, including handling interruptions gracefully.  
  - Use cases they suggest: real-time translator, vision‑enabled tutor (looks at what user shows), crisis negotiator‑style helper.

### 2. Creative Storyteller Agent

- Focus: Rich, creative experiences using **multiple media types**.  
- Requirements/expectations:  
  - Combine text, images, audio, and/or video into a single integrated workflow.  
  - Use cases they suggest: interactive storybook, full marketing asset generator (e.g., copy + images + maybe video/audio in one flow).

### 3. UI Navigator

- Focus: Understanding visual interfaces and acting on them.  
- Requirements/expectations:  
  - Agent should interpret visual screens such as browser windows or device displays.  
  - It must perform actions based on user intent (e.g., click, navigate, fill forms, test flows).  
  - Use cases they suggest: universal web navigator, visual QA tester.

## Technical requirements

For any category, your solution **must** satisfy all of these:

- Use a **Gemini model** (e.g., Gemini 3 or Gemini Nano).  
- Use either the **GenAI SDK** or the **Agent Development Kit (ADK)** for integration.  
- Use at least **one Google Cloud service**, for example:  
  - Data services: Firestore, Cloud SQL, Cloud Storage.  
  - Platform/compute: Cloud Run, Vertex AI (they say “Vert.x AI” in transcript, but this clearly refers to Vertex AI).  
- Backend must actually run on **Google Cloud**, not just locally.

## Submission requirements (what you must deliver)

To qualify, your submission must include **all** of the following:

1. **Hosted project URL + text description**  
   - A running version of your agent with a public URL, plus a written description of what it does.

2. **Public code repository**  
   - Repo (e.g., on GitHub) that contains the complete source code so judges can inspect how you built the project.

3. **Architecture diagram and setup guide**  
   - Diagram showing components (frontend, backend, Gemini model, Google Cloud services, data stores, etc.).  
   - Setup/README that explains how to deploy and how Gemini/ADK is integrated in the solution.

4. **Demo video (< 4 minutes)**  
   - Maximum 4 minutes long.  
   - Must show the agent working **in real time** (no mockups or static screenshots pretending to work).  
   - Must show **proof that backend is running on Google Cloud**, e.g.:  
     - Cloud Run dashboard on screen during demo, or  
     - Live URL that clearly points to a Google Cloud–hosted service.

## Bonus point requirements (optional but recommended)

You can increase your score by doing the following:

- Publish a **blog post or video** about your project.  
  - Use the hashtag #GeminiLiveAgentChallenge.  
- Include **automation scripts or tools** for cloud deployment in your Git repo.  
  - For example: Terraform, gcloud scripts, deployment pipelines, or other infra-as-code.

## Timeline and eligibility timing

- Submissions open: **February 16, 2026**.  
- Submissions close: **March 16, 2026, 5:00 p.m. PDT**.  

## What the judges are effectively looking for (implied goal)

From these rules, the implied goals for a strong submission are:

- A **real, working agent** that clearly uses Gemini multimodal capabilities, not just a simple text bot.  
- Clean **architecture on Google Cloud** with at least one managed service used in a meaningful way.  
- Clear **developer story**: good documentation, architecture diagram, and reproducible deployment.  
- A polished **demo** that proves real‑time behavior (especially for live agents) and real cloud hosting.  
- Extra initiative shown through public write‑ups and automated deployment tooling.

If you want, I can help you pick a category and draft an architecture that fits your current stack (e.g., Cloud Run + Firestore + Gemini) and satisfies all these requirements.