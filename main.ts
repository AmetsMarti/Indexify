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
	indexes = false;


	async onload() {
		await this.loadSettings();
		console.log('loading indexify plugin...');
		this.updateIndexes(this.app.vault);

		this.addRibbonIcon('dice', 'Toggle Indexing', (evt: MouseEvent) => {
			
			if(this.indexes == false){
				this.updateIndexes(this.app.vault);
				new Notice('Indexes enabled');
				this.indexes = true
			}
			else{
				new Notice('Indexes disabled');
				this.deleteIndexes(this.app.vault.getRoot());
				this.indexes = false
			}
				
		});
		

		
	}

	onunload() {
		console.log('unloading indexify plugin...');
		console.log('deleting all files...');
		this.deleteIndexes(this.app.vault.getRoot());

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
		//this.printFolderTree(vault,mainFolder);
		if(mainFolder != null){
			this.updateFolderIndex(mainFolder, mainFolder);

		}
	}

	async printFolderTree(vault: Vault, mainFolder: TFolder) {
		console.log("starting from: " + mainFolder.name);
		await this.drawFolderTree(vault, mainFolder);
	}

	async drawFolderTree(vault: Vault, mainFolder: TFolder, indentLevel: number = 0) {
		const indent = "  ".repeat(indentLevel);
		console.log(`${indent}- ${mainFolder.name}`);
	
		for (const child of mainFolder.children) {
			if (child instanceof TFolder) {
				await this.drawFolderTree(vault, child, indentLevel + 1);
			}
		}
	}
	
	
	async updateFolderIndex(folder: TFolder, mainFolder: TFolder) : Promise<any[]>{
		let indexFilePath = folder.name + "_index.md";
		if (folder.path !== mainFolder.path) {
			indexFilePath = `${folder.path}/${folder.name}_index.md`;
		}
		

		const existingIndex = this.app.vault.getFileByPath(indexFilePath);
		const indexHeader = "";

		if (existingIndex instanceof TFile == false) {
			await this.app.vault.create(indexFilePath, indexHeader);
		}

		var indexFile = await this.app.vault.getFileByPath(indexFilePath);
		var childIndex = [];
		var childFolderIndex = [];
		
		for (const child of folder.children) {
			if (child instanceof TFile && indexFile) {
				if(child.name =="index.md" || child.name ==folder.name+"_index.md" ){continue;}
				childIndex.push(child.name);
				console.log(child.name);
			} else if (child instanceof TFolder) {
				childFolderIndex.push(child.name);
				await this.updateFolderIndex(child, mainFolder);
			}
		}
		
		if(indexFile){
			try{
				await this.app.vault.append(indexFile,"\n");
				await addIndexToFile(indexFile,childIndex,childFolderIndex, this.app.vault);
				console.log("Index file path of " + folder.name + " folder: " + indexFilePath);
			}catch (error) {
					console.error(`Error reading file '${indexFile.path}':`, error);
			}
		}
		else{
			console.log(`File ${indexFilePath} not found`)
		}
	}


	async deleteIndexes(mainFolder:TFolder){
		for(var file of this.app.vault.getFiles()){
			if(file.name.includes("_index.md")){
				this.app.vault.delete(file);
			}
		}
	}
}

async function addIndexToFile(indexFile: TFile, childIndex:any[],childFolderIndex:any[], vault: Vault){
	const indexContent = await vault.read(indexFile);
	const existingLinks = indexContent.split("\n");
	
	for(var index of childIndex){
		const link = "[["+ index+"]]";
		if (!existingLinks.includes(link)) {
			await vault.append(indexFile, link + "\n");
		}
	}	
	for(var index of childFolderIndex){
		const folderLink = "![["+ index+"_index.md]]";
		if (!existingLinks.includes(folderLink)) {
			await vault.append(indexFile, folderLink + "\n");
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
