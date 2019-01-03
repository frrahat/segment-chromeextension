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

function clearAllLogs() {
	chrome.tabs.query({ active: true, currentWindow: true },(tabs) => {
		var currentTab = tabs[0];
		
		port.postMessage({
			type: "clearAll",
			tabId: currentTab.id
		});
	});
}

var port = chrome.extension.connect({
	name: "trackPopup"
});

queryForUpdate();

port.onMessage.addListener((msg) => {
	if (msg.type == "update") {
		
		var prettyEventsString = '';
		
		if (msg.events.length > 0) {
			for (var i=0;i<msg.events.length;i++) {
				var event = msg.events[i];
				
				var eventString = '';
				
				eventString += '<div class="eventTracked eventType_' + event.type + '">';
					eventString += '<div class="eventInfo" number="' + i + '"><span class="eventName">' + event.trackedTime + ' - ' +event.data.event + '</span></div>';
					eventString += '<div class="eventContent" id="eventContent_' + i + '">';
						eventString += printVariable(event.data,0);
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
		events = JSON.stringify(msg.events.filter(event => event.type === 'track').map(event => event.data));
		chrome.tabs.executeScript({
			code: 'console.log(\"'+events+'\")'
		});
		// chrome.extension.getBackgroundPage().console.log(events);
		copyText(events);
	}
});

function evokeEventFetch() {
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
	var copyEventlistButton = document.getElementById('copyEventlistButton');
	copyEventlistButton.onclick = evokeEventFetch;
	var clearAllButton = document.getElementById('clearAllButton');
	clearAllButton.onclick = clearAllLogs;
	var clearButton = document.getElementById('clearButton');
	clearButton.onclick = clearTabLog;
});