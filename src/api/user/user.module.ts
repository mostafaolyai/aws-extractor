import { Module } from '@nestjs/common';

import { UserService } from './user.service';
import { UserController } from './user.controller';
import { GoogleAPIRequest } from './google-api-request';
@Module({
    imports: [
    ],
    providers: [UserService,GoogleAPIRequest],
    exports: [UserService],
    controllers: [UserController],
})
export class UserModule {}
