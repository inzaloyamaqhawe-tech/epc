# GitHub and AWS handoff

Source is available in [inzaloyamaqhawe-tech/epc](https://github.com/inzaloyamaqhawe-tech/epc). GitHub Actions validates the source and builds the container on pushes/PRs. Successful CI exposes a tracked-source ZIP as an Actions artifact. GitHub source access is not a running authenticated application: the server still needs an AWS runtime, HTTPS, secrets and persistent storage. GitHub Pages cannot execute this Node/SQLite backend. A separate sample-only showcase is built and published through `pages.yml`; it uses the same visual components with a browser-local IndexedDB adapter with editable sample records, imports and attachments, never the real database or account system.

## Sign-in versus deployment permission

[AWS's newer account experience supports GitHub sign-in](https://docs.aws.amazon.com/signin/latest/userguide/sign-in-urls-defined.html) through the AWS account sign-in page. Use the same GitHub identity that owns or can access this repository when linking that AWS experience. Existing AWS IAM/Identity Center accounts may use their existing sign-in instead. No AWS account was created, billed, logged into or linked by this build.

Signing in with GitHub is separate from allowing a GitHub Actions workflow to operate in AWS. The prepared workflow uses [GitHub OIDC federation](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), exchanging a workflow identity for temporary AWS credentials. Do not place permanent AWS access keys in the repository or frontend.

## Prepared publishing workflow

`Publish container to AWS ECR` is manual-only, main-branch-only, and scoped to the GitHub `production` environment. It runs the tests, builds an image tagged with the exact commit SHA, and pushes to an existing ECR repository. It does **not** create infrastructure, alter a live service, or automatically deploy SQLite to ephemeral/multiple instances.

An AWS account operator must first configure the GitHub OIDC provider and an ECR publishing role. Configure the production environment with these non-secret repository/environment variables:

```
AWS_ROLE_ARN=the operator-created role ARN
AWS_REGION=the chosen AWS region
ECR_REPOSITORY=the existing private ECR repository name
```

The IAM role trust should require the OIDC audience `sts.amazonaws.com` and exact subject `repo:inzaloyamaqhawe-tech/epc:environment:production`. Restrict that GitHub environment to main and the intended deployers. Follow [AWS IAM trust guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html); do not trust wildcard repositories or arbitrary PR subjects.

Grant `ecr:GetAuthorizationToken` as required by ECR and scope image-upload permissions (`BatchCheckLayerAvailability`, `InitiateLayerUpload`, `UploadLayerPart`, `CompleteLayerUpload`, `PutImage`) to the exact ECR repository ARN. This role does not require general administrator, IAM, billing or database permissions. Initial role/provider setup is an AWS operator action and is not silently performed by source publication.

For this SQLite release, select a single Node/container instance with a durable data volume and a recovery plan; EC2 is a viable architecture after configuration. Set the actual production origin and encrypt/protect key custody before real client use. A future RDS-backed/multi-instance version requires a database adapter and different operational design. Neither Amplify static hosting nor an ephemeral container automatically solves database persistence.

No AWS role ARN, region choice, repository infrastructure or login session was supplied, so cloud execution remains unconfigured. The workflow is reviewable and will fail clearly if those values are absent.
