# Jinjeop Line Signage v2.3.2

## Changes
- Fixed the regression where the Seoul Metro train location page could stop sending `POST /traininfo/traininfoUserMap.do` after refresh or page correction.
- The status text now shows the real last successful train-info POST time instead of the injected in-page `alive` timer.
- Added a 5-second POST watchdog that recovers the SMSS webview only when the real train-info POST stream goes stale.
- Reduced the v2.3.1 first-station-save correction so it preserves the line-4 correction without forcing an unnecessary reload when the SMSS page is already active.
- Added `--smoke-test-duration-ms=` for hidden extended smoke validation of the POST stream.

## Release Files

- `Jinjeop.Line.Signage.v2.3.2.exe`
- `Jinjeop.Line.Signage.v2.3.2.exe.blockmap`
- `latest.yml`
