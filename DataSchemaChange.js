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

    /*********************
     * Select Collection *
     *********************/

    console.log('Input the class (collection) name \n\n');
    const collectionName = await getUserInput();
    output.write('\033c'); 
    const collection = DB.collection(collectionName);

    /***********************
     * Select the CSV File *
     ***********************/

    selector.init(fileList, 'Select the file \n\n');
    const fileName = await getSelected(selector);
    output.write('\033c'); ;

    console.log(`Specify the pointer column and its column name, put a single space between them and press ENTER \n\nex) user _User 🚀 \n\nIf you're done. type "EXIT" and press Enter  `);
    const lines = await getUserMultiLineInput(' ') ?? [];
    output.write('\033c'); ;

    console.log(lines.join('\n'), '\n\nReceived 🚀');
    await waitSec(1.5);

    /**
     * @type {Map<string, [string, string]>}
     */
    const pointerChangeMapper = new Map();
    for ( let i = 0; i < lines.length; i++ ) {
        const [ columnName, className ] = lines[i].split(' ');
        pointerChangeMapper.set(columnName, [`_p_${columnName}`, className ]);
    }
    output.write('\033c'); ;

    

    console.log(`Input the date columns and press "Enter(return)"🚀 \n\nIf you're done. type "EXIT" and press Enter`);
    const lines_dateCols = await getUserMultiLineInput() ?? [];
    
    const set_lines_dateCols = new Set(lines_dateCols);
    // output.write('\033c'); ;

    console.log(lines.join('\n'), '\n\nReceived 🚀');
    

    console.log(fileName + ' Received. Starting conversion... 🚀 ');
    await waitSec(1.5);

    /***************************
    * Convert the CSV to JSON *
    ***************************/
    const _CSVToJSON = require('csvtojson')();
    const JSON_ARRAY = await _CSVToJSON.fromFile(`./EXPORTED_DATAS/${fileName}`);

    /*******************************
     * Fixed the object (row) form *
     *******************************/
    for (let i = 0; i < JSON_ARRAY.length; i++ ) {
        const data = JSON_ARRAY[i];
        const keyToDelete = [];
        for (let key in data ) {
            if (data[key] === '') {
                keyToDelete.push(key);
                continue;
            }

            if (set_lines_dateCols.has(key)) {
                data[key] = new Date(data[key]);
            }

            if (key === 'ACL') {
                keyToDelete.push(key);
                data['_acl'] = data[key];
            }

            if (key === 'objectId') {
                keyToDelete.push(key);
                data['_id'] = data[key];
            }

            if (key === 'createdAt') {
                const date = data[key];
                data['_created_at'] = date;
            }

            if (key === 'updatedAt') {
                const date = data[key];
                data['_updated_at'] = date;
            }

            const changeObject = pointerChangeMapper.get(key);
            if (changeObject) {
                const pointerId = data[key];
                const [ changedColName , className ] = changeObject;
                data[changedColName] = `${className}$${pointerId}`;
                keyToDelete.push(key);
            }

            const value = data[key];
            if (typeof value == 'string' &&
                (value.indexOf('{') === 0 || value.indexOf('[') === 0)
            ) { 
                
                try {
                    data[key] = JSON.parse(value); 
                } catch (error) {
                    //
                }
            }
        }



        delete data['createdAt'];
        delete data['updatedAt'];
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
        reader.on('line', (line) => {
            resolve(line);
            // reader.close();
        });
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


