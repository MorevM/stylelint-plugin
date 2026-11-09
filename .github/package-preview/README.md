# Package previews

Preview packages let contributors test unreleased changes without building the plugin themselves.
The package is built from a specific commit and uploaded to [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new).

## Setup

Install the [pkg.pr.new GitHub App](https://github.com/apps/pkg-pr-new) with access to this repository.
The workflow must be merged into `master` before comment and manual triggers become available.

## From a pull request

Post a comment containing exactly `/preview` on an open pull request.
The command requires write access and supports branches in this repository.
After publication, the workflow replies with an installation command for the pull request's head commit.
Post another `/preview` comment to publish later changes; pushes alone do not publish previews.

## From GitHub Actions

Open **Actions → Package preview → Run workflow** and keep the workflow branch set to `master`.
Enter the branch, tag, or commit to build in the `ref` field.
This also works for branches created before the workflow was added.
The installation command appears in the workflow run's summary.

## Packaging

The publisher has its own lockfile so it can build older branches without changing their dependencies.
Package scripts run with read-only repository permissions; replying to a pull request runs in a separate job.
Preview packages use `0.0.0-preview-<sha>` versions and include the regular build output.
They are temporary test artifacts; pkg.pr.new may remove old or unused previews.
