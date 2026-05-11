#!/bin/bash

# TeamFlow MongoDB Atlas Setup Script

echo "🚀 TeamFlow MongoDB Atlas Setup"
echo "================================"
echo ""

# Check if MongoDB connection string is provided
if [ -z "$MONGODB_URI" ]; then
    echo "📝 Before running this script, set up MongoDB Atlas:"
    echo ""
    echo "1. Go to https://www.mongodb.com/cloud/atlas"
    echo "2. Sign up for a free account"
    echo "3. Create a new project"
    echo "4. Create a cluster (select M0 free tier)"
    echo "5. Create a database user (e.g., teamflow)"
    echo "6. Get your connection string"
    echo "7. Update the MONGODB_URI in your .env.local file"
    echo ""
    echo "Then run: export MONGODB_URI='your-connection-string' && npm run setup"
    echo ""
    exit 1
fi

echo "✅ MongoDB URI detected"
echo "🔗 Connection string: ${MONGODB_URI:0:50}..."
echo ""
echo "To initialize MongoDB with seed data:"
echo "1. Ensure the backend is NOT running"
echo "2. Run: npm run build"
echo "3. MongoDB collections will be created on first backend startup"
echo ""
echo "✨ Setup complete! Start the backend with: npm run start"
