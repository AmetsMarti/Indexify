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
		let indexFilePath = "index.md";
		if (folder.path !== mainFolder.path) {
			indexFilePath = `${folder.path}/index.md`;
		}
		

		const existingIndex = this.app.vault.getFileByPath(indexFilePath);
		const indexHeader = "# Index: " + folder.name;

		if (existingIndex instanceof TFile == false) {
			await this.app.vault.create(indexFilePath, indexHeader);
		}

		var indexFile = await this.app.vault.getFileByPath(indexFilePath);
		var childIndex = [];
		
		for (const child of folder.children) {
			if (child instanceof TFile && indexFile) {
				if(child.name ="index.md"){continue;}
				childIndex.push(child.path);
				
			} else if (child instanceof TFolder) {
				// Add 'await' here to wait for the subfolder's index to be processed
				childIndex.push(child.path);
				const subfolderIndexResult = await this.updateFolderIndex(child, mainFolder);
				childIndex.push(subfolderIndexResult); // Now this will likely be the result you intend (e.g., the path to the subfolder's index file or some other relevant information)
			}
		}
		if(indexFile){
			try{
				const indexContent = this.app.vault.read(indexFile);
				const lines = (await indexContent).split("\n");
				
				for(var index of childIndex){
					let print = true;
					//compare index with all the lines
					for(var line of lines){
						if(line == index){print = false;}
						console.log(index+" is in index")
					}	
					if(print == true){this.app.vault.append(indexFile,"\n["+ index+"]");}

				}	
				console.log("Index file path of " + folder.name + " folder: " + indexFilePath);
			}catch (error) {
					console.error(`Error reading file '${indexFile.path}':`, error);
			}
		}
		else{
			console.log(`File ${indexFilePath} not found`)
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
