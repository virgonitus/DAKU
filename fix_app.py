import os

file_path = r'd:\Aplikasi\APP\DAKU\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Removing lines 564 to 606 (1-based)
# Indices: 563 to 605
# Python slice to remove: [563:606]
# Verification:
# lines[563] is the line that starts with /*
# lines[605] is the line that ends with ); */
# lines[606] is the line }

print(f"Deleting lines: {lines[563].strip()} ... {lines[605].strip()}")

del lines[563:606]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done.")
