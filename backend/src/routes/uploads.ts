import type { FastifyInstance } from 'fastify';
import { MongoService } from '../services/mongo-service.js';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const registerUploadRoutes = async (app: FastifyInstance, mongoService: MongoService) => {
  app.post('/api/v1/uploads/avatar', {
    preHandler: [app.authenticate as any]
  }, async (request: any, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const userId = request.user.id;
    const extension = path.extname(data.filename);
    const filename = `${userId}-${nanoid(8)}${extension}`;
    const uploadPath = path.join(__dirname, '../../public/uploads', filename);

    // Ensure directory exists
    const dir = path.dirname(uploadPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await pipeline(data.file, fs.createWriteStream(uploadPath));

    const protocol = request.protocol;
    const host = request.hostname;
    const avatarUrl = `${protocol}://${host}/public/uploads/${filename}`;

    // Update account avatar
    await mongoService.updateAccount(userId, { avatar: avatarUrl });

    // Update member avatars across all workspaces where this user is present
    const account = await mongoService.findAccountById(userId);
    if (account && account.memberId) {
      // Find all members with this memberId and update them
      await (mongoService as any).db.collection('members').updateMany(
        { id: account.memberId },
        { $set: { avatar: avatarUrl } }
      );
    }

    return { 
      success: true, 
      avatarUrl,
      message: 'Avatar updated successfully' 
    };
  });
};
