# Spec Delta

## MODIFIED Requirements

### Requirement: Quiet persistent orientation
While reading, a subtle passage identifier SHALL remain near the top without overlapping text. A restrained ordered passage indicator SHALL identify the current day's passages, indicate the active passage beyond color alone, and allow direct selection. On constrained-height viewports, redundant brand and indicators MAY be omitted to preserve reading space, with direct passage choices retained in the named menu. When indicators are shown in an installed phone app in portrait, they SHALL sit adjacent to the bottom safe area without an avoidable unused band below the reader shell. Optional progress SHALL describe location without streaks, completion rewards, or engagement prompts. Essential controls SHALL remain discoverable through keyboard and screen readers when reading chrome is minimized.

#### Scenario: Orientation
- **WHEN** Psalm 86 is active
- **THEN** the passage identifier and active indicator orient the reader without taking precedence over Scripture

#### Scenario: Installed phone bottom controls
- **WHEN** the reader is launched from the Home Screen in portrait on a phone with bottom passage indicators shown
- **THEN** the indicators and their touch targets remain above the home-indicator safe area, and the app fills the available window without an avoidable blank strip below its shell

### Requirement: Accessible mobile and desktop behavior
The reader SHALL use semantic content and controls, meaningful accessible names, visible focus, contrast meeting WCAG AA for text, and touch targets of at least 44 CSS pixels for primary interactive controls. It SHALL honor reduced motion, text zoom, pinch zoom, iPhone/iPad safe areas, dynamic browser viewports, portrait/landscape and Split View changes, and desktop input. In an installed phone app in portrait, the header label and controls SHALL remain legible and unobscured by status-bar or sensor-housing regions in both light and dark appearance. Settings SHALL manage focus on open/close and support keyboard dismissal. Screen readers SHALL encounter Scripture in literary order without repeated forced announcements while scrolling. Context SHALL remain legible despite its subtle visual treatment.

#### Scenario: Mobile Safari viewport changes
- **WHEN** browser chrome expands or the phone rotates
- **THEN** safe-area controls and all Scripture remain accessible and logical location is retained

#### Scenario: Installed phone status area
- **WHEN** the reader opens in portrait standalone mode on a phone with a Dynamic Island
- **THEN** the header label and menu control remain clear of the status area and visibly readable against the app's canvas

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested
- **THEN** programmatic navigation avoids animated movement and decorative loading animation is suppressed

#### Scenario: Settings focus
- **WHEN** settings opens and is then dismissed by keyboard
- **THEN** focus is managed within the settings interaction and returns to its invoking control
