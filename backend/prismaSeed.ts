import prisma from './src/config/db';

const SUPERADMIN_EMAILS = [
  '202301131@dau.ac.in',
  '202301451@dau.ac.in',
];

export async function seedSuperAdmins() {
  console.log('--- Checking & Provisioning Designated Superadmins ---');
  for (const email of SUPERADMIN_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      if ((user as any).systemRole !== 'SUPERADMIN') {
        await prisma.user.update({
          where: { email },
          data: { systemRole: 'SUPERADMIN' as any },
        });
        console.log(`[Superadmin Assigned] Promoted existing account ${email} to SUPERADMIN.`);
      } else {
        console.log(`[Superadmin Active] Account ${email} is already SUPERADMIN.`);
      }
    } else {
      console.log(`[Superadmin Pending] Account ${email} has not registered yet. It will be assigned SUPERADMIN on first login/registration.`);
    }
  }
}

if (require.main === module) {
  seedSuperAdmins()
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
