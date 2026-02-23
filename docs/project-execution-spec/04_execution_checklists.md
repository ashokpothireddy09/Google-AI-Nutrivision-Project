# 04 - Execution Checklists

Use this as the operational done-definition. Mark every item explicitly.

## A. Scope and Spec Checklist

- [ ] BR/PR/TR/DR/NFR IDs finalized
- [ ] MVP and Beta boundaries frozen
- [ ] Acceptance criteria defined for all critical flows
- [ ] Requirement traceability matrix updated
- [ ] Assumptions list reviewed and approved

## B. Product and UX Checklist

- [ ] User flow from camera open to verdict is <= target step count
- [ ] Voice response is concise and understandable
- [ ] Barge-in works without broken audio overlap
- [ ] HUD shows only high-signal metrics
- [ ] Low-confidence UX path is explicit
- [ ] German label date handling works for both MHD and use-by cases
- [ ] Disclaimer text exists and is visible

## C. Engineering Checklist

- [ ] Live session connects reliably
- [ ] Backend proxy hides credentials
- [ ] Tool schemas validated by contract tests
- [ ] Barcode-first path works with real products
- [ ] Search fallback works with OCR-derived query
- [ ] Disambiguation question path implemented
- [ ] Scoring engine deterministic for same input
- [ ] Caching layer integrated and measured
- [ ] Structured HUD event payload validated

## D. Data and Policy Checklist

- [ ] Data source mappings documented
- [ ] Regulatory categories normalized
- [ ] "Not authorized" claims require explicit policy match
- [ ] "Restricted" vs "warning required" distinctions implemented
- [ ] Uncertain data state handled explicitly
- [ ] Policy versioning field present in outputs

## E. Quality and Test Checklist

- [ ] Unit tests for scoring/policy/date parsing
- [ ] Contract tests for tool input/output
- [ ] Integration tests for barcode and fallback
- [ ] E2E test includes interruption path
- [ ] E2E test includes source failure fallback
- [ ] Regression suite passes before each milestone gate

## F. Performance and Reliability Checklist

- [ ] Time-to-first-verdict measured and tracked
- [ ] Cache hit ratio monitored
- [ ] Timeout handling tested
- [ ] Retry/backoff behavior tested
- [ ] Graceful degradation tested

## G. Security and Ops Checklist

- [ ] Secrets not present in client bundle
- [ ] Runtime configuration documented
- [ ] Logging excludes sensitive raw content where unnecessary
- [ ] Deployment reproducible from clean environment
- [ ] Rollback path documented and tested

## H. Demo and Storytelling Checklist

- [ ] Demo script aligned with product reality
- [ ] Live interruption moment rehearsed
- [ ] One warning additive example rehearsed
- [ ] One expiration-date example rehearsed
- [ ] Cosmetics beta segment prepared (if stable)
- [ ] Backup path prepared for network issues
- [ ] Demo run passes 3 consecutive full rehearsals

## I. Submission Checklist

- [ ] Public repo is clean and runnable
- [ ] Setup instructions are complete
- [ ] Architecture diagram included
- [ ] Google Cloud deployment proof prepared
- [ ] Demo video length and quality validated
- [ ] Final QA sign-off recorded

## J. Post-Submission Checklist

- [ ] Improvement backlog captured
- [ ] Known issues documented
- [ ] Next iteration scope drafted
