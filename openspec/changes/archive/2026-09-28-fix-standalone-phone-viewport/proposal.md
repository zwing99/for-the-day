# Proposal

## Why

An installed iPhone reader can leave a conspicuous unused strip below the passage indicators while the small header label appears unclear near the status bar. The reported iPhone 17 Pro screenshot shows that simulated viewport and safe-area checks have not established the actual standalone layout.

## What Changes

- Make the installed iPhone portrait reader fill the available app window, with passage controls adjacent to the bottom safe area and no avoidable blank band beneath them.
- Keep the portrait header text and menu clear and legible below the status bar and Dynamic Island in light and dark appearance.
- Measure the real standalone viewport, safe areas, shell, reading surface, and settled page alignment on a physical iPhone 17 Pro; run browser and cached typography regressions for other viewport sizes.
- Replace any viewport or header adjustment shown by measurements to cause the mismatch, without using device-model strings or fixed notch dimensions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reader-experience`: Specify installed-phone portrait use of the available window, safe-area control placement, and legible header context.
- `screen-paged-reading`: Require measured page geometry and snap alignment in the installed-phone portrait state.

## Impact

Likely touches the reader shell and chrome CSS, viewport sizing, reading-surface measurement, and browser/device verification in `src/client/`, plus `docs/pwa.md`. No API, provider, storage, deployment, or new dependency is expected. Physical iPhone measurements determine the specific implementation.
