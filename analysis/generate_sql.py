import json
import csv
import os
import datetime
import argparse

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

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--product-area', '-p', required=True)
    args = parser.parse_args()

    dir_path = os.path.dirname(os.path.realpath(__file__))
    data_dir = os.path.join(dir_path, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    src_data_file_path = os.path.join(dir_path, 'data_for_sql.csv')
    src_data_reader = csv.reader(open(src_data_file_path, 'rb'), delimiter=',', quotechar='"')

    time_str = datetime.datetime.now().strftime('%Y-%m-%d,%H-%M-%S.%f')
    sql_file = open(os.path.join(data_dir, 'sql-' + args.product_area + '-' + time_str + '.sql'), 'w')
    
    cols_or_keys = None
    for row in src_data_reader:
        if not cols_or_keys: # first row is header
            cols_or_keys = row
            continue
    
        event = row[cols_or_keys.index('event')]
        table_name = get_table_name(event)
        conditions = []
        for i in range(len(cols_or_keys)):
            key = cols_or_keys[i]
            if key == 'event' or row[i].strip() == '':
                continue
            conditions.append("{col_name} = '{value}'". format(col_name=get_table_name(key), value=row[i]))

        sql = "select\n\
                received_at,\n\
                context_traits_email,\n\
                context_traits_organization_sso_id as ssoid,\n\
                event_text,\n\
                '{product_area}' as product_area\n\
            from {table_name}\n\
            where received_at >= '2017-01-01'\n\
                and {conditions}\n\
            UNION ALL\n".format(
                    product_area=args.product_area.upper(), 
                    table_name=table_name,
                    conditions='\n\tand '.join(conditions)
                ).replace('            ', '')
    
        sql_file.write(sql)
    
    sql_file.close()
