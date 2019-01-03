import json
import csv
import os
import datetime
import shutil
import argparse

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
    parser = argparse.ArgumentParser()
    parser.add_argument('--product-area', '-p', required=True)
    args = parser.parse_args()

    dir_path = os.path.dirname(os.path.realpath(__file__))
    data_dir = os.path.join(dir_path, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    event_file_path = os.path.join(dir_path, 'event_list.json')
    all_events = json.loads(open(event_file_path, 'r').read())

    time_str = datetime.datetime.now().strftime('%Y-%m-%d,%H-%M-%S.%f')
    event_copy_file_path = os.path.join(data_dir, 'event_list-' + args.product_area + '-' + time_str + '.json')
    shutil.copy(event_file_path, event_copy_file_path)
    shutil.copystat(event_file_path, event_copy_file_path)

    data_file = open(os.path.join(data_dir, 'data-' + args.product_area + '-' + time_str + '.csv'), 'w')
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