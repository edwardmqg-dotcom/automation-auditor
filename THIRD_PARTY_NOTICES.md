# Third party notices

Automation Auditor's own code uses the MIT license in [LICENSE](LICENSE), copyright 2026 EddieM. That license does not replace third-party copyright, license conditions or notices. This candidate distributes application source, not installed npm packages, native libraries or compiled bundles.

## Copied third party code

| Component | Source information retained locally | Notice to preserve |
| --- | --- | --- |
| Sites Vite plugin | `build/sites-vite-plugin.ts` identifies `@openai/sites-vite-plugin` 0.2.0 and `openai/sites#9` | [MIT notice](build/sites-vite-plugin.LICENSE), copyright 2026 OpenAI |
| shadcn stylesheet | `vendor/shadcn-tailwind-4.13.0.css`, imported by `app/globals.css` | [MIT notice](vendor/shadcn-tailwind-4.13.0.LICENSE.md), copyright 2023 shadcn |

The repository also retains starter framework and UI component code. It does not claim those components were originally authored by EddieM or that the entire application was newly written for the competition. The existing shadcn notice is retained alongside the UI code; component-by-component provenance remains part of the owner review.

## npm dependencies

Exact resolved versions and package integrity values are in [package-lock.json](package-lock.json). [Dependency license inventory](docs/dependency-license-inventory.json) records lockfile license declarations, checks installed versions against the independent locked installation, and fingerprints license or notice files found at package roots. A declaration or fingerprint is not a substitute for a license text or proof of full compliance. Paths in that inventory refer to an installation's dependency layout, not to files bundled in this source candidate.

The lockfile includes more than MIT dependencies: Apache, ISC, BSD, MPL, LGPL and other declarations are retained without being relicensed. Platform-specific optional packages can be absent from the macOS installation. Some installed packages have no notice file at their package root; the inventory records those gaps rather than inventing notices.

Install dependencies with the lockfile and preserve their upstream notices. Before distributing a compiled application or native dependency binaries, review the exact redistributed components and their notice, source-availability and other applicable requirements. The source-only inventory is not binary redistribution clearance.

## Tested tools and offline records

Material Auditor A and B are external tested tools, not included implementations or automatically connected examples. Their licenses are separate. The offline test records in `lib/fixtures/` preserve pseudonymous run references and historical provider identifiers for regression tests; see [fixture notes](lib/fixtures/README.md). They are not authorization to expose personal or customer records.
