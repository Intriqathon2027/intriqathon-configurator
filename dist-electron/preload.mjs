let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	openExternalUrl: (url) => electron.ipcRenderer.invoke("open-external-url", url),
	openFolderDialog: () => electron.ipcRenderer.invoke("open-folder-dialog"),
	saveEnvFile: (content) => electron.ipcRenderer.invoke("save-env-file", content),
	saveLocalConfig: (config) => electron.ipcRenderer.invoke("save-local-config", config),
	loadLocalConfig: () => electron.ipcRenderer.invoke("load-local-config"),
	exportConfig: (config) => electron.ipcRenderer.invoke("export-config", config),
	importConfig: () => electron.ipcRenderer.invoke("import-config"),
	saveRecentConfigs: (configs) => electron.ipcRenderer.invoke("save-recent-configs", configs),
	loadRecentConfigs: () => electron.ipcRenderer.invoke("load-recent-configs"),
	readConfigFile: (filePath) => electron.ipcRenderer.invoke("read-config-file", filePath),
	getPlatform: () => electron.ipcRenderer.invoke("deploy:get-platform"),
	writeEnvToDir: (dir, content) => electron.ipcRenderer.invoke("deploy:write-env", dir, content),
	startDeploy: (ipv4, sourceDir, sshPassword) => electron.ipcRenderer.invoke("deploy:start", ipv4, sourceDir, sshPassword),
	restartDocker: (ipv4, sshPassword) => electron.ipcRenderer.invoke("deploy:restart", ipv4, sshPassword),
	cancelDeploy: () => electron.ipcRenderer.invoke("deploy:cancel"),
	sendDeployInput: (text) => electron.ipcRenderer.invoke("deploy:send-input", text),
	onDeployStdout: (cb) => {
		const handler = (_event, line) => cb(line);
		electron.ipcRenderer.on("deploy:stdout", handler);
		return () => {
			electron.ipcRenderer.removeListener("deploy:stdout", handler);
		};
	},
	onDeployStderr: (cb) => {
		const handler = (_event, line) => cb(line);
		electron.ipcRenderer.on("deploy:stderr", handler);
		return () => {
			electron.ipcRenderer.removeListener("deploy:stderr", handler);
		};
	},
	onDeployExit: (cb) => {
		const handler = (_event, code) => cb(code);
		electron.ipcRenderer.on("deploy:exit", handler);
		return () => {
			electron.ipcRenderer.removeListener("deploy:exit", handler);
		};
	},
	onDeployError: (cb) => {
		const handler = (_event, error) => cb(error);
		electron.ipcRenderer.on("deploy:error", handler);
		return () => {
			electron.ipcRenderer.removeListener("deploy:error", handler);
		};
	}
});
//#endregion
