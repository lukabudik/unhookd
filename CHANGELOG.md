# Changelog

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
