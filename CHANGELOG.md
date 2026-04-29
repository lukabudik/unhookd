# Changelog

## [1.3.0](https://github.com/lukabudik/unhookd/compare/v1.2.0...v1.3.0) (2026-04-28)


### Features

* **guidance:** community-aligned taper improvements ([#23](https://github.com/lukabudik/unhookd/issues/23)) ([afc5c71](https://github.com/lukabudik/unhookd/commit/afc5c717b3353b5ded04d52c93b9927e5c55ad38))
* **seo:** add OG preview image and metadata for social sharing ([#21](https://github.com/lukabudik/unhookd/issues/21)) ([d93885a](https://github.com/lukabudik/unhookd/commit/d93885abe11c56aa8188ea3377c286cc0e7fe9e9))


### Bug Fixes

* **install:** replace lightbulb emoji with Info icon ([#24](https://github.com/lukabudik/unhookd/issues/24)) ([a68f6dc](https://github.com/lukabudik/unhookd/commit/a68f6dc290e0ea821b8e163d53a1180f4dc84bb1))

## [1.2.0](https://github.com/lukabudik/unhookd/compare/v1.1.0...v1.2.0) (2026-04-28)


### Features

* **settings:** add Tally feedback link to Settings and README ([#19](https://github.com/lukabudik/unhookd/issues/19)) ([966c473](https://github.com/lukabudik/unhookd/commit/966c473608b462ca1a3c00cb12e4724b40f3beb8))

## [1.1.0](https://github.com/lukabudik/unhookd/compare/v1.0.0...v1.1.0) (2026-04-28)


### Features

* **brand:** add Unhookd logo and regenerate all PWA icons ([#14](https://github.com/lukabudik/unhookd/issues/14)) ([aa4d021](https://github.com/lukabudik/unhookd/commit/aa4d021c0a2e72bf104c7689e8a6e51b566abe9e))
* **brand:** replace logo with Recraft broken chain mark ([#15](https://github.com/lukabudik/unhookd/issues/15)) ([bd2f207](https://github.com/lukabudik/unhookd/commit/bd2f20762cff398e8e0e879e59ab4c2d80b753c0))
* **pwa:** add /install page and improve install UX ([#17](https://github.com/lukabudik/unhookd/issues/17)) ([12afd5c](https://github.com/lukabudik/unhookd/commit/12afd5c39e0eb5c032fe8ab0e05ccb54da32483e))
* **ux:** plan wizard, history/insights overhaul, supplement recommendations ([#12](https://github.com/lukabudik/unhookd/issues/12)) ([ceae854](https://github.com/lukabudik/unhookd/commit/ceae85483e88ac9fbc7e6e3ef113dca629b2e5cb))


### Bug Fixes

* address critical and high-priority pre-release gaps ([#13](https://github.com/lukabudik/unhookd/issues/13)) ([124be36](https://github.com/lukabudik/unhookd/commit/124be366cfe118a2166aaafdb85c5a0ad5c6c0ca))
* **brand:** center icon mark within app icon bounds ([#16](https://github.com/lukabudik/unhookd/issues/16)) ([73fed08](https://github.com/lukabudik/unhookd/commit/73fed08e69907d5e597602762aa3903caf64036f))
* **data:** fix duplicate intakes, missing deletes, multiple hook instances ([2e9915c](https://github.com/lukabudik/unhookd/commit/2e9915cad580467d9c64f9a4cefbb707f974b324))

## 1.0.0 (2026-04-27)


### Features

* FCM push notifications with Cloud Function scheduler ([#9](https://github.com/lukabudik/unhookd/issues/9)) ([3f8783a](https://github.com/lukabudik/unhookd/commit/3f8783a71403a723d7c003adcb3616f45b3fa2e2))
* read app version from package.json in Settings ([ffc1ffd](https://github.com/lukabudik/unhookd/commit/ffc1ffd71c5cb35c53ba66c3ab77daf8c2f65776))
* recovery code data persistence + smart notifications ([#7](https://github.com/lukabudik/unhookd/issues/7)) ([11b2669](https://github.com/lukabudik/unhookd/commit/11b2669d21e172861778bb5a1b249684ab859efc))


### Bug Fixes

* add !('Notification' in window) guard before every unguarded access. ([a7a71de](https://github.com/lukabudik/unhookd/commit/a7a71de890a519f5c0742a7b6676222b981b6441))
* break circular import between Providers and useFCMToken ([64069e9](https://github.com/lukabudik/unhookd/commit/64069e918dceba015db0bd6a939346987507f6be))
* guard all Notification API accesses — crashes iOS Safari browser ([a7a71de](https://github.com/lukabudik/unhookd/commit/a7a71de890a519f5c0742a7b6676222b981b6441))
* notification bugs, plan days mode and cold turkey ([#8](https://github.com/lukabudik/unhookd/issues/8)) ([386a74d](https://github.com/lukabudik/unhookd/commit/386a74d66fcd2cb24c05dddccd6173b2b1d849f5))
* resolve all CI lint errors ([55d3809](https://github.com/lukabudik/unhookd/commit/55d3809b2b04d7e05e9205d6e58e079ebd13478f))
* resolve CI lint errors in useNotifications hook ([d7d080c](https://github.com/lukabudik/unhookd/commit/d7d080c661942009682c637bd2d8704201142799))
* SW conflict, auth race, and intake overwrite bugs ([#10](https://github.com/lukabudik/unhookd/issues/10)) ([c0b03f6](https://github.com/lukabudik/unhookd/commit/c0b03f6fb40407921b944ba5e4de68b5956e4729))
* **sw:** remove importScripts — breaks Safari iOS service worker install ([a2ee5a1](https://github.com/lukabudik/unhookd/commit/a2ee5a14bd14225c5d765485192dcfbdc5a9b460))
* **sw:** stop intercepting navigate requests — fixes Safari iOS page load ([7820dd1](https://github.com/lukabudik/unhookd/commit/7820dd1c08c9b22e38e4d6cdc237ea337f69c12c))
