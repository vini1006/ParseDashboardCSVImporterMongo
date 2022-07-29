## VINIVINIVINVINVINI

- [Getting Started](#getting_started)

## Getting Started <a name = "getting_started"></a>

* For those who uses Parse Server platform
* If you want to copy a database, whole structure. Rather using this, use dumping and restoring. 
* This module is for import CSV exported collection file from parse-dashboard to your local mongo db. 
    - Fixing columns.
    (objectId -> _id || createdAt -> _created_at || updatedAt -> _updated_at || pointer columns || number || boolean || object || array || ACL -> _acl )

1. Run your local parse-server
2. Create .env file with Parse-Server's app-id, masterkey, JAVASCRIPT_KEY
3. Place your collection's csv file into directory: "EXPORTED_DATAS" that you exported from parse-dashboard.
4. Run command "npm start". 
5. Select DB
6. Type collection name (or type nothing it uses file name as collection name with out extension);


