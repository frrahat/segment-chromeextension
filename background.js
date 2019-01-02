var trackedEvents = new Array();

function zeroPad(i) {
	if (i < 10) {
		i = "0" + i
	}
	return i;
}

function updateTrackedEventsForTab(tabId,port) {
	var sendEvents = [];
	
	for(var i=0;i<trackedEvents.length;i++) {
		if (trackedEvents[i].tabId == tabId) {
			sendEvents.push(trackedEvents[i]);
		}
	}
	
	port.postMessage({
		type: 'update',
		events: sendEvents
	});
}

function clearTrackedEventsForTab(tabId,port) {
	var newTrackedEvents = [];
	for(var i=0;i<trackedEvents.length;i++) {
		if (trackedEvents[i].tabId != tabId) {
			newTrackedEvents.push(trackedEvents[i]);
		}
	}
	trackedEvents = newTrackedEvents;
	updateBadge(tabId);
}

chrome.extension.onConnect.addListener((port) => {
	port.onMessage.addListener((msg) => {
		var tabId = msg.tabId;
		if (msg.type == 'update') {
			updateTrackedEventsForTab(tabId,port);
		}
		else if (msg.type == 'clear') {
			clearTrackedEventsForTab(tabId,port);
			updateTrackedEventsForTab(tabId,port);
		}
		else if (msg.type == 'fetch_all_events') {
			port.postMessage({
				type: 'dump',
				events: trackedEvents
			});
		}
	});
});

function updateBadge(tabId) {
	eventCount = 0;
	for(var i=0;i<trackedEvents.length;i++) {
		if (trackedEvents[i].tabId == tabId) {
			eventCount++;
		}
	}
	chrome.browserAction.setBadgeText({text: eventCount.toString(), tabId: tabId});
}

unnecessaryKeys = ["context.traits", "context.userAgent", "context.library", "traits", "integrations", "anonymousId", "timestamp", "type", "writeKey", "userId", "sentAt", "_metadata", "bundled", "unbundled", "messageId"]
function removeUnnecessaryKeys(jsonobject) {
	unnecessaryKeys.forEach(function(key) {
		if(key.includes('.')) {
			parts = key.split('.');
			if(jsonobject.hasOwnProperty(parts[0])) {
				delete jsonobject[parts[0]][parts[1]];
			}
		}
		else if(jsonobject.hasOwnProperty(key)) {
			delete jsonobject[key];
		}
	});
}

chrome.webRequest.onBeforeRequest.addListener(
	(details) => {
		if (details.url.startsWith('https://api.segment.io/v1')) {
			var postedString = decodeURIComponent(String.fromCharCode.apply(null,new Uint8Array(details.requestBody.raw[0].bytes)));
			
			var rawEvent = JSON.parse(postedString);
			// chrome.extension.getBackgroundPage().console.log(rawEvent);
			removeUnnecessaryKeys(rawEvent);
			
			var today = new Date();
			
			var h = zeroPad(today.getHours());
			var m = zeroPad(today.getMinutes());
			var s = zeroPad(today.getSeconds());

			var event = {
				data: rawEvent,
				trackedTime: h + ':' + m + ':' + s,
			};

			chrome.tabs.query({
				active: true,
				currentWindow: true
			}, (tabs) => {
				var tab = tabs[0];
				
				// event.hostName = tab.url;
				event.tabId = tab.id;

				if (details.url == 'https://api.segment.io/v1/t') {
					event.type = 'track';
					
					trackedEvents.unshift(event);
					updateBadge(event.tabId);
				}
				else if (details.url == 'https://api.segment.io/v1/i') {
					event.type = 'identify';
					
					trackedEvents.unshift(event);
					updateBadge(event.tabId);
				}
				else if (details.url == 'https://api.segment.io/v1/p') {
					event.type = 'pageLoad';
					
					trackedEvents.unshift(event);
					updateBadge(event.tabId);
				}
			});
		}
	},
	{
	urls: [
		"https://*/*",
		"http://*/*"
	]},
	['blocking','requestBody']
);