// Database migration script to fix phoneNumber index
// This script fixes the phoneNumber unique index to be sparse
// Run this script once to update your database

const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables

async function fixPhoneNumberIndex() {
    // Use your MongoDB connection string from environment
    const connectionString = process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error('❌ Error: MONGODB_URI or DATABASE_URL environment variable is not set');
        console.log('Please set your MongoDB connection string in your .env file');
        console.log('Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name');
        return;
    }
    
    console.log('Using connection string:', connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in log
    
    const client = new MongoClient(connectionString);
      try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const collection = db.collection('users');
        
        // Check if the collection exists first
        const collections = await db.listCollections({ name: 'users' }).toArray();
        if (collections.length === 0) {
            console.log('ℹ️  Users collection does not exist yet. This is normal for a new database.');
            console.log('The sparse index will be created automatically when the first user is registered.');
            console.log('No migration needed at this time.');
            return;
        }
        
        // Check existing indexes
        console.log('📋 Checking existing indexes...');
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(idx => ({ 
            name: idx.name,
            key: idx.key, 
            unique: idx.unique, 
            sparse: idx.sparse 
        })));
        
        // Drop the existing phoneNumber index if it exists and is not sparse
        const phoneNumberIndex = indexes.find(idx => idx.key.phoneNumber === 1);
        if (phoneNumberIndex && phoneNumberIndex.unique && !phoneNumberIndex.sparse) {
            console.log('🔧 Dropping existing non-sparse phoneNumber index...');
            await collection.dropIndex({ phoneNumber: 1 });
            console.log('✅ Old index dropped');
        } else if (phoneNumberIndex && phoneNumberIndex.sparse) {
            console.log('✅ phoneNumber index is already sparse. No migration needed.');
            return;
        } else if (!phoneNumberIndex) {
            console.log('ℹ️  No phoneNumber index found. Will create sparse index.');
        }
        
        // Create new sparse unique index
        console.log('🔧 Creating new sparse unique index for phoneNumber...');
        await collection.createIndex(
            { phoneNumber: 1 }, 
            { 
                unique: true, 
                sparse: true,
                name: 'phoneNumber_1_sparse'
            }
        );
        console.log('✅ New sparse unique index created');
        
        // Clean up any existing null/undefined phoneNumber values
        console.log('🧹 Cleaning up null/undefined phoneNumber values...');
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
        console.log(`✅ Cleaned up ${result.modifiedCount} documents with null/empty phoneNumber`);
        
        // Verify the new indexes
        console.log('🔍 Verifying new indexes...');
        const newIndexes = await collection.indexes();
        console.log('Updated indexes:', newIndexes.map(idx => ({ 
            name: idx.name,
            key: idx.key, 
            unique: idx.unique, 
            sparse: idx.sparse 
        })));
        
        console.log('🎉 phoneNumber index migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.code === 26) {
            console.log('ℹ️  This error usually means the database or collection doesn\'t exist yet.');
            console.log('This is normal for a new database. The sparse index will be created automatically.');
        }
    } finally {
        await client.close();
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    fixPhoneNumberIndex();
}

module.exports = { fixPhoneNumberIndex };
