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
	vaultExists: () => electron.ipcRenderer.invoke("vault:exists"),
	vaultIsUnlocked: () => electron.ipcRenderer.invoke("vault:is-unlocked"),
	vaultCreate: (password, initialData) => electron.ipcRenderer.invoke("vault:create", password, initialData),
	vaultUnlock: (password) => electron.ipcRenderer.invoke("vault:unlock", password),
	vaultSave: (config) => electron.ipcRenderer.invoke("vault:save", config),
	vaultLock: () => electron.ipcRenderer.invoke("vault:lock"),
	vaultReset: () => electron.ipcRenderer.invoke("vault:reset"),
	vaultChangePassword: (oldPassword, newPassword) => electron.ipcRenderer.invoke("vault:change-password", oldPassword, newPassword),
	vaultDecryptFile: (payload, password) => electron.ipcRenderer.invoke("vault:decrypt-file", payload, password),
	listSshKeys: () => electron.ipcRenderer.invoke("ssh:list-keys"),
	generateSshKey: (customName) => electron.ipcRenderer.invoke("ssh:generate-key", customName),
	createScalewayInstance: (options) => electron.ipcRenderer.invoke("scaleway:create-instance", options),
	cancelScalewayInstance: () => electron.ipcRenderer.invoke("scaleway:cancel"),
	onScalewayLog: (cb) => {
		const handler = (_event, log) => cb(log);
		electron.ipcRenderer.on("scaleway:log", handler);
		return () => {
			electron.ipcRenderer.removeListener("scaleway:log", handler);
		};
	},
	getPlatform: () => electron.ipcRenderer.invoke("deploy:get-platform"),
	writeEnvToDir: (dir, content) => electron.ipcRenderer.invoke("deploy:write-env", dir, content),
	startDeploy: (ipv4, sourceDir, sshPassword, sshKeyPath) => electron.ipcRenderer.invoke("deploy:start", ipv4, sourceDir, sshPassword, sshKeyPath),
	restartDocker: (ipv4, sshPassword, sshKeyPath) => electron.ipcRenderer.invoke("deploy:restart", ipv4, sshPassword, sshKeyPath),
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
	},
	startSupabaseProvision: (req) => electron.ipcRenderer.invoke("provision:supabase:start", req),
	startSpaceshipProvision: (req) => electron.ipcRenderer.invoke("provision:spaceship:start", req),
	startResendProvision: (req) => electron.ipcRenderer.invoke("provision:resend:start", req),
	checkCredentials: (req) => electron.ipcRenderer.invoke("credentials:check", req),
	startSupabaseSiteSetup: (req) => electron.ipcRenderer.invoke("provision:supabase:site-setup", req),
	listSupabaseOrganizations: (accessToken) => electron.ipcRenderer.invoke("provision:supabase:organizations", accessToken),
	listSupabaseProjects: (accessToken) => electron.ipcRenderer.invoke("provision:supabase:projects", accessToken),
	verifySupabaseProject: (accessToken, ref) => electron.ipcRenderer.invoke("provision:supabase:verify-project", accessToken, ref),
	cancelProvision: (service) => electron.ipcRenderer.invoke("provision:cancel", service),
	onProvisionLog: (cb) => {
		const handler = (_event, payload) => cb(payload);
		electron.ipcRenderer.on("provision:log", handler);
		return () => {
			electron.ipcRenderer.removeListener("provision:log", handler);
		};
	},
	onProvisionProgress: (cb) => {
		const handler = (_event, payload) => cb(payload);
		electron.ipcRenderer.on("provision:progress", handler);
		return () => {
			electron.ipcRenderer.removeListener("provision:progress", handler);
		};
	},
	onProvisionDone: (cb) => {
		const handler = (_event, payload) => cb(payload);
		electron.ipcRenderer.on("provision:done", handler);
		return () => {
			electron.ipcRenderer.removeListener("provision:done", handler);
		};
	},
	onProvisionError: (cb) => {
		const handler = (_event, payload) => cb(payload);
		electron.ipcRenderer.on("provision:error", handler);
		return () => {
			electron.ipcRenderer.removeListener("provision:error", handler);
		};
	},
	onProvisionCancelled: (cb) => {
		const handler = (_event, payload) => cb(payload);
		electron.ipcRenderer.on("provision:cancelled", handler);
		return () => {
			electron.ipcRenderer.removeListener("provision:cancelled", handler);
		};
	}
});
//#endregion
