// Database migration script to fix phoneNumber index
// This script fixes the phoneNumber unique index to be sparse
// Run this script once to update your database

const { MongoClient } = require('mongodb');

async function fixPhoneNumberIndex() {
    // Use your MongoDB connection string
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name';
    
    const client = new MongoClient(connectionString);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db();
        const collection = db.collection('users');
        
        // Check existing indexes
        console.log('Checking existing indexes...');
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(idx => ({ key: idx.key, unique: idx.unique, sparse: idx.sparse })));
        
        // Drop the existing phoneNumber index if it exists and is not sparse
        const phoneNumberIndex = indexes.find(idx => idx.key.phoneNumber === 1);
        if (phoneNumberIndex && phoneNumberIndex.unique && !phoneNumberIndex.sparse) {
            console.log('Dropping existing non-sparse phoneNumber index...');
            await collection.dropIndex({ phoneNumber: 1 });
            console.log('Old index dropped');
        }
        
        // Create new sparse unique index
        console.log('Creating new sparse unique index for phoneNumber...');
        await collection.createIndex(
            { phoneNumber: 1 }, 
            { 
                unique: true, 
                sparse: true,
                name: 'phoneNumber_1_sparse'
            }
        );
        console.log('New sparse unique index created');
        
        // Clean up any existing null/undefined phoneNumber values
        console.log('Cleaning up null/undefined phoneNumber values...');
        const result = await collection.updateMany(
            { 
                $or: [
                    { phoneNumber: null },
                    { phoneNumber: undefined },
                    { phoneNumber: '' }
                ]
            },
            { $unset: { phoneNumber: 1 } }
        );
        console.log(`Cleaned up ${result.modifiedCount} documents with null/empty phoneNumber`);
        
        // Verify the new indexes
        console.log('Verifying new indexes...');
        const newIndexes = await collection.indexes();
        console.log('Updated indexes:', newIndexes.map(idx => ({ key: idx.key, unique: idx.unique, sparse: idx.sparse })));
        
        console.log('✅ phoneNumber index migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await client.close();
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    fixPhoneNumberIndex();
}

module.exports = { fixPhoneNumberIndex };
