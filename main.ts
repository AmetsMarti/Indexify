import { App,TFolder,TFile, Editor,Vault, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface IndexifySettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: IndexifySettings = {
	mySetting: 'default'
}

export default class Indexify extends Plugin {
	settings: IndexifySettings;

	async onload() {
		await this.loadSettings();
		console.log('loading indexify plugin...');
		this.updateIndexes(this.app.vault);
	}

	onunload() {
		console.log('unloading indexify plugin...');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async updateIndexes(vault: Vault) {
		const mainFolder = vault.getRoot();
		console.log("starting from: " + mainFolder.name);
		for(var folder of vault.getAllFolders()){
			console.log(folder.name);
		}
		if(mainFolder != null){
			this.updateFolderIndex(mainFolder, mainFolder);

		}


	}

	async updateFolderIndex(folder: TFolder, mainFolder: TFolder) {
		let indexFilePath = "/index.md";
		if (folder.path !== mainFolder.path) {
			indexFilePath = `${folder.path}/index.md`;
		}
		console.log("Index file path of " + folder.name + " folder: " + indexFilePath);

		const existingIndex = this.app.vault.getFileByPath(indexFilePath);
		const indexHeader = "# Index: " + folder.name;

		if (!(existingIndex instanceof TFile)) {
			this.app.vault.create(indexFilePath, indexHeader);
		}

		const indexFile = this.app.vault.getFileByPath(indexFilePath);
		var childIndex = [];
		for (const child of folder.children) {
			if (child instanceof TFile && indexFile) {
				childIndex.push(child.path);
				
			} else if (child instanceof TFolder) {
				childIndex.push(this.updateFolderIndex(child, mainFolder));
			}
		}
		
	}
}



class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
