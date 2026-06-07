let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	openExternalUrl: (url) => electron.ipcRenderer.invoke("open-external-url", url),
	openFolderDialog: () => electron.ipcRenderer.invoke("open-folder-dialog"),
	saveEnvFile: (content) => electron.ipcRenderer.invoke("save-env-file", content),
	saveLocalConfig: (config) => electron.ipcRenderer.invoke("save-local-config", config),
	loadLocalConfig: () => electron.ipcRenderer.invoke("load-local-config")
});
//#endregion
