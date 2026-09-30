import mongoose from 'mongoose';
import { MONGODB_URI, NODE_ENV } from './constants.js';

let mongoMemoryServer: any = null;

/**
 * Normalizes MongoDB URI by ensuring password special characters (like '@') are properly percent-encoded.
 */
export const normalizeMongoUri = (uri: string): string => {
  if (!uri || uri === 'memory') return uri;
  try {
    const isSrv = uri.startsWith('mongodb+srv://');
    const isStandard = uri.startsWith('mongodb://');
    if (!isSrv && !isStandard) return uri;

    const scheme = isSrv ? 'mongodb+srv://' : 'mongodb://';
    const withoutScheme = uri.substring(scheme.length);
    const lastAtIndex = withoutScheme.lastIndexOf('@');
    if (lastAtIndex === -1) return uri;

    const userPassPart = withoutScheme.substring(0, lastAtIndex);
    const hostAndRest = withoutScheme.substring(lastAtIndex + 1);

    const firstColonIndex = userPassPart.indexOf(':');
    if (firstColonIndex === -1) return uri;

    const user = userPassPart.substring(0, firstColonIndex);
    const rawPass = userPassPart.substring(firstColonIndex + 1);

    let cleanPass = rawPass;
    try {
      cleanPass = decodeURIComponent(rawPass);
    } catch {
      cleanPass = rawPass;
    }
    const encodedPass = encodeURIComponent(cleanPass);

    return `${scheme}${user}:${encodedPass}@${hostAndRest}`;
  } catch {
    return uri;
  }
};

/**
 * Safely masks MongoDB URI to hide credentials while preserving protocol, host, and database name.
 */
export const getMaskedUri = (uri: string): string => {
  try {
    const normalized = normalizeMongoUri(uri);
    const isSrv = normalized.startsWith('mongodb+srv://');
    const isStandard = normalized.startsWith('mongodb://');
    if (!isSrv && !isStandard) return '[custom connection string]';

    const cleanUri = normalized.replace(/^mongodb\+srv:\/\//, 'http://').replace(/^mongodb:\/\//, 'http://');
    const parsed = new URL(cleanUri);
    const protocol = isSrv ? 'mongodb+srv://' : 'mongodb://';
    const host = parsed.host;
    const pathname = parsed.pathname;

    return `${protocol}****:****@${host}${pathname}`;
  } catch {
    return 'mongodb://[masked-credentials]';
  }
};

export const connectDB = async (): Promise<void> => {
  const isProduction = NODE_ENV === 'production';
  let isMemory = false;
  let connectionUri = MONGODB_URI;

  // 1. Production validation
  if (isProduction) {
    if (!connectionUri || connectionUri === 'memory') {
      console.error('❌ [FATAL] MONGODB_URI is required in production and cannot be "memory".');
      console.error('🛑 Server startup aborted. Please provide a valid MongoDB Atlas connection string.');
      process.exit(1);
    }
  } else {
    // 2. Development handling
    if (connectionUri === 'memory') {
      isMemory = true;
      console.log('⚡ [DEV] Explicit MONGODB_URI=memory specified. Using temporary in-memory database.');
    } else if (!connectionUri) {
      isMemory = true;
      console.warn('⚠️  [WARNING] MONGODB_URI is not set!');
      console.warn('⚠️  Running in temporary in-memory development storage. DATA WILL BE LOST ON RESTART.');
      console.warn('⚠️  To persist data, set MONGODB_URI in server/.env with your MongoDB Atlas connection string.');
    }
  }

  // 3. Boot in-memory server if explicitly chosen or missing in development
  if (isMemory) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      connectionUri = mongoMemoryServer.getUri();
    } catch (memErr: any) {
      console.error('❌ Failed to initialize in-memory MongoDB server:', memErr.message);
      process.exit(1);
    }
  } else {
    // Normalize URI: percent-encode any special characters in the password (e.g. @ signs)
    connectionUri = normalizeMongoUri(connectionUri);
    console.log(`🔗 Connecting to MongoDB at ${getMaskedUri(connectionUri)}...`);
  }

  // 4. Connect to MongoDB
  try {
    mongoose.set('strictQuery', true);
    // In production with standard mongodb:// URIs, enforce TLS/SSL connection
    const connectOptions: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 5000,
      ...(process.env.NODE_ENV === 'production' && !connectionUri.startsWith('mongodb+srv://')
        ? { tls: true }
        : {})
    };
    await mongoose.connect(connectionUri, connectOptions);

    const dbName = mongoose.connection.name || 'default';
    console.log('✓ MongoDB connected');
    console.log(`Database: ${dbName}`);
    if (isMemory) {
      console.log('Persistence: DISABLED (Temporary in-memory storage)');
    } else {
      console.log('Persistence: ENABLED');
    }
  } catch (err: any) {
    const safeErrorMsg = (err.message || '').replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb$1://****:****@');
    console.error('❌ Failed to connect to remote MongoDB:', safeErrorMsg);

    if (isProduction) {
      console.error('🛑 Production server startup aborted due to MongoDB connection failure.');
      process.exit(1);
    }

    // In development mode, provide automatic in-memory fallback so the local app can run
    console.warn('⚠️  [DEV FALLBACK] Remote MongoDB unreachable. Falling back to temporary in-memory database for local session...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const fallbackUri = mongoMemoryServer.getUri();
      await mongoose.connect(fallbackUri);
      console.log('✓ Temporary in-memory MongoDB connected successfully');
      console.log('Persistence: DISABLED (Temporary in-memory development storage)');
    } catch (fallbackErr: any) {
      console.error('❌ Fatal: In-memory MongoDB fallback also failed:', fallbackErr.message);
      process.exit(1);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

