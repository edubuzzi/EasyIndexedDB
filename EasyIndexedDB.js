/*!
 * EasyIndexedDB v2.0.0
 * An easy, simple, and uncomplicated library to handle data with IndexedDB, the JavaScript NoSQL database.
 *
 * Author: Eduardo Gabriel Buzzi
 * GitHub: https://github.com/edubuzzi
 * Website: https://www.eduardobuzzi.com
 * 
 * Released under the MIT License.
 * SPDX-License-Identifier: MIT
 * 
 * Copyright (c) 2025 Eduardo Gabriel Buzzi
 */
export default class EasyIndexedDB
{
    #databaseName;
    #databaseVersion;
    #timezoneLastModifyDate = "America/Sao_Paulo";
    #objectStoreNameLastModifyDate = "__dbLastModified";

    /**
     * A robust, private wrapper for creating and managing an IndexedDB transaction.
     * This is the core of the library, ensuring that connections are handled safely
     * and that operations are properly queued.
     * @private
     * @param {string} dbName - The name of the database.
     * @param {number|undefined} version - The database version to open. If undefined, opens the latest version.
     * @param {(db: IDBDatabase, transaction: IDBTransaction) => Promise<any>} upgradeCallback - Logic to run inside the 'onupgradeneeded' event.
     * @param {(db: IDBDatabase) => Promise<any>} successCallback - Logic to run inside the 'onsuccess' event.
     * @returns {Promise<any>} A promise that resolves or rejects based on the outcome of the callbacks.
     */
    #execute(dbName, version, upgradeCallback, successCallback)
    {
        return new Promise((resolve, reject) =>
        {
            const request = version ? indexedDB.open(dbName, version) : indexedDB.open(dbName);

            request.onerror = (event) => reject(new Error(`Database error: ${event.target.error?.message}`));
            request.onblocked = () => reject(new Error("Database connection is blocked. Please close other tabs with this application open."));

            request.onupgradeneeded = (event) =>
            {
                const db = event.target.result;
                const transaction = event.target.transaction;
                upgradeCallback(db, transaction).then(resolve).catch(reject);
            };

            request.onsuccess = (event) =>
            {
                const db = event.target.result;
                this.#databaseVersion = db.version;
                if (successCallback)
                {
                    successCallback(db).then(resolve).catch(reject).finally(() => db.close());
                }
                else
                {
                    // If there's no success callback, it's likely an upgrade-only operation.
                    // Close the connection and resolve.
                    db.close();
                    resolve(true);
                }
            };
        });
    }

