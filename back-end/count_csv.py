#!/usr/bin/env python
import os

def count_csv_files():
    csv_files = [f for f in os.listdir('compliance_monitoring') if f.endswith('.csv')]
    print(f'Total CSV files: {len(csv_files)}')
    print('\nCompliance Framework CSV files:')
    for i, file in enumerate(csv_files, 1):
        print(f'{i}. {file}')

if __name__ == "__main__":
    count_csv_files()



