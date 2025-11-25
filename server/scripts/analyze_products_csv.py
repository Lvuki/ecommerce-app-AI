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

    # write detailed preview per row to server/tmp/
    try:
        import os, json, time
        tmp_dir = os.path.join(os.path.dirname(__file__), '..', 'tmp')
        os.makedirs(tmp_dir, exist_ok=True)
        ts = int(time.time() * 1000)
        preview_path = os.path.join(tmp_dir, f'products-import-preview-{ts}.json')

        # Rewind file and re-read to build detailed rows (we already consumed reader)
        f.seek(0)
        _ = next(csv.reader(f, delimiter=';', quotechar='"'))
        detailed = []
        for i,row in enumerate(reader):
            # map fields again safely
            row = [c.strip() for c in row]
            row_map = {}
            for j,h in enumerate(headers):
                if j < len(row):
                    row_map[h] = row[j]
                else:
                    row_map[h] = ''

            name = row_map.get(name_col, '').strip()
            price_raw = row_map.get(price_col, '').strip()
            sku = row_map.get(sku_col, '').strip() if sku_col else ''
            category = row_map.get(category_col, '').strip() if category_col else ''
            image = row_map.get(detailed_image_col, '').strip() if detailed_image_col else ''
            desc = row_map.get(description_col, '').strip() if description_col else ''
            feat = row_map.get(features_col, '').strip() if features_col else ''

            issues = []
            if not name:
                issues.append('missing_name')
            if not price_raw or not is_float(price_raw.replace(',','')):
                issues.append('missing_or_invalid_price')
            if not category:
                issues.append('missing_category')
            if not image:
                issues.append('missing_image')
            if not desc:
                issues.append('missing_description')
            if not feat:
                issues.append('missing_features')

            detailed.append({
                'row': i+1,
                'sku': sku,
                'name': name,
                'price_raw': price_raw,
                'category': category,
                'image': image,
                'has_description': bool(desc),
                'has_features': bool(feat),
                'issues': issues,
            })

        with open(preview_path, 'w', encoding='utf-8') as pf:
            json.dump({'summary': summary, 'rows': detailed}, pf, ensure_ascii=False, indent=2)
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        print('\nPreview written to', preview_path)
    except Exception as e:
        import json
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        print('Could not write preview file:', e)

if __name__ == '__main__':
    main()
