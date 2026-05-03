console.log('Seed.ts file execution is started........');

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function plainToHash(plainPass: string): Promise<string> {
  const hash = await bcrypt.hash(plainPass, 12);
  return hash;
}

async function compareHash(pass: string, hashPass: string): Promise<boolean> {
  return await bcrypt.compare(pass, hashPass);
}

async function main() {
  try {


//------------------------New feature wise Admin role 17 sep------------------------------
let adminEmail = 'imadmin@gmail.com';
let adminPassword = 'imadmin@15';

/*---------------- private user account creating----------------------------*/
const findIsAlreadyExitsAdminEmail = await prisma.user.findFirst({
    where: {
        OR: [
          {
            userName:"imadmin",
          },
          { email: adminEmail.toLowerCase() },
        ],
      },
});
if (!findIsAlreadyExitsAdminEmail) {
  await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      firstName: 'admin',
      lastName: 'admin',
      userName:"imadmin",
      initialProfileIcon:"https://res.cloudinary.com/dm0qa5xml/image/upload/v1725867538/uploads/nzpixfd436eabwztg4ha.png",
      is_Verified: true,
      password: await plainToHash(adminPassword),
      role: 'admin',
    },
  });
  console.log('Created admin profile');
}

//-----------------------------------------------------------------------------------------
    let privateEmail = 'private@gmail.com';
    let privatePassword = 'private@15';
    // let publicEmail = 'public@gmail.com';
    let publicEmail = 'support@prymr.xyz ';
    let publicPassword = 'public@15';
    /*---------------- private user account creating----------------------------*/
    const findIsAlreadyExitsEmail = await prisma.user.findFirst({
        where: {
            OR: [
              {
                userName:"private",
              },
              { email: privateEmail.toLowerCase() },
            ],
          },
    });
    if (!findIsAlreadyExitsEmail) {
      await prisma.user.create({
        data: {
          email: privateEmail.toLowerCase(),
          firstName: 'Ben',
          lastName: 'Ben',
          userName:"private",
          initialProfileIcon:"https://res.cloudinary.com/dm0qa5xml/image/upload/v1725867538/uploads/nzpixfd436eabwztg4ha.png",
          is_Verified: true,
          password: await plainToHash(privatePassword),
          role: "privateCreator",
        },
      });
      console.log('Created private profile');
    }

    /*------------------------------------------------------------------------*/

    const findIsAlreadyExitsPublicEmail = await prisma.user.findFirst({
        where: {
            OR: [
              {
                userName:"prymr",
              },
              { email: publicEmail.toLowerCase() },
            ],
          },
    });
    if (!findIsAlreadyExitsPublicEmail) {
      await prisma.user.create({
        data: {
          email: publicEmail.toLowerCase(),
          firstName: 'Erik',
          lastName: 'Erik',
          userName:"prymr",
          initialProfileIcon:"https://prymrstorage.s3.amazonaws.com/prymrFile_c837b7a4-f024-4662-892e-f2b8660afb6a.png",
          is_Verified: true,
          password: await plainToHash(publicPassword),
          role: 'publicCreator',
          isDefaultCreatorUser:true,
        },
      });
      console.log('Created public profile');
    }
  } catch (error) {
    console.log(error.toString());
  }
}
main();
console.log('Seed.ts file execution is done........');
