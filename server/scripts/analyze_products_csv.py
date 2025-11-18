import csv
import sys
from collections import Counter

CSV_PATH = r"c:\Users\AVI\Projects\shop-app\products.csv"

# utility to match header keys loosely
def find_header(headers, candidates):
    low = [h.lower() for h in headers]
    for c in candidates:
        for i,h in enumerate(low):
            if c.lower() == h:
                return headers[i]
    for c in candidates:
        for i,h in enumerate(low):
            if c.lower() in h:
                return headers[i]
    return None


def is_float(s):
    try:
        float(s)
        return True
    except:
        return False


def main():
    try:
        f = open(CSV_PATH, newline='', encoding='utf-8')
    except Exception as e:
        print('ERROR: cannot open', CSV_PATH, e)
        sys.exit(2)

    reader = csv.reader(f, delimiter=';', quotechar='"')
    try:
        headers = next(reader)
    except StopIteration:
        print('Empty file')
        return

    headers = [h.strip() for h in headers]

    # find important columns
    name_col = find_header(headers, ['Product name','Product Name','name'])
    price_col = find_header(headers, ['Price','price'])
    sku_col = find_header(headers, ['Product code','SKU','sku','product code'])
    category_col = find_header(headers, ['Category','category'])
    detailed_image_col = find_header(headers, ['Detailed image URL','Detailed image','Detailed image URL','Detailed image url'])
    description_col = find_header(headers, ['Description','description'])
    features_col = find_header(headers, ['Features','features'])

    if not name_col or not price_col:
        print('ERROR: required header not found. Detected headers:', headers)
        sys.exit(2)

    total = 0
    ok_count = 0
    missing_name = 0
    missing_price = 0
    missing_category = 0
    missing_image = 0
    missing_description = 0
    missing_features = 0
    sku_counter = Counter()
    sample_bad = []

    for row in reader:
        total += 1
        # ensure row length
        row = [c.strip() for c in row]
        # map
        row_map = {}
        for i,h in enumerate(headers):
            if i < len(row):
                row_map[h] = row[i]
            else:
                row_map[h] = ''

        name = row_map.get(name_col, '').strip()
        price_raw = row_map.get(price_col, '').strip()
        category = row_map.get(category_col, '').strip() if category_col else ''
        image = row_map.get(detailed_image_col, '').strip() if detailed_image_col else ''
        desc = row_map.get(description_col, '').strip() if description_col else ''
        feat = row_map.get(features_col, '').strip() if features_col else ''
        sku = row_map.get(sku_col, '').strip() if sku_col else ''

        if not name:
            missing_name += 1
        if not price_raw or not is_float(price_raw.replace(',','')):
            missing_price += 1
        if not category:
            missing_category += 1
        if not image:
            missing_image += 1
        if not desc:
            missing_description += 1
        if not feat:
            missing_features += 1
        if sku:
            sku_counter[sku] += 1

        if name and price_raw and is_float(price_raw.replace(',','')):
            ok_count += 1
        else:
            if len(sample_bad) < 10:
                sample_bad.append({
                    'row': total,
                    'name': name,
                    'price_raw': price_raw,
                    'sku': sku,
                    'category': category,
                })

    # duplicates
    dup_skus = {k:v for k,v in sku_counter.items() if v>1}

    summary = {
        'total_rows': total,
        'importable_rows_name_and_price': ok_count,
        'missing_name': missing_name,
        'missing_price': missing_price,
        'missing_category': missing_category,
        'missing_image': missing_image,
        'missing_description': missing_description,
        'missing_features': missing_features,
        'unique_skus': len(sku_counter),
        'duplicate_sku_count': sum(v for v in dup_skus.values()),
        'duplicates_sample': list(dup_skus.items())[:10],
        'sample_problem_rows': sample_bad,
    }

    import json
    print(json.dumps(summary, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
