import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as argon2 from 'argon2';
import { createDatabase } from '../apps/api/src/database.js';
import { passwordOptions } from '../apps/api/src/auth/security.js';

if (process.env.APP_ENV !== 'development' || !process.env.DATABASE_URL)
  throw new Error('Demo seed requires the local development environment.');
const address = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(address.hostname))
  throw new Error('Demo seed requires a loopback database.');
const database = createDatabase(process.env.DATABASE_URL);
const users = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    email: 'demo-president@example.test',
    displayName: 'Demo President',
    role: 'CLASS_ADMIN',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    email: 'demo-student-one@example.test',
    displayName: 'Demo Student One',
    role: 'MEMBER',
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    email: 'demo-student-two@example.test',
    displayName: 'Demo Student Two',
    role: 'MEMBER',
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    email: 'demo-staff@example.test',
    displayName: 'Demo Contributor',
    role: 'STAFF',
  },
] as const;
const credentialsFile = '.tools/demo-credentials.json';
const schoolId = '00000000-0000-4000-8000-000000000201';
const classId = '00000000-0000-4000-8000-000000000301';
try {
  let password: string;
  try {
    const saved: unknown = JSON.parse(await readFile(credentialsFile, 'utf8'));
    if (
      !saved ||
      typeof saved !== 'object' ||
      !('password' in saved) ||
      typeof saved.password !== 'string' ||
      saved.password.length < 32
    )
      throw new Error('Invalid demo credentials file.');
    password = saved.password;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
    if (
      await database.user.count({
        where: { id: { in: users.map((user) => user.id) } },
      })
    )
      throw new Error(
        'Existing demo users require their original credentials file; the seed never resets passwords.',
      );
    password = randomBytes(24).toString('base64url');
    await mkdir('.tools', { recursive: true });
    await writeFile(
      credentialsFile,
      JSON.stringify(
        {
          warning:
            'Development-only fictional accounts. Never use in production.',
          emails: users.map((user) => user.email),
          password,
        },
        null,
        2,
      ),
      { flag: 'wx', mode: 0o600 },
    );
  }
  const passwordHash = await argon2.hash(password, passwordOptions);
  await database.$transaction(async (tx) => {
    for (const user of users)
      await tx.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          locale: 'en',
        },
      });
    await tx.school.upsert({
      where: { id: schoolId },
      update: {},
      create: {
        id: schoolId,
        name: 'Fictional Demo School',
        slug: 'fictional-demo-school',
        admins: { create: { userId: users[0].id } },
      },
    });
    await tx.class.upsert({
      where: { id: classId },
      update: {},
      create: {
        id: classId,
        schoolId,
        name: 'Demo Class 2026',
        slug: 'demo-class-2026',
        graduationYear: 2026,
        motto: 'A chapter we share',
      },
    });
    for (const user of users) {
      const membership = await tx.classMembership.upsert({
        where: { classId_userId: { classId, userId: user.id } },
        update: {},
        create: { classId, userId: user.id, role: user.role },
      });
      await tx.profile.upsert({
        where: { membershipId: membership.id },
        update: {},
        create: {
          classId,
          membershipId: membership.id,
          displayName: user.displayName,
          visibility: 'CLASS',
          bio: 'A fictional profile for exploring the local development yearbook.',
          quote: 'A chapter we share. A story we keep.',
          activities: 'Reading, music, and class projects',
        },
      });
    }
    await tx.yearbook.upsert({
      where: { classId },
      update: {},
      create: {
        classId,
        title: 'A chapter we share',
        theme: 'PAPER',
        sections: {
          create: [
            {
              position: 0,
              type: 'MESSAGE',
              title: 'Before the next chapter',
              body: 'This is a fictional development edition. Replace these words with your class message as you explore the editor.',
            },
            {
              position: 1,
              type: 'MEMBERS',
              title: 'The people in our story',
              body: '',
            },
            {
              position: 2,
              type: 'STAFF',
              title: 'Those who helped us grow',
              body: '',
            },
            {
              position: 3,
              type: 'QUOTES',
              title: 'Words to take with us',
              body: '',
            },
          ],
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: users[0].id,
        schoolId,
        classId,
        targetId: classId,
        action: 'development.seed',
      },
    });
  });
  console.log(
    'Fictional demo school/class seeded. Development-only credentials are in .tools/demo-credentials.json; no passwords were printed.',
  );
} finally {
  await database.$disconnect();
}
