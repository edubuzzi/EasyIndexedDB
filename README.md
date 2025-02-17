# EasyIndexedDB

An easy, simple, and uncomplicated library to handle data with IndexedDB, the JavaScript NoSQL database.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
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

EasyIndexedDB is a modern JavaScript library that simplifies working with IndexedDB, providing an intuitive API for database operations. It handles complex IndexedDB operations while maintaining a clean and straightforward interface for developers.

## Features

- Simple and intuitive API
- Promise-based operations
- Comprehensive error handling
- Support for multiple object stores
- Flexible data querying
- Index management
- Timezone-aware date tracking
- Automatic version management
- Type checking for parameters

## Installation

```bash
npm install @eduardobuzzi/easyindexeddb
```

## Usage

### Basic Usage

```javascript
import EasyIndexedDB from "@eduardobuzzi/easyindexeddb";

const db = new EasyIndexedDB();

// Initialize the database
await db.initialize("myDatabase");

// Create an object store with indexes
await db.createObjectStore("users", [
    { name: "email", unique: true },
    { name: "age", unique: false }
]);

// Insert data
await db.insertDataObjectStore("users", {
    email: "john@example.com",
    age: 30
});
```

### Database Operations

#### Initialize Database
```javascript
// Initialize with automatic version
await db.initialize("myDatabase");

// Initialize with specific version
await db.initialize("myDatabase", 1);
```

#### Delete Database
```javascript
// Delete current database
await db.delete();

// Delete specific database
await db.delete("otherDatabase");
```

### Object Store Operations

#### Create Object Store
```javascript
// Create with indexes
await db.createObjectStore("users", [
    { name: "email", unique: true },
    { name: "age", unique: false }
]);

// Create without indexes
await db.createObjectStore("simple");
```

#### Update Object Store Structure
```javascript
// Add new indexes
const indexesToAdd = [
    { name: "phone", unique: false }
];

// Remove existing indexes
const indexesToRemove = ["age"];

// Rename indexes
const indexesToRename = [
    { oldName: "email", newName: "userEmail", unique: true }
];

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
// Insert single record
await db.insertDataObjectStore("users", {
    email: "john@example.com",
    age: 30
});

// Insert multiple records
await db.insertMultipleDataObjectStore("users", [
    { email: "john@example.com", age: 30 },
    { email: "jane@example.com", age: 25 }
]);
```

#### Select Data
```javascript
// Select single record
const user = await db.selectDataObjectStore("users", "email", "john@example.com");

// Select specific fields
const userAge = await db.selectDataObjectStore(
    "users",
    "email",
    "john@example.com",
    ["age"]
);

// Select all records
const allUsers = await db.selectAllDataObjectStore("users");

// Select multiple records
const specificUsers = await db.selectMultipleDataObjectStore("users", [
    { index: "email", value: "john@example.com" },
    { index: "email", value: "jane@example.com" }
]);
```

#### Update Data
```javascript
// Update single value
await db.updateDataObjectStore(
    "users",
    "email",
    "john@example.com",
    "john.doe@example.com"
);

// Update multiple fields
await db.updateDataObjectStore(
    "users",
    "email",
    "john@example.com",
    null,
    false,
    [
        { index: "age", value: 31 },
        { index: "phone", value: "123-456-7890" }
    ]
);
```

#### Delete Data
```javascript
// Delete single record
await db.deleteDataObjectStore("users", "email", "john@example.com");

// Delete multiple records
await db.deleteMultipleDataObjectStore("users", [
    { index: "email", value: "john@example.com" },
    { index: "email", value: "jane@example.com" }
]);

// Delete all records
await db.deleteAllDataObjectStore("users");

// Clean object store
await db.cleanObjectStore("users");
```

### Utility Methods

#### Check Index Existence
```javascript
// Check single index
const exists = await db.indexExistsInObjectStore("users", "email");

// Check multiple indexes
const existArray = await db.indexesExistsInObjectStore("users", ["email", "age"]);
```

#### Last Modification Date
```javascript
// Get last modification date
const lastModified = await db.getLastModifyDateDatabase();

// Set timezone for last modification date
db.setTimezoneLastModifyDate("America/New_York");

// Set custom object store name for last modification date
db.setObjectStoreNameLastModifyDate("_lastModified");
```

## API Reference

### Database Methods
- `initialize(databaseName, databaseVersion?)`: Initialize database
- `delete(databaseName?)`: Delete database

### Object Store Methods
- `createObjectStore(name, indexes?, setLastModifyDate?)`: Create object store
- `deleteObjectStore(name)`: Delete object store
- `updateStructureObjectStore(name, indexesToAdd?, indexesToRemove?, indexesToRename?)`: Update structure
- `cleanObjectStore(name)`: Remove all data from object store

### Data Methods
- `insertDataObjectStore(store, data)`: Insert single record
- `insertMultipleDataObjectStore(store, dataArray)`: Insert multiple records
- `selectDataObjectStore(store, index, value, fields?)`: Select single record
- `selectMultipleDataObjectStore(store, queries)`: Select multiple records
- `selectAllDataObjectStore(store, fields?)`: Select all records
- `updateDataObjectStore(store, index, currentValue, newValue, changeValueFromCurrentValue?, updates?)`: Update data
- `deleteDataObjectStore(store, index, value, deleteAllOccurrences?)`: Delete data
- `deleteMultipleDataObjectStore(store, deletes)`: Delete multiple records
- `deleteAllDataObjectStore(store, indexes?)`: Delete all records

### Utility Methods
- `indexExistsInObjectStore(store, index)`: Check index existence
- `indexesExistsInObjectStore(store, indexes)`: Check multiple indexes
- `getLastModifyDateDatabase()`: Get last modification date
- `setTimezoneLastModifyDate(timezone)`: Set timezone
- `setObjectStoreNameLastModifyDate(name)`: Set last modification store name

## Examples

### Complete User Management Example
```javascript
import EasyIndexedDB from "@eduardobuzzi/easyindexeddb";

async function initializeUserDatabase() {
    const db = new EasyIndexedDB();
    
    // Initialize database
    await db.initialize("userManagement");
    
    // Create users store
    await db.createObjectStore("users", [
        { name: "email", unique: true },
        { name: "username", unique: true },
        { name: "age", unique: false }
    ]);
    
    // Add users
    await db.insertMultipleDataObjectStore("users", [
        { email: "john@example.com", username: "john_doe", age: 30 },
        { email: "jane@example.com", username: "jane_doe", age: 25 }
    ]);
    
    // Query users
    const allUsers = await db.selectAllDataObjectStore("users");
    console.log("All users:", allUsers);
    
    // Update user
    await db.updateDataObjectStore(
        "users",
        "email",
        "john@example.com",
        null,
        false,
        [{ index: "age", value: 31 }]
    );
    
    // Get specific user
    const john = await db.selectDataObjectStore("users", "username", "john_doe");
    console.log("John\'s updated record:", john);
    
    return db;
}
```

## Error Handling

The library uses Promise-based error handling. All methods return promises that reject with descriptive error messages:

```javascript
try {
    await db.initialize("myDatabase");
    await db.createObjectStore("users");
} catch (error) {
    console.error("Database operation failed:", error);
}
```

Common error cases:
- Browser doesn't support IndexedDB
- Invalid parameter types
- Missing required parameters
- Non-existent database or object store
- Duplicate unique indexes
- Invalid timezone

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m "Add some AmazingFeature"`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Created by [Eduardo Gabriel Buzzi](https://github.com/edubuzzi)
