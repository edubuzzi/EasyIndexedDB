/*!
 * EasyIndexedDB v1.0.0
 * An easy, simple, and uncomplicated library to handle data with IndexedDB, the JavaScript NoSQL database.
 *
 * Author: Eduardo Gabriel Buzzi
 * GitHub: https://github.com/edubuzzi
 * Website: https://eduardobuzzi.top
 * 
 * Released under the MIT License.
 * SPDX-License-Identifier: MIT
 * 
 * Copyright (c) 2024 Eduardo Gabriel Buzzi
 */

export default class EasyIndexedDB
{
    #database;
    #databaseName;
    #databaseVersion;
    #tempNewArrayObjData;
    #timezoneLastModifyDate = "America/Sao_Paulo";
    #objectStoreNameLastModifyDate = "__dateLastModifyDatabase";

    /**
     * This asynchronous method initialises the database
     *
     * @param {string} databaseName Database name
     * @param {undefined|number} databaseVersion Database version
     * @returns {string}
     */
    initialize(databaseName, databaseVersion)
    {
        return new Promise((resolve, reject) =>
        {
            if (!indexedDB) { return reject("Browser does not allow use of the IndexedDB to store information"); }
            if (this.#database) { return resolve("Database has already been initialised"); }
            if (typeof databaseName !== "string") { return reject("Database name must be a string"); }
            let request;
            const containValidDatabaseVersion = databaseVersion !== undefined && Number.isInteger(databaseVersion);
            if (containValidDatabaseVersion) { request = indexedDB.open(databaseName, databaseVersion); }
            else { request = indexedDB.open(databaseName); }
            request.onupgradeneeded = (event) =>
            {
                this.#database = event.target.result;
                this.#databaseName = databaseName;
                this.#databaseVersion = this.#database.version;
                this.#setLastModifyDateDatabase();
                resolve("Database updated and initialized successfully");
            }
            request.onerror = (event) => { reject(event.target.error.message); }
            request.onsuccess = (event) =>
            {
                this.#database = event.target.result;
                this.#databaseName = databaseName;
                this.#databaseVersion = this.#database.version;
                resolve("Database created and/or initialized successfully");
            }
        });
    }

    /**
     * This asynchronous method deletes the current database or an existing database by passing the name as a parameter
     *
     * @param {undefined|string} databaseName Database name
     * @returns {string}
     */
    delete(databaseName)
    {
        return new Promise((resolve, reject) =>
        {
            let request;
            if (this.#database) { request = indexedDB.deleteDatabase(this.#databaseName); }
            else
            {
                if (typeof databaseName === "string" && databaseName.length) { request = indexedDB.deleteDatabase(databaseName); }
                else { return reject("Database name is not valid"); }
            }
            request.onerror = (event) => { reject(event.target.error.message); }
            request.onsuccess = () => { resolve("Database deleted successfully"); }
        });
    }

    /**
     * this method changes the name of the Object Store that is used to change the last modified date of the database
     *
     * @param {string} timezone
     */
    setObjectStoreNameLastModifyDate(objectStoreName = this.#objectStoreNameLastModifyDate)
    {
        if (typeof objectStoreName === "string" && objectStoreName.length) { this.#objectStoreNameLastModifyDate = objectStoreName; }
    }

    /**
     * This method changes the client's timezone to store the last modified date of the database in a specific timezone
     *
     * @param {string} timezone
     * @returns {true|false}
     */
    setTimezoneLastModifyDate(timezone)
    {
        try { new Intl.DateTimeFormat(undefined, {timeZone: timezone}); }
        catch (error) { return false; }
        this.#timezoneLastModifyDate = timezone;
        return true;
    }

    /**
     * This asynchronous method create a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {object[]} indexes Array with object(s) • example: [{"name": "age", "unique": false}, {"name": "email", "unique": true}]
     * @param {boolean} setLastModifyDate
     * @returns {string}
     */
    createObjectStore(objectStoreName, indexes = [], setLastModifyDate = true)
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!Array.isArray(indexes)) { return reject("indexes must be a array"); }
            for (const index of indexes)
            {
                if (typeof index.name !== "string") { return reject("All values within indexes must be of string type"); }
                else if (!index.name.replace(/\s+/g, "").length) { return reject("It is not possible to create a index without any character"); }
                if (typeof index.unique !== "boolean") { index.unique = false; }
            }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (this.#database.objectStoreNames.contains(objectStoreName)) { return resolve(`Object Store '${objectStoreName}' already exist in the database`); }
            const newVersion = this.#databaseVersion + 1;
            const request = indexedDB.open(this.#databaseName, newVersion);
            this.#database.close();
            request.onerror = (event) => { reject(event.target.error.message); }
            request.onupgradeneeded = (event) =>
            {
                this.#database = event.target.result;
                this.#databaseVersion = newVersion;

                const objectStore = this.#database.createObjectStore(objectStoreName, { autoIncrement: true });

                for (const index of indexes) { objectStore.createIndex(index.name, index.name, { unique: index.unique }); }
            }
            request.onsuccess = () =>
            {
                if (setLastModifyDate) { this.#setLastModifyDateDatabase(); }
                resolve("Object Store created successfully");
            }
        });
    }

    /**
     * This asynchronous method delete a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @returns {string}
     */
    deleteObjectStore(objectStoreName)
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const newVersion = this.#databaseVersion + 1;
            const request = indexedDB.open(this.#databaseName, newVersion);
            this.#database.close();
            request.onerror = (event) => { reject(event.target.error.message); }
            request.onupgradeneeded = (event) =>
            {
                this.#database = event.target.result;
                this.#databaseVersion = newVersion;
                this.#database.deleteObjectStore(objectStoreName);
            }
            request.onsuccess = () =>
            {
                this.#setLastModifyDateDatabase();
                resolve("Object Store deleted successfully");
            }
        });
    }

    /**
     * This asynchronous method insert data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {object} objIndexesValues Object with index(es) and value(s) • example: {"name": "Eduardo", "age": 23}
     * @returns {string}
     */
    insertDataObjectStore(objectStoreName, objIndexesValues)
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (typeof objIndexesValues !== "object") { return reject("objIndexesValues must be an object that contains the index name and value"); }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            const request = objectStore.add(objIndexesValues);
            request.onerror = (event) => { reject(event.target.error.message); }
            request.onsuccess = () => { resolve("Data were inserted successfully"); }
        });
    }

    /**
     * This asynchronous method insert multiple rows of data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {object[]} arrayObjIndexValue Array with object(s) • example: [{"name": "Eduardo", "age": 23}, {"name": "George", "age": 42}]
     * @returns {string}
     */
    insertMultipleDataObjectStore(objectStoreName, arrayObjIndexValue = [])
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!Array.isArray(arrayObjIndexValue)) { return reject("arrayObjIndexValue must be a array"); }
            if (!arrayObjIndexValue.length) { return reject("arrayObjIndexValue must have objects with data to be inserted") }
            for (const objIndexValue of arrayObjIndexValue) { if (typeof objIndexValue !== "object") { return reject("arrayObjIndexValue must only have a array with object(s)"); } }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            const promises = [];
            for (const objIndexValue of arrayObjIndexValue)
            {
                const request = objectStore.add(objIndexValue);
                const promise = new Promise((innerResolve, innerReject) =>
                {
                    request.onsuccess = () => { innerResolve(); };
                    request.onerror = (event) => { innerReject(event.target.error.message); };
                });
                promises.push(promise);
            }
            Promise.all(promises).then(() => { resolve("All data were inserted successfully"); }).catch((error) => { reject(error); });
            transaction.onerror = () => { reject("Transaction error"); };
        });
    }

    /**
     * This asynchronous method select data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {string} indexName Index name of the index that will be used to search for the record
     * @param value Value to retrieve the record
     * @param {string[]} arraySpecificIndexes Array containing indexes that will be returned
     * @returns {object|null|undefined|string} An object if there is data, null if there is no data, undefined if the value has no occurrences and a string if a error occurred
     */
    selectDataObjectStore(objectStoreName, indexName, value, arraySpecificIndexes = [])
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (typeof indexName !== "string") { return reject("indexName must be a string"); }
            if (!Array.isArray(arraySpecificIndexes)) { return reject("arraySpecificIndexes must be a array"); }
            for (const indexName of arraySpecificIndexes) { if (typeof indexName !== "string") { return reject("All values within arraySpecificIndexes must be of string type"); } }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction(objectStoreName, "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            let index;
            try { index = objectStore.index(indexName); }
            catch (error) { return reject(`The index '${indexName}' passed as a parameter was not found in the Object Store`); }
            const requestKey = index.getKey(value);
            requestKey.onerror = (event) => { reject(event.target.error.message); }
            requestKey.onsuccess = (event) =>
            {
                const key = event.target.result;
                let requestRecord;
                try { requestRecord = objectStore.get(key); }
                catch (error) { return resolve(undefined); }
                requestRecord.onerror = (event) => { reject(event.target.error.message); }
                requestRecord.onsuccess = (event) =>
                {
                    const record = event.target.result;
                    if (!record) { return resolve(null); }
                    if (!arraySpecificIndexes.length) { return resolve(record); }
                    const filterRecord = {};
                    for (const index of arraySpecificIndexes)
                    {
                        if (index in record) { filterRecord[index] = record[index]; }
                    }
                    if (!Object.keys(filterRecord).length) { return resolve(null); }
                    resolve(filterRecord);
                }
            }
        });
    }

    /**
     * This asynchronous method select multiple data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {object[]} arrayObjIndexValue Array that contains object(s) with the 'index' and 'value' properties, as well as optionally having a 'specificIndexes' property that contains string values • example: [{"index": "name", "value": "Eduardo", "specificIndexes": ["age"]}, {"index": "name", "value": "George"}]
     * @returns {(object|null|undefined)[]|string} Array with object(s) if there is data, null if there is no data, undefined if the value has no occurrences or some error occurred but could continue with the execution and a string if a critical error occurred
     */
    selectMultipleDataObjectStore(objectStoreName, arrayObjIndexValue)
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!Array.isArray(arrayObjIndexValue)) { return reject("arrayObjIndexValue must be a array"); }
            if (!arrayObjIndexValue.length) { return reject("arrayObjIndexValue must have object(s)") }
            for (const objIndexValue of arrayObjIndexValue)
            {
                if (typeof objIndexValue !== "object") { return reject("arrayObjIndexValue must only have a array with object(s)"); }
                if (!("index" in objIndexValue)) { return reject("Property 'index' was not found inside of the object(s)"); }
                else if (typeof objIndexValue.index !== "string") { return reject("Property 'index' inside of the object(s) must be of string type"); }
                if (!Array.isArray(objIndexValue.specificIndexes)) { objIndexValue.specificIndexes = []; }
                for (const index of objIndexValue.specificIndexes) { if (typeof index !== "string") { return reject("Within the array of the 'specificIndexes' property, it is only allowed to pass string values"); } }
            }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction(objectStoreName, "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            const promises = [];
            const records = [];
            for (const objIndexValue of arrayObjIndexValue)
            {
                const promise = new Promise((innerResolve, innerReject) =>
                {
                    let index;
                    try { index = objectStore.index(objIndexValue.index); }
                    catch (error) { records.push(undefined); return innerReject(`The index '${objIndexValue.index}' passed as a parameter to an object in the 'index' property was not found in the Object Store`); }
                    const requestKey = index.getKey(objIndexValue.value);
                    requestKey.onerror = (event) => { records.push(undefined); innerReject(event.target.error.message); }
                    requestKey.onsuccess = (event) =>
                    {
                        const key = event.target.result;
                        let requestRecord;
                        try { requestRecord = objectStore.get(key); }
                        catch (error) { records.push(undefined); return innerReject(`The value '${objIndexValue.value}' passed as a parameter in an object in the 'value' property was not found`); }
                        requestRecord.onerror = (event) => { records.push(undefined); innerReject(event.target.error.message); }
                        requestRecord.onsuccess = (event) =>
                        {
                            const record = event.target.result;
                            if (!record) { records.push(null); return innerResolve(); }
                            if (!objIndexValue.specificIndexes.length) { records.push(record); return innerResolve(); }
                            const filterRecord = {};
                            for (const index of objIndexValue.specificIndexes)
                            {
                                if (index in record) { filterRecord[index] = record[index]; }
                            }
                            if (!Object.keys(filterRecord).length) { records.push(null); return innerResolve(); }
                            records.push(filterRecord);
                            innerResolve();
                        }
                    }
                });
                promises.push(promise);
            }
            Promise.all(promises).then(() => { resolve(records); }).catch((error) => { reject(error); });
        });
    }

    /**
     * This asynchronous method select multiple data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {string[]} indexes Array containing indexes that will be used to search for all records
     * @returns {object[]|string} Array with object(s) if there is data, an empty array if no data is found and a string if an error occurs
     */
    selectAllDataObjectStore(objectStoreName, indexes = [])
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!Array.isArray(indexes)) { return reject("indexes must be a array"); }
            for (const index of indexes)
            {
                if (typeof index !== "string") { return reject("All values within indexes must be of string type"); }
            }
            indexes = indexes.filter(index => index.replace(/\s+/g, "") !== "");
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction([objectStoreName], "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            const request = objectStore.getAll();
            request.onerror = (event) => { reject(event.target.error.message); }
            request.onsuccess = (event) =>
            {
                const allRecords = event.target.result;
                let filterRecords = [];
                const filterIndexes = indexes.length > 0;
                if (filterIndexes)
                {
                    for (const record of allRecords)
                    {
                        let filterRecord = {};
                        for (const index of indexes)
                        {
                            if (index in record) { filterRecord[index] = record[index]; }
                        }
                        if (Object.keys(filterRecord).length) { filterRecords.push(filterRecord); }
                    }
                }
                else { filterRecords = allRecords; }
                resolve(filterRecords);
            }
        });
    }

    /**
     * This asynchronous method update the structure of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {object[]} arrayObjIndexesToAdd Array with object(s) • example: [{"name": "age", "unique": false}, {"name": "email", "unique": true}]
     * @param {string[]} arrayIndexesToRemove Array with string(s)
     * @param {object[]} arrayObjChangeIndexesName Array with object(s) • example: [{"oldName": "agee", "newName": "age", "unique": false}, {"oldName": "email_user", "newName": "email", "unique": true}]
     * @returns {string}
     */
    updateStructureObjectStore(objectStoreName, arrayObjIndexesToAdd = [], arrayIndexesToRemove = [], arrayObjChangeIndexesName = [])
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!Array.isArray(arrayObjIndexesToAdd)) { return reject("arrayObjIndexesToAdd must be a array"); }
            for (const objIndexToAdd of arrayObjIndexesToAdd)
            {
                if (typeof objIndexToAdd !== "object") { return reject("arrayObjIndexToAdd must only have a array with object(s)"); }
                if (!("name" in objIndexToAdd)) { return reject("Property 'name' was not found inside of the object(s)"); }
                else if (typeof objIndexToAdd.name !== "string") { return reject("Property 'name' inside of the object(s) must be of string type"); }
                if (typeof objIndexToAdd.unique !== "boolean") { objIndexToAdd.unique = false; }
            }
            if (!Array.isArray(arrayIndexesToRemove)) { return reject("arrayIndexesToRemove must be a array"); }
            for (const indexToRemove of arrayIndexesToRemove) { if (typeof indexToRemove !== "string") { return reject("All values within arrayIndexesToRemove must be of string type"); } }
            if (!Array.isArray(arrayObjChangeIndexesName)) { return reject("arrayObjChangeIndexesName must be a array"); }
            for (const objChangeIndexName of arrayObjChangeIndexesName)
            {
                if (typeof objChangeIndexName !== "object") { return reject("arrayObjChangeIndexesName must only have a array with object(s)"); }
                if (!("oldName" in objChangeIndexName)) { return reject("Property 'oldName' was not found inside of the object(s)"); }
                else if (typeof objChangeIndexName.oldName !== "string") { return reject("Property 'oldName' inside of the object(s) must be of string type"); }
                if (!("newName" in objChangeIndexName)) { return reject("Property 'newName' was not found inside of the object(s)"); }
                else if (typeof objChangeIndexName.newName !== "string") { return reject("Property 'newName' inside of the object(s) must be of string type"); }
                if (typeof objChangeIndexName.unique !== "boolean") { objChangeIndexName.unique = false; }
            }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const newVersion = this.#databaseVersion + 1;
            const request = indexedDB.open(this.#databaseName, newVersion);
            this.#database.close();
            const addIndexObjectStore = (objectStore, indexName, unique) =>
            {
                if (typeof unique !== "boolean") { unique = false; }
                if (objectStore.indexNames.contains(indexName)) { return; }
                objectStore.createIndex(indexName, indexName, { unique: unique });
            }
            const deleteIndexObjectStore = (objectStore, indexName) =>
            {
                if (!objectStore.indexNames.contains(indexName)) { return; }
                objectStore.deleteIndex(indexName);
            }
            request.onerror = (event) => { reject(event.target.error.message); }
            request.onupgradeneeded = (event) =>
            {
                const objectStore = event.currentTarget.transaction.objectStore(objectStoreName);
                this.#database = event.target.result;
                this.#databaseVersion = newVersion;
                for (const objChangeIndexName of arrayObjChangeIndexesName)
                {
                    if (!objectStore.indexNames.contains(objChangeIndexName.oldName)) { return reject(`The index '${objChangeIndexName.oldName}' does not exist`); }
                    if (objectStore.indexNames.contains(objChangeIndexName.newName)) { return reject(`The index '${objChangeIndexName.newName}' already exist`); }
                }
                for (const objIndexToAdd of arrayObjIndexesToAdd) { addIndexObjectStore(objectStore, objIndexToAdd.name, objIndexToAdd.unique); }
                for (const indexToRemove of arrayIndexesToRemove) { deleteIndexObjectStore(objectStore, indexToRemove); }
            }
            request.onsuccess = () =>
            {
                const newVersion = this.#databaseVersion + 1;
                const request = indexedDB.open(this.#databaseName, newVersion);
                let arrayObjData = [];
                this.selectAllDataObjectStore(objectStoreName).then(data =>
                {
                    arrayObjData = data;
                    this.#database.close();
                    request.onerror = (event) => { reject(event.target.error.message); }
                    request.onupgradeneeded = (event) =>
                    {
                        const objectStore = event.currentTarget.transaction.objectStore(objectStoreName);
                        this.#database = event.target.result;
                        this.#databaseVersion = newVersion;
                        const changeIndexObjectStore = (arrayObjChangeIndexesName, arrayObjData) =>
                        {
                            return new Promise((innerResolve, innerReject) =>
                            {
                                for (const objChangeIndexName of arrayObjChangeIndexesName)
                                {
                                    for (const objData of arrayObjData)
                                    {
                                        if (objChangeIndexName.oldName in objData)
                                        {
                                            objData[objChangeIndexName.newName] = objData[objChangeIndexName.oldName];
                                            delete objData[objChangeIndexName.oldName];
                                        }
                                    }
                                    addIndexObjectStore(objectStore, objChangeIndexName.newName, objChangeIndexName.unique);
                                    deleteIndexObjectStore(objectStore, objChangeIndexName.oldName);
                                }
                                innerResolve(arrayObjData);
                            });
                        }
                        changeIndexObjectStore(arrayObjChangeIndexesName, arrayObjData)
                        .then(arrayObjData =>
                        {
                            if (!arrayObjData.length) { return resolve("Object Store updated successfully"); }
                            this.#tempNewArrayObjData = arrayObjData;
                        })
                        .catch(error => { reject(error); });
                    }
                    request.onsuccess = () =>
                    {
                        this.deleteAllDataObjectStore(objectStoreName)
                        .then(() =>
                        {
                            this.insertMultipleDataObjectStore(objectStoreName, this.#tempNewArrayObjData).then(() =>
                            {
                                this.#tempNewArrayObjData = undefined;
                                resolve("Object Store updated successfully");
                            }).catch(error => { reject(error); })
                        })
                        .catch(error => { reject(error); })
                    }
                });
            }
        });
    }

    /**
     * This asynchronous method update data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {string} index Index name of the index that will be the value searched to find the record or index of new value to set
     * @param {string} currentValue Actual value that will be updated
     * @param {string} newValue New value to set
     * @param {boolean} changeValueFromCurrentValue false value, if it is only necessary to use currentValue to find the record and change it with custom indexes in arrayObjIndexValue
     * @param {object[]} arrayObjIndexValue Optional parameter if wants change value from one or more indexes who are different from the searched index and/or also the searched index included • example: [{"index": "age", "value": 23}, {"index": "name", "value": "Eduardo"}]
     * @returns {string}
     */
    updateDataObjectStore(objectStoreName, index, currentValue, newValue, changeValueFromCurrentValue = true, arrayObjIndexValue = [])
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (typeof index !== "string") { return reject("index must be a string"); }
            if (typeof changeValueFromCurrentValue !== "boolean") { return reject("changeValueFromCurrentValue must be a boolean"); }
            if (!Array.isArray(arrayObjIndexValue)) { return reject("arrayObjIndexValue must be a array"); }
            if (!changeValueFromCurrentValue && !arrayObjIndexValue.length) { return reject("You need to specify one or more objects by specifying the indexes and new values that will be changed from the value of a index"); }
            for (const objIndexValue of arrayObjIndexValue)
            {
                if (typeof objIndexValue !== "object") { return reject("arrayObjIndexValue must only have a array with object(s)"); }
                if (typeof objIndexValue.index !== "string") { return reject("Property 'index' inside of the object(s) must be of string type"); }
            }
            const arrayObjIndexValueLength = arrayObjIndexValue.length;
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            const requestCursor = objectStore.openCursor();
            requestCursor.onerror = (event) => { reject(event.target.error.message); }
            requestCursor.onsuccess = (event) =>
            {
                const cursor = event.target.result;
                if (cursor)
                {
                    const rowCursor = cursor.value;
                    if (rowCursor[index] === currentValue)
                    {
                        if (changeValueFromCurrentValue) { rowCursor[index] = newValue; }
                        if (arrayObjIndexValueLength)
                        {
                            for (const objIndexValue of arrayObjIndexValue)
                            {
                                if (objIndexValue.index in rowCursor) { rowCursor[objIndexValue.index] = objIndexValue.value; }
                            }
                        }
                        const updateRequest = cursor.update(rowCursor);
                        updateRequest.onerror = (event) => { return reject(event.target.error.message); }
                    }
                    cursor.continue();
                }
            }
            requestCursor.oncomplete = () => { resolve("Data was updated successfully"); }
        });
    }

    /**
     * This asynchronous method delete data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {string} indexName Index name of the index that will have its value deleted
     * @param value Value to be deleted
     * @param {boolean} deleteAllOccurrences Optional parameter if you want to delete all occurrences of a certain value in the index
     * @returns {string}
     */
    deleteDataObjectStore(objectStoreName, indexName, value, deleteAllOccurrences = false)
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (typeof indexName !== "string") { return reject("indexName must be a string"); }
            if (typeof deleteAllOccurrences !== "boolean") { return reject("deleteAllOccurrences must be a boolean"); }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            let index;
            try { index = objectStore.index(indexName); }
            catch (error) { return reject(`The index '${indexName}' passed as a parameter was not found in the Object Store`); }

            if (!deleteAllOccurrences)
            {
                const requestKey = index.getKey(value);
                requestKey.onerror = (event) => { reject(event.target.error.message); }
                requestKey.onsuccess = (event) =>
                {
                    const key = event.target.result;
                    let requestDelete;
                    try { requestDelete = objectStore.delete(key); }
                    catch (error) { return reject(`The value '${value}' passed as a parameter was not found in the Object Store`); }
                    requestDelete.onerror = (event) => { reject(event.target.error.message); }
                    requestDelete.onsuccess = () => { resolve("Data was deleted successfully"); }
                }
            }
            else
            {
                const allOccurrencesValue = IDBKeyRange.only(value);
                const requestAllKeys = index.getAllKeys(allOccurrencesValue);
                requestAllKeys.onerror = (event) => { reject(event.target.error.message); }
                requestAllKeys.onsuccess = (event) =>
                {
                    const keys = event.target.result;
                    for (const key of keys)
                    {
                        const requestDelete = objectStore.delete(key);
                        requestDelete.onerror = (event) => { return reject(event.target.error.message); }
                    }
                }
                requestAllKeys.oncomplete = () => { resolve("All data were deleted successfully"); }
            }
        });
    }

    /**
     * This asynchronous method delete multiple data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {object[]} arrayObjIndexValue Array containing object(s), each object containing the properties 'index', 'value' and optionally 'deleteAllOccurrences' with their respective values • example: [{"index": "age", "value": 23, "deleteAllOccurrences": false}]
     * @returns {string}
     */
    deleteMultipleDataObjectStore(objectStoreName, arrayObjIndexValue = [])
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!Array.isArray(arrayObjIndexValue)) { return reject("arrayObjIndexValue must be a array"); }
            if (!arrayObjIndexValue.length) { return reject("arrayObjIndexValue must have object(s) with 'index' and 'value' to be deleted") }
            for (const objIndexValue of arrayObjIndexValue)
            {
                if (typeof objIndexValue !== "object") { return reject("arrayObjIndexValue must only have a array with object(s)"); }
                if (!("index" in objIndexValue)) { return reject("Property 'index' was not found inside of the object(s)"); }
                else if (typeof objIndexValue.index !== "string") { return reject("Property 'index' inside of the object(s) must be of string type"); }
                if (typeof objIndexValue.deleteAllOccurrences !== "boolean") { objIndexValue.deleteAllOccurrences = false; }
            }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            const processObjIndexValue = async (objIndexValue) =>
            {
                return new Promise((innerResolve, innerReject) => {
                    let index;
                    try { index = objectStore.index(objIndexValue.index); }
                    catch (error) { return innerReject(`The index '${objIndexValue.index}' passed as a parameter to an object in the 'index' property was not found in the Object Store`); }
                    if (!objIndexValue.deleteAllOccurrences)
                    {
                        const requestKey = index.getKey(objIndexValue.value);
                        requestKey.onerror = (event) => { innerReject(event.target.error.message); }
                        requestKey.onsuccess = (event) =>
                        {
                            const key = event.target.result;
                            let requestDelete;
                            try {  requestDelete = objectStore.delete(key); }
                            catch (error) { return innerReject(`The value '${objIndexValue.value}' passed as a parameter in an object in the 'value' property was not found`); }
                            requestDelete.onerror = (event) => { innerReject(event.target.error.message); }
                            requestDelete.onsuccess = () => { innerResolve(); }
                        }
                    }
                    else
                    {
                        const allOccurrencesValue = IDBKeyRange.only(objIndexValue.value);
                        const requestAllKeys = index.getAllKeys(allOccurrencesValue);
                        requestAllKeys.onerror = (event) => { innerReject(event.target.error.message); }
                        requestAllKeys.onsuccess = (event) =>
                        {
                            const keys = event.target.result;
                            const promises = keys.map(key =>
                            {
                                return new Promise((resolveDelete, rejectDelete) =>
                                {
                                    let requestDelete;
                                    try { requestDelete = objectStore.delete(key); }
                                    catch (error) { return rejectDelete(`The value '${objIndexValue.value}' passed as a parameter in an object in the 'value' property was not found`); }
    
                                    requestDelete.onerror = (event) => { rejectDelete(event.target.error.message); }
                                    requestDelete.onsuccess = () => { resolveDelete(); }
                                });
                            });
                            Promise.all(promises).then(() => { innerResolve(); }).catch(error => { innerReject(error); });
                        }
                    }
                });
            };

            (async () =>
            {
                for (const objIndexValue of arrayObjIndexValue)
                {
                    try { await processObjIndexValue(objIndexValue); }
                    catch (error) { return reject(error); }
                }
                resolve("All data were deleted successfully");
            })();
        });
    }

    /**
     * This asynchronous method delete all data inside of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {string[]} indexes Array containing indexes that will have all their data deleted, if the data contains another index not mentioned the data of that index will be kept
     * @returns {string}
     */
    deleteAllDataObjectStore(objectStoreName, indexes = [])
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof objectStoreName !== "string") { return reject("objectStoreName must be a string"); }
            if (!Array.isArray(indexes)) { return reject("indexes must be a array"); }
            for (const index of indexes) { if (typeof index !== "string") { return reject("All values within indexes must be of string type"); } }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            if (!indexes.length) { objectStore.clear(); }
            else
            {
                const requestAllRecords = objectStore.getAll();
                requestAllRecords.onerror = (event) => { reject(event.target.error.message); } 
                requestAllRecords.onsuccess = (event) =>
                {
                    let allRecords = event.target.result;
                    for (const record of allRecords)
                    {
                        for (const index of indexes) { delete record[index]; }
                    }
                    allRecords = allRecords.filter(record => Object.keys(record).length > 0);
                    this.deleteAllDataObjectStore(objectStoreName).then(() =>
                    {
                        this.insertMultipleDataObjectStore(objectStoreName, allRecords).catch(error => { return reject(error); })
                    })
                    .catch(error => { return reject(error); })
                }
            }
            transaction.onerror = (event) => { reject(event.target.error.message); } 
            transaction.oncomplete = () => { resolve(`All data were removed`); }
        });
    }

    /**
     * This asynchronous method clean all data of a Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @returns {true|string}
     */
    cleanObjectStore(objectStoreName)
    {
        return new Promise((resolve, reject) =>
        {
            this.deleteAllDataObjectStore(objectStoreName).then(() => { resolve(true); }).catch(error => { reject(error); });
        });
    }

    /**
     * This asynchronous method retrieve the date of the last modification date at the database
     *
     * @returns {string|null}
     */
    getLastModifyDateDatabase()
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            const objectStoreName = this.#objectStoreNameLastModifyDate;
            this.selectAllDataObjectStore(objectStoreName)
            .then(result =>
            {
                if (result.length) { resolve(result[result.length-1]["lastModifyDate"]); }
                else { resolve(null); }
            }).catch(error => { reject(error); })
        });
    }

    /**
     * This asynchronous method verifies if an index exists in an Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {string} indexName Index name
     * @returns {true|false|string}
     */
    indexExistsInObjectStore(objectStoreName, indexName)
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction(objectStoreName, "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            if (objectStore.indexNames.contains(indexName)) { resolve(true); }
            else { resolve(false); }
        });
    }

    /**
     * This asynchronous method verifies if one or more indexes exists in an Object Store
     *
     * @param {string} objectStoreName Object Store name
     * @param {string[]} indexes Array with String(s)
     * @returns {(true|false)[]|string}
     */
    indexesExistsInObjectStore(objectStoreName, indexes = [])
    {
        return new Promise((resolve, reject) =>
        {
            for (const index of indexes) { if (typeof index !== "string") { return reject("All values within indexes must be of string type"); } }
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            if (!this.#database.objectStoreNames.contains(objectStoreName)) { return reject(`Object Store '${objectStoreName}' does not exist`); }
            const transaction = this.#database.transaction(objectStoreName, "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            const indexesExists = [];
            for (const index of indexes)
            {
                if (objectStore.indexNames.contains(index)) { indexesExists.push(true); }
                else { indexesExists.push(false); }
            }
            resolve(indexesExists);
        });
    }

    /**
     * This method handles with the date
     *
     * @param {string} timezone
     * @returns {string}
     */
    #getActualDate(timezone)
    {
        const actualDateFromClient = new Date();
        const options = { timeZone: timezone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" };
        const dateInTimezone = new Intl.DateTimeFormat("en-CA", options).format(actualDateFromClient);
        const [datePart, timePart] = dateInTimezone.split(", ");
        return `${datePart} ${timePart}`;
    }

    /**
     * This asynchronous method updates the last modification date in the database
     *
     * @param {string} timezone
     * @returns {true|string}
     */
    #setLastModifyDateDatabase(timezone = this.#timezoneLastModifyDate)
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.#database) { return reject("Database has not been initialized and/or does not exist"); }
            const isValidTimezone = (timezone) =>
            {
                try
                {
                    new Intl.DateTimeFormat(undefined, {timeZone: timezone});
                    return true;
                }
                catch (error) { return false; }
            }
            if (!isValidTimezone(timezone)) { return reject("Timezone is not valid") }
            const objectStoreName = this.#objectStoreNameLastModifyDate;
            const promiseCreateOrCleanObjectStore = new Promise((innerResolve, innerReject) =>
            {
                if (!this.#database.objectStoreNames.contains(objectStoreName))
                {
                    this.createObjectStore(objectStoreName, [{"name": "lastModifyDate"}], false).then(() => { return innerResolve(); }).catch(error => { return innerReject(error); });
                }
                else { this.cleanObjectStore(objectStoreName).then(() => { return innerResolve(); }).catch(error => { return innerReject(error); }); }
            });
            promiseCreateOrCleanObjectStore.then(() =>
            {
                this.insertDataObjectStore(objectStoreName, {"lastModifyDate": this.#getActualDate(timezone)}).then(() => { resolve(true); }).catch(error => { reject(error); });
            })
            .catch(error => { reject(error); });
        });
    }
}
