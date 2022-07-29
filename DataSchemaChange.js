require("dotenv").config();

const Parse = require('parse/node');
const APP_ID = process.env.APP_ID;
const JAVASCRIPT_KEY = process.env.JAVASCRIPT_KEY;
const MASTER_KEY = process.env.MASTER_KEY;

Parse.initialize(APP_ID, JAVASCRIPT_KEY, MASTER_KEY);
Parse.serverURL = "http://localhost:1337/parse";

const fs = require('fs');
const mongo = require('mongodb');

const { Selector } = require('./Selector');
const { MongoClient } = mongo;
let connection;

const input = process.stdin;
input.setRawMode(true);
input.setEncoding('utf8');
input.resume();

const output = process.stdout;
output.write('\033c'); 

const selector = new Selector(input, output);

const reader = require('readline').createInterface({
    input,
    output,
});

reader.on('close', () => {
    reader.close();
    process.exit();
});

/***********************
 * Input the csv file name include extension *
 ***********************/
const exported_folder_name = 'EXPORTED_DATAS';
const converted_folder_name = 'CONVERTED';

( async () => {
    const fileList = await readFileFromDir();
    const dsStoreIndex = fileList.indexOf('.DS_Store');
    if (dsStoreIndex !== -1) fileList.splice(dsStoreIndex, 1);
    if (!fileList?.length) return exitProcess(`NO FILE FOUND IN ${exported_folder_name} 🚀 `);

    connection = await MongoClient.connect('mongodb://127.0.0.1:27017');
    const dbs = await connection.db().admin().listDatabases();
    if (!dbs?.databases?.length) return exitProcess('ERROR NO DB FOUND');

    /*******************
     * Select Database *
     *******************/

    selector.init(dbs.databases.map(obj => obj.name), 'Select Database \n\n');
    const dbName = await getSelected(selector);
    if (!dbName) return exitProcess('NO NAME PASSED');
    const DB = connection.db(dbName);

    /***************************************************
     * Select the CSV File and Extract Collection name *
     ***************************************************/

    selector.init(fileList, 'Select the file \n\n');
    const fileName = await getSelected(selector);

    const collectionName = await ( async () => {
        console.log('If you want to use other name as collection. Type it and Enter \n If not just press enter.')
        const userInput = await getUserInput();
        const trimmed = userInput?.trim();
        if (trimmed) return trimmed;

        const [ _collectionName, __ext ] = fileName.split('.csv')
        return _collectionName;
    })();
    output.write('\033c'); ;
    
    const collection = DB.collection(collectionName);
    await waitSec(1.5);

    /***************************
    * Convert the CSV to JSON *
    ***************************/
    const _CSVToJSON = require('csvtojson')();
    const JSON_ARRAY = await _CSVToJSON.fromFile(`./EXPORTED_DATAS/${fileName}`);

    /*******************************
     * Fix the object (row) form *
     *******************************/
    const transitMap = await getParseColumnTransMap(collectionName);
    for (let i = 0; i < JSON_ARRAY.length; i++ ) {
        const data = JSON_ARRAY[i];
        const keyToDelete = [];
        for (let key in data ) {
            if (data[key] === '') {
                keyToDelete.push(key);
                continue;
            }

            if (key === 'createdAt') {
                keyToDelete.push(key);
                const date = data[key];
                data['_created_at'] = date;
                continue;
            }

            if (key === 'updatedAt') {
                keyToDelete.push(key);
                const date = data[key];
                data['_updated_at'] = date;
                continue;
            }

            if (key === 'objectId') {
                keyToDelete.push(key);
                data['_id'] = data[key];
                continue;
            }

            const [ type, targetClass ] = transitMap.get(key) ?? [];
            switch (type) {
                case 'ACL': {
                    keyToDelete.push(key);
                    data['_acl'] = data[key];
                    break;
                }
                case 'Pointer': {
                    keyToDelete.push(key);
                    data[`_p_${key}`] = `${targetClass}$${data[key]}`;
                    break;
                }
                case 'Date': {
                    data[key] = new Date(data[key]);
                    break;
                }
                case 'Number': {
                    data[key] = parseInt(data[key]);
                    break;
                }
                case 'Object':
                case 'Array':
                case 'Boolean': {
                    data[key] = JSON.parse(data[key]);
                    break;
                }
            }
        }

        for (let key of keyToDelete) {
            delete data[key];
        }
    }
    // output.write('\033c'); ;
    console.log(' :: Convert done :: 🚀');
    console.log('Starting export the JSON File 🚀');
    console.log('Starting Import JSON Array to collection 🚀');
    

    /*******************
     * Insert and Save *
     *******************/
    await Promise.all([
        collection.insertMany(JSON_ARRAY),
        waitSec(1.5),
    ]);

    fs.writeFileSync(`./${converted_folder_name}/${fileName.replace('.csv', '.json')}`, JSON.stringify(JSON_ARRAY, null, 2));

    // output.write('\033c'); ;
    console.log('~~ EXPORT JSON FILE AND IMPORT DONE  ~~ 🚀' + fileName.replace('.csv', '.json') + 'HAS BEEN CREATED');
    exitProcess();
    return;
})();


/** @returns {Promise<string[]>} - CSV FileList */
async function readFileFromDir () {
    return new Promise((resolve, reject) => {
        fs.readdir(`./${exported_folder_name}`, (err, fileList) => {
            if (err) reject(err);
            resolve(fileList);
        });
    });
}

/** @returns {Promise<string>} */
async function getUserInput () {
    return new Promise((resolve, reject) => {
        const lineHandler = (line) => {
            resolve(line);
            reader.removeListener('line', lineHandler);
        }
        reader.on('line', lineHandler);
    });
}

/** 
 * @param {string} searchString - string to check with includes wether to push to arr
 * @returns {Promise<string[]>} 
 */
async function getUserMultiLineInput (searchString) {
    const data = [];
    return new Promise((resolve, reject) => {
        reader.on('line',
        /** @param {string} line */
         (line) => {
            const trim = line.trim();
            if (trim === 'EXIT') return resolve(data);

            if(!searchString) {
                data.push(trim);
            } else if (trim.includes(searchString)) {
                data.push(trim);
            }
        });
    });
}


/**
 * @param {number} second 
 * @returns 
 */
async function waitSec (second = 1) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, second )
    })
}

function exitProcess (message) {
    connection?.close();
    console.log(message)
    process.exit();    
}

async function getSelected (selector) {
    return new Promise((resolve, reject) => {
        const inputHandler = (_, key) => {
            switch(key.name) {
                case 'down': {
                    selector.down();
                    break;
                };
                case 'up': {
                    selector.up();
                    break;
                };
                case 'return': {
                    resolve(selector.select(inputHandler));
                    break;
                };
            }
        };
        input.on('keypress', inputHandler);
    })
}

/**
 * @template {string} columnName
 * @template {string} columnType
 * @template {string} targetClass
 */

/**
 * @param {string} collectionName 
 * @returns {Promise<Map<columnName, [columnType, targetClass]>>}
 */
async function getParseColumnTransMap (collectionName) {  
    const schema = await new Parse.Schema(collectionName).get();
    if (!schema) throw 'You should set schema first, ask VINI';

    const typeMapper = new Map();

    const { fields } = schema;
    for ( let key in fields ) {
        const { type, targetClass } = fields[key];
        typeMapper.set(key, [type, targetClass]);
    }
    return typeMapper;
}


