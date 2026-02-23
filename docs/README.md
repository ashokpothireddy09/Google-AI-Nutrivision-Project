# Documentation Index

This folder contains product, technical, testing, and deployment documentation.

## Structure

- `docs/requirements/`
  - Product and technical requirement baselines.
- `docs/project-execution-spec/`
  - Spec pack and templates used for structured planning/execution.
- `docs/testing/`
  - Step-by-step test guides for backend, frontend, and Terraform.
- `docs/terraform-deployment.md`
  - Practical deployment walkthrough for infrastructure and runtime.

## Recommended Reading Order

1. `project_management/README.md`
2. `project_management/requirements_from_user.md`
3. `project_management/status.md`
4. `project_management/checklist.md`
5. `docs/requirements/README.md`
6. `docs/project-execution-spec/README.md`
7. `docs/testing/README.md`
8. `docs/terraform-deployment.md`

## Usage Rules

- Keep implementation progress and decisions in `project_management/`.
- Keep test execution instructions in `docs/testing/`.
- Keep requirement-level statements in `docs/requirements/`.
- Avoid duplicating source-of-truth values (project ID, region, deadlines) across many files without syncing.
