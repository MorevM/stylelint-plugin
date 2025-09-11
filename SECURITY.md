# Security Policy

This document describes how to responsibly report vulnerabilities
and how security fixes are released for the package.

## Supported Versions

The project follows **[Semantic Versioning (SemVer)](https://semver.org/)**. \
Security fixes are released as **patch** versions on the latest **minor** line. \
**Older versions** may receive fixes only for critical issues.

## Reporting a Vulnerability

Do **not** open public issues for security problems. Use one of the private channels:

* **GitHub Security Advisory**: [create a private report](./security/advisories/new)
* **Email**: [max.seainside@gmail.com](mailto:max.seainside@gmail.com)

A report should include description, impact, reproduction steps, and affected versions. \
If the issue lies in a **dependency**, please mention the affected package and version.

## Disclosure Process

* Receipt confirmed within **2 business days**.
* Severity assessed and fix prepared.
* Patch release published.
* Advisory issued with credit to the reporter (if agreed).

GitHub Security Advisories allow private coordination, linking to fixed releases, and optional CVE assignment.

## Scope

**Relevant classes:** ReDoS, code execution via unsafe input, path traversal, prototype pollution, supply-chain issues. \
**Out of scope:** stylistic rule behavior or non-security bugs.

## Preferred Languages

Vulnerability reports are accepted in **English** or **Russian**.
