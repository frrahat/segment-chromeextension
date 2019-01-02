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

function get_table_name(event_text) {
    var table_name = '';
    for(var i=0; i<event_text.length; i++) {
        var c = event_text[i];
        if (c == ' ' || c == ':' || c == '/' || c == '>') {
            if (i > 0 && table_name[table_name.length - 1] != '_') {
				table_name += '_';
			}
		}
        else if (c == c.toUpperCase()) {
            if (i > 0 && table_name[table_name.length - 1] != '_' && event_text[i-1] == event_text[i-1].toLowerCase()) {
				table_name += '_';
			}
			table_name += c.toLowerCase();
		}
        else table_name += c.toLowerCase();
	}
    
	return table_name;
}
	
function getSQLskeleton(jsonObject,level) {
	var skeleton = {
		'eventName': jsonObject.event,
		'properties': jsonObject.properties,
		'context_props': jsonObject.context.page
	}
	return skeleton;
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) { 
			return typeof args[number] != 'undefined' ? args[number]: match;
	  	});
	};
}


var trackingProperties = {
	"Navigate": ["To State Name"],
}

function getSQLfromSkeleton(sqlSkeleton) {
	var eventName = sqlSkeleton.eventName;
	var tableName = get_table_name(eventName);
	var properties = sqlSkeleton.properties;
	var context_props = sqlSkeleton.context_props;

	var conditions = {};

	if(trackingProperties.hasOwnProperty(eventName)) {
		var allowed_prop_keys = trackingProperties[eventName];
		allowed_prop_keys.forEach(key => {
			if(properties.hasOwnProperty(key)) {
				conditions[key] = properties[key];
			}
		});
	}
	//TODO add context_page_paths or others in the conditions, inclue respective split_part ed colum and then generate string
	var conditionString = "foo=0"
	var sql = 'Select received_at, context_traits_organization_sso_id as ssoid, context_traits_email, event_text from {0} where {1}'.format(tableName, conditionString);
	return sql;
}

function getGeneratedSQL(events) {
	SQLs = [];
	for (var i=0;i<events.length;i++) {
		var event = events[i];
		if(event.type !== 'track')
			continue
		
		SQLs.push(getSQLskeleton(event.data));
	}
	// removeDuplicates(SQLs);
	sql = ''
	for(var i=0; i<SQLs.length; i++) {
		var sqlSkeleton = SQLs[i];
		if(i!=0) sql += '\nUNION ALL\n ';
		sql += getSQLfromSkeleton(sqlSkeleton);
	}
	return sql;
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
					eventString += '<div class="eventInfo" number="' + i + '"><span class="eventName">' + event.trackedTime + ' - ' +event.eventName + '</span></div>';
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
		events = JSON.stringify(msg.events.filter(event => event.type === 'track'));
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
	var clearButton = document.getElementById('clearButton');
	clearButton.onclick = clearTabLog;
});