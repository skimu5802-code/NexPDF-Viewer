
# Database Schema

## annotations
- id: TEXT (Primary Key)
- fileId: TEXT (Unique identifier for the PDF file, e.g., hash or name)
- page: INTEGER
- type: TEXT ('highlight', 'note', 'draw')
- x: REAL
- y: REAL
- width: REAL
- height: REAL
- color: TEXT
- text: TEXT
- author: TEXT
- createdAt: DATETIME
