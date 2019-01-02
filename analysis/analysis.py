import json
import csv
import os

def get_table_name(event_text):
    table_name = ''
    for i in range(len(event_text)):
        c = event_text[i]
        if c in (' ', ':', '/', '>'):
            if i > 0 and table_name[-1] != '_':
                table_name += '_'
        elif c.isupper():
            if i > 0 and table_name[-1] != '_' and event_text[i-1].islower():
                table_name += '_'
            table_name += c.lower()
        else:
            table_name += c.lower()
    
    return table_name

def get_normalized_dict(dictionary):
    out = dict()
    for key1 in dictionary:
        value1 = dictionary[key1]
        if isinstance(value1, dict):
            for key2 in value1:
                value2 = value1[key2]
                if isinstance(value2, dict):
                    for key3 in value2:
                        value3 = value2[key3]
                        if key1 == 'properties': 
                            out[key2+'_'+key3] = value3
                        else:
                            out[key1+'_'+key2+'_'+key3] = value3
                elif key1 == 'properties': 
                    out[key2] = value2
                else:
                    out[key1+'_'+key2] = value2
        else:
            out[key1] = value1
    
    return out


if __name__ == "__main__":
    dir_path = os.path.dirname(os.path.realpath(__file__))
    all_events = json.loads(open(os.path.join(dir_path, 'event_list.json'), 'r').read())

    data_file = open(os.path.join(dir_path, 'data.csv'), 'w')
    csv_event_writer = csv.writer(data_file)
    
    cols_or_keys = []

    data = []
    for event in all_events:
        event = get_normalized_dict(event)
        data_line = []
        for key in event:
            if key not in cols_or_keys:
                cols_or_keys.append(key)
        
        for key in cols_or_keys:
            data_line.append(event.get(key, ''))
        
        data.append(data_line)

    csv_event_writer.writerow(cols_or_keys)
    for line in data:
        csv_event_writer.writerow(line)

    data_file.close()