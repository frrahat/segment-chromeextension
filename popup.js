function showEvent(number) {
	document.getElementById('eventContent_' + number).style.display = 'block';
}
function printVariable(jsonObject,level) {
	var returnString = '';
	for (var key in jsonObject) {
		if (jsonObject.hasOwnProperty(key)) {
			returnString += '<div style="padding-left: ' + (level * 10) + 'px;">';
			returnString += '<span class="key">';
			returnString += key;
			returnString += '</span>';
			
			if (typeof jsonObject[key] == 'object') {
				returnString += ' {' + printVariable(jsonObject[key],level + 1) + '}';
			}
			else {
				var type = 'number';
				if (isNaN(jsonObject[key])) {
					type = 'string';
				}
				
				returnString += ': ';
				returnString += '<span class="' + type + '">';
				returnString += jsonObject[key];
				returnString += '</span>';
			}
			returnString += '</div>';
		}
	}
	return returnString;
}
function queryForUpdate() {
	chrome.tabs.query({ active: true, currentWindow: true },(tabs) => {
		var currentTab = tabs[0];
		
		port.postMessage({
			type: "update",
			tabId: currentTab.id
		});
	});
}

function clearTabLog() {
	chrome.tabs.query({ active: true, currentWindow: true },(tabs) => {
		var currentTab = tabs[0];
		
		port.postMessage({
			type: "clear",
			tabId: currentTab.id
		});
	});
}


unnecessaryKeys = ["context.traits", "context.userAgent", "context.library", "traits", "integrations", "anonymousId", "timestamp", "type", "writeKey", "userId", "sentAt", "_metadata", "bundled", "unbundled", "messageId"]
function removeUnnecessaryKeys(jsonobject) {
	unnecessaryKeys.forEach(function(key) {
		if(key.includes('.')) {
			parts = key.split('.')
			delete jsonobject[parts[0]][parts[1]]
		}
		else delete jsonobject[key];
	});
	// chrome.extension.getBackgroundPage().console.log(jsonobject);
}

var port = chrome.extension.connect({
	name: "trackPopup"
});

queryForUpdate();

port.onMessage.addListener((msg) => {
	if (msg.type == "update") {
		// chrome.extension.getBackgroundPage().console.log(jsonObject);
		
		var prettyEventsString = '';
		
		if (msg.events.length > 0) {
			for (var i=0;i<msg.events.length;i++) {
				var event = msg.events[i];
				
				var jsonObject = JSON.parse(event.raw);
				removeUnnecessaryKeys(jsonObject);
				var eventString = '';
				
				eventString += '<div class="eventTracked eventType_' + event.type + '">';
					eventString += '<div class="eventInfo" number="' + i + '"><span class="eventName">' + event.trackedTime + ' - ' +event.eventName + '</span></div>';
					eventString += '<div class="eventContent" id="eventContent_' + i + '">';
						eventString += printVariable(jsonObject,0);
					eventString += '</div>';
				eventString += '</div>';
				
				prettyEventsString += eventString;
			}
		}
		else {
			prettyEventsString += 'No events tracked in this tab yet!';
		}
		document.getElementById('trackMessages').innerHTML = prettyEventsString;

		var eventElements = document.getElementsByClassName("eventInfo");
		for (var i=0;i<eventElements.length;i++) {
			eventElements[i].onclick = function() {
				var number = this.getAttribute('number');
				if (document.getElementById('eventContent_' + number).style.display == 'block') {
					document.getElementById('eventContent_' + number).style.display = 'none';
				}
				else {
					document.getElementById('eventContent_' + number).style.display = 'block';
				}
			};
		}
	}

	else if(msg.type == "dump") {
		var data = "foo";
		chrome.tabs.executeScript({
			code: 'console.log(\"'+data+'\")'
		});
		// chrome.extension.getBackgroundPage().console.log(data);
		copyText(data);
	}
});

function generateSQL() {
	chrome.tabs.query({ active: true, currentWindow: true },(tabs) => {
		var currentTab = tabs[0];
		
		port.postMessage({
			type: "fetch_all_events",
			tabId: currentTab.id
		});
	});
}

function copyText(text) {
	var dummy = document.createElement("input");
	document.body.appendChild(dummy);
	dummy.setAttribute('value', text);
	dummy.select();
	document.execCommand("copy");
	document.body.removeChild(dummy);
}

document.addEventListener('DOMContentLoaded', function() {
	var copyGeneratedSQLButton = document.getElementById('copySQLbutton');
	copyGeneratedSQLButton.onclick = generateSQL;
	var clearButton = document.getElementById('clearButton');
	clearButton.onclick = clearTabLog;
});