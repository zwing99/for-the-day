# Spec Delta

## MODIFIED Requirements

### Requirement: Vertical scrolling settles on complete screens
The reader SHALL use pages equal to the actual usable reading viewport, excluding quiet chrome and safe areas. In standalone phone portrait mode, the available app window SHALL determine shell and reading-surface geometry rather than a fixed device-model size. After vertical touch, wheel, trackpad, keyboard, or programmatic navigation settles, a page boundary SHALL align with the viewport within two CSS pixels; the reader SHALL NOT remain between screens. Intro and end-of-passage presentation SHALL respect this sequence. Passage ends SHALL remain bounded without automatic passage changes. Resizing, restoration, and density changes SHALL align the page containing the logical verse, rather than place that verse midway in the viewport.

#### Scenario: Partial vertical drag
- **WHEN** a reader releases a vertical drag between two pages
- **THEN** the feed settles to a complete page without overlapping adjacent pages at rest

#### Scenario: Restored packed verse
- **WHEN** an explicit or saved verse belongs to a grouped page
- **THEN** that entire page is aligned and the addressed verse identity is retained

#### Scenario: Installed phone portrait page
- **WHEN** an installed phone reader opens in portrait
- **THEN** the shell and reading pages use the available app window, and a settled page aligns with the reading surface within two CSS pixels
