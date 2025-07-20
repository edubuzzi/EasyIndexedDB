# EasyIndexedDB

A modern, robust, and promise-based wrapper for IndexedDB, designed to provide a safe and intuitive developer experience.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
  - [NPM](#npm)
  - [Direct Download](#direct-download)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Database Operations](#database-operations)
  - [Object Store Operations](#object-store-operations)
  - [Data Operations](#data-operations)
  - [Utility Methods](#utility-methods)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [License](#license)

## Overview

EasyIndexedDB is a modern JavaScript library that abstracts away the complexities and pitfalls of raw IndexedDB. It provides a clean, promise-based API that makes database operations intuitive, safe, and efficient. This library is designed for developers who want the power of IndexedDB without the verbose and error-prone boilerplate.

## Features

-   **Intuitive, Promise-Based API**: All operations are asynchronous and use modern `async/await` syntax.
-   **Safe, Atomic Schema Migrations**: Create, delete, and update Object Stores and indexes in a single, safe transaction.
-   **Robust Error Handling**: Provides clear error messages and handles common issues like connection blocking.
-   **Automatic Version Management**: The library handles database versioning automatically when the schema changes.
-   **Efficient Data Operations**: Methods for inserting, selecting, updating, and deleting data, including bulk operations.
-   **Timezone-Aware Date Tracking**: Automatically tracks the last modification date of the database schema.
-   **Modern JavaScript**: Built with ES Modules, private class fields, and modern syntax.
-   **Zero Dependencies**: A lightweight, standalone library.

## Installation

### NPM
```bash
npm install @eduardobuzzi/easyindexeddb
```

### Direct Download

You can download the `EasyIndexedDB.js` file and include it directly in your project.

1.  Download the `EasyIndexedDB.js` file from this repository.
2.  Include it in your HTML using a script tag with `type="module"`.

```html
<!DOCTYPE html>
<html>
<head>
    <title>EasyIndexedDB Example</title>
</head>
<body>
    <script type="module">
        import EasyIndexedDB from "./path/to/EasyIndexedDB.js";
        
        const db = new EasyIndexedDB();
        
        async function run() {
            try {
                await db.initialize("my-app-database");
                console.log("Database initialized successfully!");
            } catch (error) {
                console.error("Initialization failed:", error);
            }
        }

        run();
    </script>
</body>
</html>
```

## Usage

### Basic Usage

```javascript
import EasyIndexedDB from "@eduardobuzzi/easyindexeddb";

const db = new EasyIndexedDB();

// 1. Initialize the database
await db.initialize("myDatabase");

// 2. Create an object store with indexes
await db.createObjectStore("users", [
    { name: "email", unique: true },
    { name: "age", unique: false }
]);

// 3. Insert data
const newKey = await db.insertDataObjectStore("users", {
    email: "john.doe@example.com",
    name: "John Doe",
    age: 30
});

console.log(`New user added with key: ${newKey}`);
```

### Database Operations

#### Initialize Database
```javascript
// Initialize with automatic versioning
await db.initialize("myDatabase");

// Initialize with a specific version (triggers upgrade if needed)
await db.initialize("myDatabase", 2);
```

#### Delete Database
```javascript
// Delete the database initialized with the instance
await db.delete();

// Or delete a database by name
await db.delete("otherDatabase");
```

### Object Store Operations

#### Create Object Store
```javascript
await db.createObjectStore("products", [
    { name: "sku", unique: true },
    { name: "category", unique: false }
]);
```

#### Delete Object Store
```javascript
await db.deleteObjectStore("products");
```

#### Update Object Store Structure
```javascript
// Add a new index
const indexesToAdd = [{ name: "last_login", unique: false }];

// Remove an existing index
const indexesToRemove = ["age"];

// Rename an index (data is automatically migrated)
const indexesToRename = [{ oldName: "email", newName: "userEmail", unique: true }];

await db.updateStructureObjectStore(
    "users",
    indexesToAdd,
    indexesToRemove,
    indexesToRename
);
```

### Data Operations

#### Insert Data
```javascript
// Insert a single record
const key = await db.insertDataObjectStore("users", {
    email: "jane.doe@example.com",
    age: 28
});

// Insert multiple records in one transaction
await db.insertMultipleDataObjectStore("users", [
    { email: "user1@example.com", age: 45 },
    { email: "user2@example.com", age: 32 }
]);
```

#### Select Data
```javascript
// Select a single record by its index
const user = await db.selectDataObjectStore("users", "email", "jane.doe@example.com");

// Select only specific fields from a record
const userAge = await db.selectDataObjectStore(
    "users",
    "email",
    "jane.doe@example.com",
    ["age"] // Returns { age: 28 }
);

// Select all records from an object store
const allUsers = await db.selectAllDataObjectStore("users");
```

#### Update Data
```javascript
// Update a specific field based on a query
await db.updateDataObjectStore(
    "users",
    "email", // find records where 'email' is...
    "jane.doe@example.com", // ...this value
    "jane.d@new-domain.com" // and update the 'email' field to this new value
);

// Update multiple fields on a found record
await db.updateDataObjectStore(
    "users",
    "email", // find records where 'email' is...
    "jane.d@new-domain.com", // ...this value
    null, // We don't want to change the 'email' field itself
    false, // Set the 4th parameter to false
    [
        { index: "age", value: 29 },
        { index: "last_login", value: new Date() }
    ] // ...and update these other fields
);
```

#### Delete Data
```javascript
// Delete the first record matching the query
await db.deleteDataObjectStore("users", "email", "user1@example.com");

// Delete ALL records matching the query (useful for non-unique indexes)
await db.deleteDataObjectStore("users", "age", 32, true);

// Delete all records in an object store
await db.deleteAllDataObjectStore("users");

// Alias for deleteAllDataObjectStore
await db.cleanObjectStore("users");
```

### Utility Methods

#### Last Modification Date
```javascript
// Get the timestamp of the last schema change
const lastModified = await db.getLastModifyDateDatabase();
console.log(`Database schema last modified on: ${lastModified}`);

// Change the timezone for date tracking (default is "America/Sao_Paulo")
db.setTimezoneLastModifyDate("UTC");

// Change the name of the internal object store used for tracking
db.setObjectStoreNameLastModifyDate("__myAppLastModified");
```

## API Reference

### Database Methods
- `initialize(databaseName, [databaseVersion])`: Initializes the database.
- `delete([databaseName])`: Deletes a database.

### Object Store Methods
- `createObjectStore(name, [indexes])`: Creates a new Object Store.
- `deleteObjectStore(name)`: Deletes an Object Store.
- `updateStructureObjectStore(name, [indexesToAdd], [indexesToRemove], [indexesToRename])`: Updates the schema of an Object Store.
- `cleanObjectStore(name)`: Removes all data from an Object Store.

### Data Methods
- `insertDataObjectStore(storeName, data)`: Inserts a single record. Returns the new record's key.
- `insertMultipleDataObjectStore(storeName, dataArray)`: Inserts multiple records.
- `selectDataObjectStore(storeName, indexName, value, [fields])`: Selects a single record.
- `selectAllDataObjectStore(storeName, [fields])`: Selects all records.
- `updateDataObjectStore(storeName, index, currentValue, newValue, [changeCurrent], [updates])`: Updates records matching a query.
- `deleteDataObjectStore(storeName, indexName, value, [deleteAllOccurrences])`: Deletes records matching a query.
- `deleteAllDataObjectStore(storeName)`: Deletes all data in an Object Store.

### Utility Methods
- `getLastModifyDateDatabase()`: Gets the timestamp of the last schema modification.
- `setTimezoneLastModifyDate(timezone)`: Sets the timezone for date tracking.
- `setObjectStoreNameLastModifyDate(name)`: Sets the name of the internal tracking store.

## Examples

### Complete User Management Flow
```javascript
import EasyIndexedDB from "./EasyIndexedDB.js";

async function runUserManagementDemo() {
    const db = new EasyIndexedDB();
    
    try {
        // Initialize
        await db.initialize("user-app-db");
        
        // Create store if it doesn't exist
        await db.createObjectStore("users", [
            { name: "email", unique: true },
            { name: "username", unique: true },
            { name: "age", unique: false }
        ]);
    
        // Add users in a batch
        await db.insertMultipleDataObjectStore("users", [
            { email: "alpha@example.com", username: "alpha", age: 35 },
            { email: "beta@example.com", username: "beta", age: 40 }
        ]);
        
        // Query all users
        const allUsers = await db.selectAllDataObjectStore("users");
        console.log("All users:", allUsers);
        
        // Update a user's age
        await db.updateDataObjectStore(
            "users", "username", "alpha", null, false,
            [{ index: "age", value: 36 }]
        );
        
        // Get the updated user
        const alphaUser = await db.selectDataObjectStore("users", "username", "alpha");
        console.log("Alpha's updated record:", alphaUser);

    } catch (error) {
        console.error("An error occurred during the demo:", error);
    }
}

runUserManagementDemo();
```

## Error Handling

All methods are promise-based and will `reject` on failure. Use `try...catch` blocks with `async/await` for clean error handling.

```javascript
try {
    await db.initialize("myDatabase");
    await db.createObjectStore("products", [{ name: "sku", unique: true }]);
    await db.insertDataObjectStore("products", { sku: "123", name: "My Product" });
} catch (error) {
    console.error("Database operation failed:", error.message);
}
```

Common error cases to handle:
-   **Browser Incompatibility**: The browser does not support IndexedDB.
-   **Connection Blocked**: Another tab has an open connection to the database that is preventing a version upgrade.
-   **Constraint Errors**: Trying to insert data that violates a `unique` index constraint.
-   **Invalid Parameters**: Passing incorrect types or missing required parameters.
-   **Non-existent Stores/Indexes**: Attempting to operate on a store or index that does not exist.

## Contributing

Contributions are welcome! For major changes, please open an issue first to discuss what you would like to change.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/NewFeature`).
3.  Commit your changes (`git commit -m "Add some NewFeature"`).
4.  Push to the branch (`git push origin feature/NewFeature`).
5.  Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Created by [Eduardo Gabriel Buzzi](https://github.com/edubuzzi)
