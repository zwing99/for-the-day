# Spec Delta

## MODIFIED Requirements

### Requirement: Transitions preserve reading state and accessibility
Transition previews SHALL NOT write the destination's saved progress, steal focus, or report a Scripture display. Inactive panels SHALL be excluded from the accessibility tree and keyboard order. Independent passage positions, outgoing flush, URL push/replace policy, stale-response rejection, native selection, zoom, and menu focus SHALL remain intact. Neighbor loading SHALL use a passage-labeled placeholder without fabricated Scripture; failures SHALL provide safe recovery. Reduced motion SHALL avoid animated sliding and spring-back while preserving navigation. Navigation persistence SHALL remain preferences and references only; separate permitted chapter persistence SHALL follow browser-chapter-cache without changing navigation or activation semantics.

#### Scenario: Unloaded adjacent passage
- **WHEN** a swipe reveals a destination whose content is not ready
- **THEN** a labeled loading panel appears and safe recovery remains available if loading fails

#### Scenario: Reduced motion
- **WHEN** reduced motion is enabled
- **THEN** passage navigation completes without sliding animation and reading state remains correct
