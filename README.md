# custom

## Table of Contents

- [Getting Started](#getting_started)

## Getting Started <a name = "getting_started"></a>

* For those who uses Parse Server platform
* If you want to copy a database, whole structure. Rather using this, use dumping and restoring. 
* This module is for import CSV exported collection file from parse-dashboard to your local mongo db. 
    - Fix column (objectId -> _id || createdAt -> _created_at || updatedAt -> _updated_at || pointer columns)

1. Place your collection's csv file into directory: "EXPORTED_DATAS" that you exported from parse-dashboard.
2. Run command "npm start". 
3. Select DB
4. Type collection name
5. Input pointer column name and Pointer's actual class name. put single space between them. 
    - ex) 
        - user _User *press Enter
        - book Book *press Enter
        - EXIT *press Enter



