import { MongoClient, Db } from 'mongodb';
import { env } from './env.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export const connectMongoDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    
    // Test connection
    const adminDb = client.db('admin');
    await adminDb.command({ ping: 1 });
    
    db = client.db('teamflow');

    // Create indexes
    const accounts = db.collection('accounts');
    await accounts.createIndex({ email: 1 }, { unique: true });
    await accounts.createIndex({ providerId: 1 }, { unique: true, sparse: true });

    const workspaces = db.collection('workspaces');
    await workspaces.createIndex({ ownerId: 1 });
    await workspaces.createIndex({ memberIds: 1 });

    const projects = db.collection('projects');
    await projects.createIndex({ workspaceId: 1 });
    await projects.createIndex({ key: 1 }, { unique: true });

    const tasks = db.collection('tasks');
    await tasks.createIndex({ projectId: 1 });
    await tasks.createIndex({ assigneeId: 1 });

    const messages = db.collection('messages');
    await messages.createIndex({ channelId: 1, createdAt: 1 });
    await messages.createIndex({ senderId: 1 });

    const invitations = db.collection('invitations');
    await invitations.createIndex({ email: 1, workspaceId: 1 }, { unique: true, sparse: true });
    await invitations.createIndex({ token: 1 }, { unique: true });

    console.log('✓ MongoDB connected and indexes created');
    return db;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    console.error('\n📚 To set up MongoDB, follow these steps:');
    console.error('1. Sign up at https://www.mongodb.com/cloud/atlas');
    console.error('2. Create a free cluster');
    console.error('3. Get the connection string (mongodb+srv://...)');
    console.error('4. Update MONGODB_URI in your .env.local file');
    console.error('5. Restart the server\n');
    throw new Error('MongoDB connection failed. See instructions above.');
  }
};

export const getMongoDB = (): Db => {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongoDB first.');
  }
  return db;
};

export const closeMongoDB = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
};