    /**
     * Initializes the database connection and sets it up for subsequent operations.
     * @param {string} databaseName - The name for the database.
     * @param {number} [databaseVersion] - Optional. The integer version of the database.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    initialize(databaseName, databaseVersion)
    {
        if (!indexedDB) { return Promise.reject("Browser does not allow use of the IndexedDB to store information"); }
        if (typeof databaseName !== "string" || !databaseName) { return Promise.reject("Database name must be a string"); }
        
        this.#databaseName = databaseName;
        return this.#execute(this.#databaseName, databaseVersion, 
            (db, transaction) =>
            {
                this.#updateModificationDate(transaction);
                return Promise.resolve("Database updated and initialized successfully");
            },
            () => Promise.resolve("Database created and/or initialized successfully")
        );
    }

    /**
     * Deletes a database.
     * @param {string} [databaseName] - Optional. The name of the database to delete. If omitted, uses the name from `initialize()`.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    delete(databaseName)
    {
        return new Promise((resolve, reject) =>
        {
            const dbNameToDelete = databaseName || this.#databaseName;
            if (!dbNameToDelete) { return reject("Database name is not valid"); }

            const request = indexedDB.deleteDatabase(dbNameToDelete);
            request.onerror = (event) => reject(event.target.error.message);
            request.onsuccess = () => resolve("Database deleted successfully");
        });
    }

    /**
     * Creates a new Object Store within the database.
     * @param {string} objectStoreName - The name for the new Object Store.
     * @param {Array<{name: string, unique?: boolean}>} [indexes=[]] - Optional. An array of index definitions. Example: `[{ name: 'email', unique: true }]`
     * @returns {Promise<string>} A promise that resolves with a success message, or a message indicating the store already exists.
     */
    createObjectStore(objectStoreName, indexes = [])
    {
        return new Promise(async (resolve, reject) =>
        {
            if (typeof objectStoreName !== "string" || !objectStoreName) { return reject("objectStoreName must be a non-empty string"); }
            
            // A more compatible way to get the version is to open a connection without a version number.
            const dbInfo = await indexedDB.databases().then(dbs => dbs.find(db => db.name === this.#databaseName));
            const currentVersion = dbInfo ? dbInfo.version : 0;
            const newVersion = currentVersion + 1;

            this.#execute(this.#databaseName, newVersion, (db, transaction) =>
            {
                // Check for existence inside 'onupgradeneeded' to be more efficient.
                if (db.objectStoreNames.contains(objectStoreName))
                {
                    // If the store exists, abort the transaction to prevent an empty version bump.
                    transaction.abort();
                    resolve(`Object Store '${objectStoreName}' already exist in the database`);
                    return Promise.resolve(); // Return a resolved promise to satisfy the chain.
                }

                const objectStore = db.createObjectStore(objectStoreName, { autoIncrement: true });
                for (const index of indexes)
                {
                    if (index && typeof index.name === 'string')
                    {
                        objectStore.createIndex(index.name, index.name, { unique: !!index.unique });
                    }
                }
                this.#updateModificationDate(transaction);
                return Promise.resolve("Object Store created successfully");
            }).then(resolve).catch(err =>
            {
                // A transaction abort is not a "real" error in this context, so we suppress it.
                if (err.name !== "AbortError") { reject(err); }
            });
        });
    }

    /**
     * Deletes an existing Object Store from the database.
     * @param {string} objectStoreName - The name of the Object Store to delete.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    deleteObjectStore(objectStoreName)
    {
        return new Promise(async (resolve, reject) =>
        {
            if (typeof objectStoreName !== "string" || !objectStoreName) { return reject("objectStoreName must be a non-empty string"); }

            const dbInfo = await indexedDB.databases().then(dbs => dbs.find(db => db.name === this.#databaseName));
            const currentVersion = dbInfo ? dbInfo.version : 0;
            if (!currentVersion) { return reject(`Database '${this.#databaseName}' does not exist.`); }

            const newVersion = currentVersion + 1;
            this.#execute(this.#databaseName, newVersion, (db, transaction) =>
            {
                if (db.objectStoreNames.contains(objectStoreName)) { db.deleteObjectStore(objectStoreName); }
                this.#updateModificationDate(transaction);
                return Promise.resolve("Object Store deleted successfully");
            }).then(resolve).catch(reject);
        });
    }

    /**
     * Inserts a single data object into an Object Store.
     * @param {string} objectStoreName - The target Object Store's name.
     * @param {object} value - The object to be stored.
     * @returns {Promise<IDBValidKey>} A promise that resolves with the key of the newly added record.
     */
    insertDataObjectStore(objectStoreName, value)
    {
        if (typeof objectStoreName !== "string" || !objectStoreName) { return Promise.reject("objectStoreName must be a non-empty string"); }
        if (typeof value !== 'object' || value === null) { return Promise.reject("Value must be an object."); }

        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            const transaction = db.transaction(objectStoreName, "readwrite");
            const request = transaction.objectStore(objectStoreName).add(value);
            request.onerror = (e) => reject(e.target.error);
            transaction.oncomplete = () => resolve(request.result);
        }));
    }

    /**
     * Inserts an array of data objects in a single, efficient transaction.
     * @param {string} objectStoreName - The target Object Store's name.
     * @param {object[]} [values=[]] - An array of objects to be stored.
     * @returns {Promise<true>} A promise that resolves to `true` on successful insertion.
     */
    insertMultipleDataObjectStore(objectStoreName, values = [])
    {
        if (typeof objectStoreName !== "string" || !objectStoreName) { return Promise.reject("objectStoreName must be a non-empty string"); }
        if (!Array.isArray(values)) { return Promise.reject("Values must be an array."); }
        if (!values.length) { return Promise.resolve(true); }

        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            const transaction = db.transaction(objectStoreName, "readwrite");
            const store = transaction.objectStore(objectStoreName);
            values.forEach(value => store.add(value));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (e) => reject(e.target.error);
        }));
    }

    /**
     * Selects a single record from an Object Store by an index value.
     * @param {string} objectStoreName - The target Object Store's name.
     * @param {string} indexName - The name of the index to search in.
     * @param {any} value - The value to search for within the index.
     * @param {string[]} [arraySpecificIndexes=[]] - Optional. An array of property names to return. If empty, returns the full object.
     * @returns {Promise<object|null>} A promise that resolves with the found object, or `null` if no record is found.
     */
    selectDataObjectStore(objectStoreName, indexName, value, arraySpecificIndexes = [])
    {
        if (typeof objectStoreName !== "string" || !objectStoreName) { return Promise.reject("objectStoreName must be a non-empty string"); }
        if (typeof indexName !== "string" || !indexName) { return Promise.reject("indexName must be a non-empty string"); }

        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            const transaction = db.transaction(objectStoreName, "readonly");
            const store = transaction.objectStore(objectStoreName);
            if (!store.indexNames.contains(indexName)) { return reject(new Error(`Index '${indexName}' not found.`)); }
            
            const request = store.index(indexName).get(value);
            transaction.oncomplete = () =>
            {
                const record = request.result;
                if (!record) { return resolve(null); }
                if (!arraySpecificIndexes || !arraySpecificIndexes.length) { return resolve(record); }
                
                const filteredRecord = {};
                for (const index of arraySpecificIndexes)
                {
                    if (index in record) filteredRecord[index] = record[index];
                }
                resolve(Object.keys(filteredRecord).length ? filteredRecord : null);
            };
            transaction.onerror = (e) => reject(e.target.error);
        }));
    }

    /**
     * Selects all records from an Object Store.
     * @param {string} objectStoreName - The target Object Store's name.
     * @param {string[]} [indexes=[]] - Optional. An array of property names to include in each returned object.
     * @returns {Promise<object[]>} A promise that resolves with an array of all found objects.
     */
    selectAllDataObjectStore(objectStoreName, indexes = [])
    {
        if (typeof objectStoreName !== "string" || !objectStoreName) { return Promise.reject("objectStoreName must be a non-empty string"); }

        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            const transaction = db.transaction(objectStoreName, "readonly");
            const request = transaction.objectStore(objectStoreName).getAll();
            
            transaction.oncomplete = () =>
            {
                const allRecords = request.result;
                if (!indexes || !indexes.length) { return resolve(allRecords); }

                const filteredRecords = allRecords.map(record =>
                {
                    const filteredRecord = {};
                    for (const index of indexes)
                    {
                        if (index in record) filteredRecord[index] = record[index];
                    }
                    return filteredRecord;
                }).filter(record => Object.keys(record).length > 0);
                
                resolve(filteredRecords);
            };
            transaction.onerror = (e) => reject(e.target.error);
        }));
    }

    /**
     * Updates the structure of an existing Object Store by adding, removing, or renaming indexes in a single transaction.
     * @param {string} objectStoreName - The name of the Object Store to update.
     * @param {Array<{name: string, unique?: boolean}>} [arrayObjIndexesToAdd=[]] - Indexes to add.
     * @param {string[]} [arrayIndexesToRemove=[]] - Names of indexes to remove.
     * @param {Array<{oldName: string, newName: string, unique?: boolean}>} [arrayObjChangeIndexesName=[]] - Indexes to rename. Data will be migrated automatically.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    updateStructureObjectStore(objectStoreName, arrayObjIndexesToAdd = [], arrayIndexesToRemove = [], arrayObjChangeIndexesName = [])
    {
        return new Promise(async (resolve, reject) =>
        {
            const dbInfo = await indexedDB.databases().then(dbs => dbs.find(db => db.name === this.#databaseName));
            const currentVersion = dbInfo ? dbInfo.version : 0;
            if (!currentVersion) { return reject(`Database '${this.#databaseName}' does not exist.`); }

            const newVersion = currentVersion + 1;
            let allData = [];
            const needsDataMigration = arrayObjChangeIndexesName && arrayObjChangeIndexesName.length > 0;

            if (needsDataMigration)
            {
                try { allData = await this.selectAllDataObjectStore(objectStoreName); }
                catch (error) { return reject(error); }
            }

            this.#execute(this.#databaseName, newVersion, (db, transaction) => new Promise((res, rej) =>
            {
                const store = transaction.objectStore(objectStoreName);

                arrayObjIndexesToAdd.forEach(idx =>
                {
                    if (!store.indexNames.contains(idx.name)) { store.createIndex(idx.name, idx.name, { unique: !!idx.unique }); }
                });
                
                arrayIndexesToRemove.forEach(name =>
                {
                    if (store.indexNames.contains(name)) { store.deleteIndex(name); }
                });
                
                arrayObjChangeIndexesName.forEach(change =>
                {
                    if (store.indexNames.contains(change.oldName)) { store.deleteIndex(change.oldName); }
                    if (!store.indexNames.contains(change.newName)) { store.createIndex(change.newName, change.newName, { unique: !!change.unique }); }
                });

                if (needsDataMigration && allData.length > 0)
                {
                    store.clear().onsuccess = () =>
                    {
                        allData.forEach(record =>
                        {
                            const newRecord = { ...record };
                            arrayObjChangeIndexesName.forEach(change =>
                            {
                                if (change.oldName in newRecord)
                                {
                                    newRecord[change.newName] = newRecord[change.oldName];
                                    delete newRecord[change.oldName];
                                }
                            });
                            store.put(newRecord);
                        });
                    };
                }
                
                this.#updateModificationDate(transaction);
                transaction.oncomplete = () => res("Object Store updated successfully");
                transaction.onerror = (e) => rej(e.target.error);
            })).then(resolve).catch(reject);
        });
    }

    /**
     * Updates one or more records in an Object Store that match a specific condition.
     * @param {string} objectStoreName - The target Object Store's name.
     * @param {string} index - The property name to use for matching records.
     * @param {any} currentValue - The value to match against the `index` property.
     * @param {any} newValue - The new value to set for the `index` property (if `changeValueFromCurrentValue` is true).
     * @param {boolean} [changeValueFromCurrentValue=true] - Whether to update the matched index's value with `newValue`.
     * @param {Array<{index: string, value: any}>} [arrayObjIndexValue=[]] - Optional. An array of other properties to update on matched records.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    updateDataObjectStore(objectStoreName, index, currentValue, newValue, changeValueFromCurrentValue = true, arrayObjIndexValue = [])
    {
        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            const transaction = db.transaction(objectStoreName, "readwrite");
            const store = transaction.objectStore(objectStoreName);
            const cursorRequest = store.openCursor();
            
            cursorRequest.onsuccess = (e) =>
            {
                const cursor = e.target.result;
                if (cursor)
                {
                    if (cursor.value[index] === currentValue)
                    {
                        const recordToUpdate = { ...cursor.value };
                        if (changeValueFromCurrentValue) recordToUpdate[index] = newValue;
                        if (arrayObjIndexValue.length)
                        {
                            for (const item of arrayObjIndexValue)
                            {
                                if (item.index in recordToUpdate) recordToUpdate[item.index] = item.value;
                            }
                        }
                        cursor.update(recordToUpdate);
                    }
                    cursor.continue();
                }
            };
            
            transaction.oncomplete = () => resolve("Data was updated successfully");
            transaction.onerror = (e) => reject(e.target.error);
        }));
    }

    /**
     * Deletes records from an Object Store based on an index value.
     * @param {string} objectStoreName - The target Object Store's name.
     * @param {string} indexName - The name of the index to search in.
     * @param {any} value - The value to match for deletion.
     * @param {boolean} [deleteAllOccurrences=false] - If true, deletes all records matching the value. If false, deletes only the first one found.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    deleteDataObjectStore(objectStoreName, indexName, value, deleteAllOccurrences = false)
    {
        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            const transaction = db.transaction(objectStoreName, "readwrite");
            const store = transaction.objectStore(objectStoreName);
            if (!store.indexNames.contains(indexName)) { return reject(new Error(`Index '${indexName}' not found.`)); }

            const index = store.index(indexName);
            const cursorRequest = index.openKeyCursor(IDBKeyRange.only(value));

            cursorRequest.onsuccess = (e) =>
            {
                const cursor = e.target.result;
                if (cursor)
                {
                    store.delete(cursor.primaryKey);
                    if (deleteAllOccurrences) cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve("Data was deleted successfully");
            transaction.onerror = (e) => reject(e.target.error);
        }));
    }

    /**
     * Deletes all data from an Object Store, leaving the store itself intact.
     * @param {string} objectStoreName - The name of the Object Store to clear.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    deleteAllDataObjectStore(objectStoreName)
    {
        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            const transaction = db.transaction(objectStoreName, "readwrite");
            transaction.objectStore(objectStoreName).clear();
            transaction.oncomplete = () => resolve(`All data were removed from '${objectStoreName}'`);
            transaction.onerror = (e) => reject(e.target.error);
        }));
    }

    /**
     * An alias for `deleteAllDataObjectStore`. Clears all data from an Object Store.
     * @param {string} objectStoreName - The name of the Object Store to clear.
     * @returns {Promise<string>} A promise that resolves with a success message.
     */
    cleanObjectStore(objectStoreName) { return this.deleteAllDataObjectStore(objectStoreName); }


    // --- Last Modification Date Methods ---

    /**
     * Sets the name of the Object Store used to track the last modification date.
     * @param {string} objectStoreName - The new name for the tracking Object Store.
     * @returns {void}
     */
    setObjectStoreNameLastModifyDate(objectStoreName)
    {
        if (typeof objectStoreName === "string" && objectStoreName.length) { this.#objectStoreNameLastModifyDate = objectStoreName; }
    }

    /**
     * Sets the timezone for storing the last modification date.
     * @param {string} timezone - A valid IANA time zone name (e.g., "Europe/London").
     * @returns {boolean} True if the timezone is valid, false otherwise.
     */
    setTimezoneLastModifyDate(timezone)
    {
        try
        {
            new Intl.DateTimeFormat(undefined, { timeZone: timezone });
            this.#timezoneLastModifyDate = timezone;
            return true;
        }
        catch (error) { return false; }
    }

    /**
     * Retrieves the timestamp of the last database structure modification.
     * @returns {Promise<string|null>} A promise that resolves with the date as a formatted string, or `null` if not set.
     */
    getLastModifyDateDatabase()
    {
        if (!this.#databaseName) return Promise.reject("Database not initialized.");

        const storeName = this.#objectStoreNameLastModifyDate;

        return this.#execute(this.#databaseName, undefined, null, (db) => new Promise((resolve, reject) =>
        {
            if (!db.objectStoreNames.contains(storeName)) { return resolve(null); }

            const transaction = db.transaction(storeName, "readonly");
            const request = transaction.objectStore(storeName).get("_last_modified_key_");

            transaction.oncomplete = () =>
            {
                const result = request.result;
                resolve(result ? result.timestamp : null);
            };
            transaction.onerror = (e) => reject(e.target.error);
        }));
    }

    /**
     * Generates a formatted timestamp string based on the configured timezone.
     * @private
     * @returns {string} The formatted date string.
     */
    #getActualDate()
    {
        const options =
        {
            timeZone: this.#timezoneLastModifyDate, hour12: false,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        };
        try
        {
            const dateInTimezone = new Intl.DateTimeFormat("en-CA", options).format(new Date());
            const [datePart, timePart] = dateInTimezone.split(", ");
            return `${datePart} ${timePart}`;
        }
        catch (error)
        {
            console.error("Invalid timezone, falling back to ISO string.", error);
            return new Date().toISOString();
        }
    }

    /**
     * Creates or updates the modification date record within an active 'versionchange' transaction.
     * This is efficient and atomic.
     * @private
     * @param {IDBTransaction} transaction - The active 'versionchange' transaction.
     * @returns {void}
     */
    #updateModificationDate(transaction)
    {
        try
        {
            const storeName = this.#objectStoreNameLastModifyDate;
            let store;

            if (!transaction.db.objectStoreNames.contains(storeName)) { store = transaction.db.createObjectStore(storeName); }
            else { store = transaction.objectStore(storeName); }
            
            const data = { timestamp: this.#getActualDate() };
            store.put(data, "_last_modified_key_");
        }
        catch (error) { console.error("Could not update the database modification date.", error); }
    }
}
