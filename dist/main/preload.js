/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/main/ipc.ts"
/*!*************************!*\
  !*** ./src/main/ipc.ts ***!
  \*************************/
(__unused_webpack_module, exports) {


// src/main/ipc.ts
// All IPC channel names in one place.
// Import this in both main and renderer to avoid string typos.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IPC = void 0;
exports.IPC = {
    // Audio control
    AUDIO_START: 'audio:start',
    AUDIO_STOP: 'audio:stop',
    AUDIO_STATUS: 'audio:status',
    // Transcript
    TRANSCRIPT_UPDATE: 'transcript:update',
    // Verse lifecycle
    VERSE_DETECTED: 'verse:detected',
    VERSE_APPROVED: 'verse:approved',
    VERSE_REJECTED: 'verse:rejected',
    VERSE_OVERRIDE: 'verse:override',
    VERSE_CLEAR: 'verse:clear',
    // Projector
    PROJECTOR_UPDATE: 'projector:update',
    // Settings
    SETTINGS_GET: 'settings:get',
    SETTINGS_SET: 'settings:set',
    SETTINGS_GET_KEY: 'settings:get-key',
    SETTINGS_SET_KEY: 'settings:set-key',
    SETTINGS_TEST_STT: 'settings:test-stt',
};


/***/ },

/***/ "electron"
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
(module) {

module.exports = require("electron");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!*****************************!*\
  !*** ./src/main/preload.ts ***!
  \*****************************/

// src/main/preload.ts
// Exposes a typed IPC bridge to the renderer process.
// contextIsolation is ON — renderer never touches Node directly.
Object.defineProperty(exports, "__esModule", ({ value: true }));
const electron_1 = __webpack_require__(/*! electron */ "electron");
const ipc_1 = __webpack_require__(/*! ./ipc */ "./src/main/ipc.ts");
electron_1.contextBridge.exposeInMainWorld('biblebeam', {
    // Audio
    startListening: () => electron_1.ipcRenderer.invoke(ipc_1.IPC.AUDIO_START),
    stopListening: () => electron_1.ipcRenderer.invoke(ipc_1.IPC.AUDIO_STOP),
    // Verse actions
    approveVerse: (payload) => electron_1.ipcRenderer.invoke(ipc_1.IPC.VERSE_APPROVED, payload),
    rejectVerse: () => electron_1.ipcRenderer.invoke(ipc_1.IPC.VERSE_REJECTED),
    overrideVerse: (payload) => electron_1.ipcRenderer.invoke(ipc_1.IPC.VERSE_OVERRIDE, payload),
    clearVerse: () => electron_1.ipcRenderer.invoke(ipc_1.IPC.VERSE_CLEAR),
    // Settings
    getKey: (keyName) => electron_1.ipcRenderer.invoke(ipc_1.IPC.SETTINGS_GET_KEY, keyName),
    setKey: (keyName, value) => electron_1.ipcRenderer.invoke(ipc_1.IPC.SETTINGS_SET_KEY, keyName, value),
    getSettings: () => electron_1.ipcRenderer.invoke(ipc_1.IPC.SETTINGS_GET),
    saveSettings: (s) => electron_1.ipcRenderer.invoke(ipc_1.IPC.SETTINGS_SET, s),
    // Event listeners
    onTranscript: (cb) => {
        electron_1.ipcRenderer.on(ipc_1.IPC.TRANSCRIPT_UPDATE, (_e, p) => cb(p));
        return () => electron_1.ipcRenderer.removeAllListeners(ipc_1.IPC.TRANSCRIPT_UPDATE);
    },
    onVerseDetected: (cb) => {
        electron_1.ipcRenderer.on(ipc_1.IPC.VERSE_DETECTED, (_e, p) => cb(p));
        return () => electron_1.ipcRenderer.removeAllListeners(ipc_1.IPC.VERSE_DETECTED);
    },
    onProjectorUpdate: (cb) => {
        electron_1.ipcRenderer.on(ipc_1.IPC.PROJECTOR_UPDATE, (_e, p) => cb(p));
        return () => electron_1.ipcRenderer.removeAllListeners(ipc_1.IPC.PROJECTOR_UPDATE);
    },
});

})();

/******/ })()
;
//# sourceMappingURL=preload.js.map