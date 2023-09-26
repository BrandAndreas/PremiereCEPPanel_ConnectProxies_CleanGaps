
$.runScript = {

	connectProxies: function() {
		/*

		Durchsucht alle Ordner, die in 'folderToConnect' angegeben sind und verbindet dort alle Videodateien mit ihren Proxies.
		Die Proxies sollten alle bei den Originaldateien in einem 'Proxies'-Ordner liegen.
		Neue Namensendungen und spezielle Erweiterungen können angegeben werden.


		*/

		// Variablen die angepasst werden können, bzw. müssen
		// var ending = 'mov';
		// var nameExtension = '_1';
		// var proxieFolder = 'Proxies';



		$._PPP_={
		updateEventPanel : function (message) { // Gibt unten rechts in Premiere eine Meldung. Bei info ist es grün, warning und error sehen anders aus
				app.setSDKEventMessage(message, 'warning');
				/*app.setSDKEventMessage('Here is some information.', 'info');
				app.setSDKEventMessage('Here is a warning.', 'warning');
				app.setSDKEventMessage('Here is an error.', 'error');  // Very annoying; use sparingly.*/
			}
		}


		function connectAllFilesWithProxies() {

			// var h1 = document.querySelector("h1");
			// h1.textContent = "Ein neuer Text";

			var selectedItems = app.getCurrentProjectViewSelection();


				function checkFileExists(filename) {
				var checkFile = new File(filename);
				return checkFile.exists;
				}


				function connectProxiePath(item) {
					function getProxiePath(item) {
						var origPath = item.getMediaPath();
						var lastBackslash = origPath.lastIndexOf('\\');
						var proxieFileName = origPath.slice(lastBackslash);
						var newFileName = proxieFileName.slice(0, -4) + nameExtension +  '.' + ending;
						return origPath.slice(0, lastBackslash + 1) + proxieFolder + newFileName;
					}

					if(!item.hasProxy() && checkFileExists(getProxiePath(item))) {
					if(!(item.attachProxy(getProxiePath(item), 0))){ // Prüfen ob eine Verbindung mit dem Proxie hergestellt werden konnte
						$._PPP_.updateEventPanel('Verbindungsfehler: Die Proxiedatei ' + item.name + ' konnte nicht verbunden werden');
					}
					} else if(!(checkFileExists(getProxiePath(item)))) { // Prüfen ob die Proxiedatei existiert
					$._PPP_.updateEventPanel('Datei fehlt: Die Proxiedatei ' + item.name + ' konnte nicht gefunden werden');
					}
				}
				
				if(selectedItems){
				for(var i=0; i<selectedItems.length; i++) {
					var currentItem = selectedItems[i];
					if(currentItem.type === 1) {
					connectProxiePath(currentItem);
					} else if(currentItem.type === 2) {
					var currentItems = currentItem.children;
					for(var j=0; j<currentItems.numItems; j++) {
						if(currentItems[j].type === 1) {
						connectProxiePath(currentItems[j]);
						}
					}
					}   
				}
				} else {
				$._PPP_.updateEventPanel('Es wurde keine Datei und kein Ordner ausgewählt.');
				}
				
			}
			
			connectAllFilesWithProxies();
	},

	importFiles: function() {
		/*

		Es wird zuerst eine Sequenz mit dem Projektnamen erstellt und in einen neuen Sequenzordner verschoben.
		Die Dateien aus den drei Ordnern werden genommen und jeweils untereinander in diese Sequenz eingefügt.


		*/


		// Die Namen der Ordner können angepasst werden. Sie dürfen aber nur einmal im Projekt vorkommen.
		var track1FolderName = 'Richtmikro';
		var track2FolderName = 'Funke';
		var track3FolderName = 'Front';

		var gapInSecs = 6; // Die Lücke zwischen den einzelnen Blöcken in Sekunden

		// Die Hauptvariablen des Projektes. Nicht verändern!
		var project = app.project;
		var root = project.rootItem;



		function insertAllClips () {
			
			// Funktionen:

			function secsAsTicks(seconds) { // Gibt die Sekunden als Ticks als Number zurück
				return (seconds * 254016000000);
			}

			function findBinByName(nameToFind) { // Findet einen Ordner nach seinem Namen
				var deepSearchBin = function(inFolder) {
					if (inFolder && inFolder.name === nameToFind && inFolder.type === 2) {
					return inFolder;
					} else {
					for (var i = 0; i < inFolder.children.numItems; i++) {
						if (inFolder.children[i] && inFolder.children[i].type === 2) {
						var foundBin = deepSearchBin(inFolder.children[i]);
						if (foundBin) return foundBin;
						}
					}
					}
					return undefined;
				};
				return deepSearchBin(app.project.rootItem);
			}

			function removeAllClips () { // Löscht alle Clips aus den Video und Audiospuren
				for(var i = 0; i<sequence.videoTracks.numTracks; i++) {
					for(var j=sequence.videoTracks[i].clips.numItems; j>0; j--) {
						sequence.videoTracks[i].clips[j-1].remove(0,0);
					}
				}

				for(var i = 0; i<sequence.audioTracks.numTracks; i++) {
					for(var j=sequence.audioTracks[i].clips.numItems; j>0; j--) {
						sequence.audioTracks[i].clips[j-1].remove(0,0);
					}
				}
			}

			function createMainSequence(item) { // Erzeugt eine neue Sequenz aus dem Item das übergeben wird. Der Name wird vom Projekt übernommen.
				var destinationBin = root.createBin('Sequenzen');
				return project.createNewSequenceFromClips(project.name, item, destinationBin);
			}
			
			


			function getEndOfSequenceTicks() { // Gibt die Ticks der Sequenz als Number zurück
				var ticksOfTracks = [];
				for(var i=0; i<sequence.audioTracks.numTracks; i++) { // Gehe alle Audiospuren durch
					var currentTrack = sequence.audioTracks[i];
					var lastClipOfTrack = currentTrack.clips[currentTrack.clips.numItems - 1];

					if(currentTrack.clips.numItems > 0){ // Prüfen ob überhaupt Clips in der Sequenz sind
						var currentTrackEndTicks = lastClipOfTrack.end;
					}else {
						var currentTrackEndTicks = 0;
					}

					ticksOfTracks.push(currentTrackEndTicks); // Gib die Gesamtticks vom Track an das Array ticksOfTracks zurück
				}

				return Math.max(Number(ticksOfTracks[0].ticks), Number(ticksOfTracks[1].ticks), Number(ticksOfTracks[2].ticks)); // Return der größten Ticks als number
			}

		

			function insertClipGroup(currentItem) { // Fügt einen Block aus den drei Ordnern in die Sequenz ein.
				var timeToInsert = (getEndOfSequenceTicks() + secsAsTicks(gapInSecs)).toString();
				sequence.audioTracks[2].overwriteClip(frontFolder.children[currentItem], timeToInsert);
				sequence.audioTracks[0].overwriteClip(richtmikroFolder.children[currentItem], timeToInsert);
				sequence.audioTracks[1].overwriteClip(funkeFolder.children[currentItem], timeToInsert);
			}

			

			


			// Aktionen, die durchgeführt werden
			var frontFolder = findBinByName(track3FolderName);
			var richtmikroFolder = findBinByName(track1FolderName);
			var funkeFolder = findBinByName(track2FolderName);

			function clearInOutPointsOfFolder(folder) {
				function clearInOutPoints(item) {
					item.clearOutPoint();
					item.clearInPoint();
				}
			
				for(var i=0; i<folder.children.numItems; i++)  {
					clearInOutPoints(folder.children[i]);
				}
			}
			
			var allFolders = [frontFolder, richtmikroFolder, funkeFolder];
				for(var k=0; k<allFolders.length; k++) {
					clearInOutPointsOfFolder(allFolders[k]);
				}

			var sequence = createMainSequence(frontFolder.children[0]);
			removeAllClips();

			// Schleife, die die einzelnen Dateien durchgeht. Der Frontfolder wird zum durchzählen genutzt.
			for(var i=0; i<frontFolder.children.numItems; i++){
				insertClipGroup(i);
			}
		}


		insertAllClips();
	},

	cleanClips: function() {
		// Zuerst die Anfänge kürzen:
		// Auslesen welche Spur als erstes beginnt
		// Den Abstand der anderen Spuren zu dieser Zeit erechnen
		// Jeweils die Clips ausschneiden und mit neuer in-Zeit wieder einfügen


		// Die Enden kürzen:
		// Auslesen welcher Clip als erstes endet
		// Das bei reinsert mitgeben für outPoint


		var project = app.project;
		var sequence = project.activeSequence;
		var root = project.rootItem;


		function getLastStartTime (currentItem) { // Gibt die Startzeit des Clips zurück, der als letzter beginnnt. Als Number!
			var allStartTimes = [];
			for(var i=0; i<sequence.audioTracks.numTracks; i++) {
				currentTrack = sequence.audioTracks[i];
				allStartTimes.push(Number(currentTrack.clips[currentItem].start.ticks));
			}
			return Math.max.apply(null, allStartTimes);
		}

		function getFirstEndTime (currentItem) { 
			var allEndTimes = [];
			for(var i=0; i<sequence.audioTracks.numTracks; i++) {
				currentTrack = sequence.audioTracks[i];
				allEndTimes.push(Number(currentTrack.clips[currentItem].end.ticks));
			}
			return Math.min.apply(null, allEndTimes);
		}

		function insertGroup (currentItem) { // reinsert für alle Audiotracks eine Clipgruppe
			var lastStartTime = getLastStartTime (currentItem);
			var firstEndTime = getFirstEndTime (currentItem);

			

			function reInsertClip (currentItem, trackNumber, lastStartTime) { // Setzt einen Audioclip in den entsprechenen Audiotrack an die 'lastStartTime'
				var currentTrack = sequence.audioTracks[trackNumber];
				var currentClip = currentTrack.clips[currentItem];
				var inPoint = (lastStartTime - Number(currentClip.start.ticks)).toString();
				var outPoint = (Number(currentClip.duration.ticks) - (Number(currentClip.end.ticks) - firstEndTime)).toString(); // Dauer des Clips - (Endzeit des Clips - Endzeit des erstenden clips)
				var projItem = currentClip.projectItem;

				currentClip.remove(0,0);

				if(trackNumber == 2) {
					projItem.setOutPoint(outPoint, 4);
					projItem.setInPoint(inPoint, 4);

				}else{
					projItem.setOutPoint(outPoint, 2);
					projItem.setInPoint(inPoint, 2);
				}
				
				if(currentItem > 0){
					currentTrack.overwriteClip(projItem, currentTrack.clips[currentItem-1].end);
				}else {
					currentTrack.overwriteClip(projItem, 0);
				}
			}

			for(var i=0; i<sequence.audioTracks.numTracks; i++) {
				reInsertClip(currentItem, i, lastStartTime);
			}

		}

		function removeAllVideoClips () {
			for(var i = 0; i<sequence.videoTracks.numTracks; i++) {
				for(var j=sequence.videoTracks[i].clips.numItems; j>0; j--) {
					sequence.videoTracks[i].clips[j-1].remove(0,0);
				}
			}
		}


		removeAllVideoClips();
		for(var k=0; k<sequence.audioTracks[0].clips.numItems; k++) {
			insertGroup(k);
		}

	},

	alert: function() {
	//--------------------------------------------------------------------------------------------------------------------------------------------------
		
		alert('Hello World');
	//--------------------------------------------------------------------------------------------------------------------------------------------------
	}
}