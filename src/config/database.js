const { PrismaClient } = require('@prisma/client');
const env = require('./environment');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: env.isDevelopment ? ['error', 'warn'] : ['error'],
});

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

const connectDatabase = async () => {
  try {
    await prisma.$connect();
    return true;
  } catch {
    return false;
  }
};

const disconnectDatabase = () => prisma.$disconnect();

module.exports = prisma;
module.exports.connectDatabase = connectDatabase;
module.exports.disconnectDatabase = disconnectDatabase;
